from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q
from django.utils import timezone
from .models import User, UserProfile, Contact, ContactSync, PersonalNote, BlockedUser
from .social_serializers import (
    UserProfileSerializer, ContactSerializer, ContactUserSerializer,
    AddContactByIdentifierSerializer, ContactSyncSerializer,
    PersonalNoteSerializer, UserSearchSerializer
)
from .chat_views import find_recipient

class UserProfileView(APIView):
    """Retrieve or update profile and privacy preferences."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id=None):
        if user_id:
            user = User.objects.filter(id=user_id).first()
            if not user:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            profile, _ = UserProfile.objects.get_or_create(user=user)
        else:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AvatarUploadView(APIView):
    """Upload user profile photo."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response({'detail': 'No avatar file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        avatar_file = request.FILES['avatar']
        # Validate size (< 10MB)
        if avatar_file.size > 10 * 1024 * 1024:
            return Response({'detail': 'Avatar file exceeds 10MB limit.'}, status=status.HTTP_400_BAD_REQUEST)
            
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.avatar = avatar_file
        profile.save(update_fields=['avatar', 'updated_at'])
        
        return Response({
            'message': 'Avatar updated successfully.',
            'avatar_url': profile.avatar.url
        }, status=status.HTTP_200_OK)


class CoverImageUploadView(APIView):
    """Upload user profile cover/banner image."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if 'cover_image' not in request.FILES:
            return Response({'detail': 'No cover_image file provided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        cover_file = request.FILES['cover_image']
        if cover_file.size > 15 * 1024 * 1024:
            return Response({'detail': 'Cover image exceeds 15MB limit.'}, status=status.HTTP_400_BAD_REQUEST)
            
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.cover_image = cover_file
        profile.save(update_fields=['cover_image', 'updated_at'])
        
        return Response({
            'message': 'Cover image updated successfully.',
            'cover_url': profile.cover_image.url
        }, status=status.HTTP_200_OK)


class UserSearchAPIView(APIView):
    """Search for users by username, email, phone or name."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])
            
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(phone_number__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=request.user.id)[:20]
        
        serializer = UserSearchSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)


class ContactListCreateAPIView(APIView):
    """List all contacts or add a contact by identifier/ID."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        contacts = Contact.objects.filter(user=request.user).select_related('contact', 'contact__profile')
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Support either contact_id or identifier (username/email/phone)
        contact_id = request.data.get('contact_id')
        identifier = request.data.get('identifier') or request.data.get('username') or request.data.get('email')
        nickname = request.data.get('nickname', '').strip()
        
        target_user = None
        if contact_id:
            target_user = User.objects.filter(id=contact_id).first()
        elif identifier:
            target_user = find_recipient(identifier, request.user)
            
        if not target_user:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        if target_user.id == request.user.id:
            return Response({'detail': 'You cannot add yourself as a contact.'}, status=status.HTTP_400_BAD_REQUEST)
            
        contact_entry, created = Contact.objects.get_or_create(
            user=request.user,
            contact=target_user,
            defaults={'nickname': nickname or target_user.username}
        )
        
        if not created and nickname:
            contact_entry.nickname = nickname
            contact_entry.save(update_fields=['nickname'])
            
        return Response(ContactSerializer(contact_entry).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ContactDetailAPIView(APIView):
    """Update contact details (nickname, favorite) or delete contact."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, contact_id):
        contact_entry = Contact.objects.filter(user=request.user, contact_id=contact_id).first()
        if not contact_entry:
            return Response({'detail': 'Contact not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        if 'nickname' in request.data:
            contact_entry.nickname = request.data['nickname']
        if 'is_favorite' in request.data:
            contact_entry.is_favorite = request.data['is_favorite']
        if 'is_blocked' in request.data:
            contact_entry.is_blocked = request.data['is_blocked']
            if contact_entry.is_blocked:
                BlockedUser.objects.get_or_create(blocker=request.user, blocked=contact_entry.contact)
            else:
                BlockedUser.objects.filter(blocker=request.user, blocked=contact_entry.contact).delete()
                
        contact_entry.save()
        return Response(ContactSerializer(contact_entry).data)

    def delete(self, request, contact_id):
        deleted, _ = Contact.objects.filter(user=request.user, contact_id=contact_id).delete()
        if deleted:
            return Response({'message': 'Contact removed successfully.'}, status=status.HTTP_200_OK)
        return Response({'detail': 'Contact not found.'}, status=status.HTTP_404_NOT_FOUND)


class ContactSyncAPIView(APIView):
    """Batch synchronize hashed address book and match with ChatNova users."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ContactSyncSerializer(data=request.data)
        if serializer.is_valid():
            contact_list = serializer.validated_data['contacts']
            hashes = [item.get('phone_hash') for item in contact_list if item.get('phone_hash')]
            
            # Record synced items
            for item in contact_list:
                h = item.get('phone_hash')
                name = item.get('name', 'Unknown')
                if h:
                    ContactSync.objects.update_or_create(
                        user=request.user,
                        phone_hash=h,
                        defaults={'contact_name': name}
                    )
            
            # Match registered users
            matched_users = User.objects.filter(
                id__in=ContactSync.objects.filter(user=request.user).values_list('user_id', flat=True)
            ).exclude(id=request.user.id)
            
            return Response({
                'synced_count': len(contact_list),
                'matches': ContactUserSerializer(matched_users, many=True).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FriendSuggestionsAPIView(APIView):
    """Recommend platform users to connect with."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        existing_contacts = Contact.objects.filter(user=request.user).values_list('contact_id', flat=True)
        suggestions = User.objects.exclude(id=request.user.id).exclude(id__in=existing_contacts).filter(is_active=True)[:10]
        return Response(ContactUserSerializer(suggestions, many=True).data)


class PersonalNoteListCreateAPIView(APIView):
    """List user personal notes or create a new note."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notes = PersonalNote.objects.filter(user=request.user)
        return Response(PersonalNoteSerializer(notes, many=True).data)

    def post(self, request):
        serializer = PersonalNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PersonalNoteDetailAPIView(APIView):
    """Retrieve, update, toggle pin, or delete a personal note."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, note_id):
        note = PersonalNote.objects.filter(user=request.user, id=note_id).first()
        if not note:
            return Response({'detail': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PersonalNoteSerializer(note).data)

    def patch(self, request, note_id):
        note = PersonalNote.objects.filter(user=request.user, id=note_id).first()
        if not note:
            return Response({'detail': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PersonalNoteSerializer(note, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, note_id):
        deleted, _ = PersonalNote.objects.filter(user=request.user, id=note_id).delete()
        if deleted:
            return Response({'message': 'Note deleted successfully.'})
        return Response({'detail': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)


class PresenceHeartbeatAPIView(APIView):
    """Client heartbeat to refresh active presence state."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        is_online = request.data.get('is_online', True)
        user = request.user
        user.is_online = is_online
        user.last_seen = timezone.now()
        user.save(update_fields=['is_online', 'last_seen'])
        return Response({'status': 'ok', 'is_online': user.is_online, 'last_seen': user.last_seen})
