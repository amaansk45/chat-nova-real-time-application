import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import (
    User, Conversation, ConversationMember, Group,
    GroupAdmin, GroupPoll, GroupPollOption, GroupPollVote, Message
)
from .group_serializers import (
    CreateGroupSerializer, GroupDetailsSerializer,
    GroupPermissionsSerializer, GroupPollSerializer,
    CreateGroupPollSerializer, GroupMemberItemSerializer
)
from .chat_serializers import MessageSerializer

channel_layer = get_channel_layer()

class CreateGroupAPIView(APIView):
    """Create a new group conversation with members and default admin permissions."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateGroupSerializer(data=request.data)
        if serializer.is_valid():
            title = serializer.validated_data['title'].strip()
            description = serializer.validated_data.get('description', '').strip()
            member_ids = serializer.validated_data.get('member_ids', [])

            conv = Conversation.objects.create(
                type='group',
                title=title,
                description=description,
                created_by=request.user
            )

            # Create group details & invite link
            invite_token = secrets.token_urlsafe(16)
            grp = Group.objects.create(
                conversation=conv,
                invite_link_token=invite_token,
                only_admins_can_edit_info=True,
            )

            # Add creator as owner
            ConversationMember.objects.create(
                conversation=conv,
                user=request.user,
                role='owner'
            )
            GroupAdmin.objects.create(
                group=grp,
                user=request.user,
                role='owner',
                can_manage_admins=True
            )

            # Add members
            for m_id in member_ids:
                if str(m_id) != str(request.user.id):
                    target_user = User.objects.filter(id=m_id).first()
                    if target_user:
                        ConversationMember.objects.get_or_create(
                            conversation=conv,
                            user=target_user,
                            defaults={'role': 'member'}
                        )

            # Create system notification message in chat
            Message.objects.create(
                conversation=conv,
                sender=None,
                message_type='system',
                content=f"{request.user.username} created group '{title}'"
            )

            return Response(GroupDetailsSerializer(conv, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupDetailAPIView(APIView):
    """Retrieve group details or update group profile and avatar."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(GroupDetailsSerializer(conv, context={'request': request}).data)

    def patch(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        member = ConversationMember.objects.filter(conversation=conv, user=request.user).first()
        grp = getattr(conv, 'group_details', None)

        if grp and grp.only_admins_can_edit_info and member.role not in ['owner', 'admin']:
            return Response({'detail': 'Only group admins can modify group information.'}, status=status.HTTP_403_FORBIDDEN)

        if 'title' in request.data:
            conv.title = request.data['title']
        if 'description' in request.data:
            conv.description = request.data['description']
        if 'avatar' in request.FILES:
            conv.avatar = request.FILES['avatar']

        conv.save()
        return Response(GroupDetailsSerializer(conv, context={'request': request}).data)


class GroupMembersAPIView(APIView):
    """List members or add new members to group."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        members = conv.members.select_related('user', 'user__profile')
        return Response(GroupMemberItemSerializer(members, many=True).data)

    def post(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        grp = getattr(conv, 'group_details', None)
        member = conv.members.filter(user=request.user).first()

        if grp and grp.only_admins_can_invite and member.role not in ['owner', 'admin']:
            return Response({'detail': 'Only admins can add members to this group.'}, status=status.HTTP_403_FORBIDDEN)

        user_ids = request.data.get('user_ids', [])
        added_count = 0
        for uid in user_ids:
            target_user = User.objects.filter(id=uid).first()
            if target_user:
                _, created = ConversationMember.objects.get_or_create(
                    conversation=conv,
                    user=target_user,
                    defaults={'role': 'member'}
                )
                if created:
                    added_count += 1
                    Message.objects.create(
                        conversation=conv,
                        sender=None,
                        message_type='system',
                        content=f"{request.user.username} added {target_user.username}"
                    )

        return Response({'message': f'{added_count} members added successfully.'})


class GroupMemberActionAPIView(APIView):
    """Change member role (admin/moderator/member) or remove member from group."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        my_role = conv.members.filter(user=request.user).values_list('role', flat=True).first()
        if my_role not in ['owner', 'admin']:
            return Response({'detail': 'Only group owners or admins can perform member actions.'}, status=status.HTTP_403_FORBIDDEN)

        target_user_id = request.data.get('user_id')
        action = request.data.get('action') # 'make_admin', 'make_moderator', 'demote_member', 'remove'

        target_membership = conv.members.filter(user_id=target_user_id).first()
        if not target_membership:
            return Response({'detail': 'Target user is not a member of this group.'}, status=status.HTTP_404_NOT_FOUND)

        if target_membership.role == 'owner':
            return Response({'detail': 'Cannot modify the group owner.'}, status=status.HTTP_400_BAD_REQUEST)

        grp = conv.group_details
        if action == 'make_admin':
            target_membership.role = 'admin'
            target_membership.save(update_fields=['role'])
            GroupAdmin.objects.get_or_create(group=grp, user=target_membership.user, defaults={'role': 'admin'})
            msg = f"{request.user.username} made {target_membership.user.username} an admin."
        elif action == 'make_moderator':
            target_membership.role = 'moderator'
            target_membership.save(update_fields=['role'])
            msg = f"{request.user.username} made {target_membership.user.username} a moderator."
        elif action == 'demote_member':
            target_membership.role = 'member'
            target_membership.save(update_fields=['role'])
            GroupAdmin.objects.filter(group=grp, user=target_membership.user).delete()
            msg = f"{request.user.username} demoted {target_membership.user.username} to member."
        elif action == 'remove':
            target_membership.delete()
            GroupAdmin.objects.filter(group=grp, user_id=target_user_id).delete()
            msg = f"{request.user.username} removed {target_membership.user.username} from group."
        else:
            return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        Message.objects.create(conversation=conv, sender=None, message_type='system', content=msg)
        return Response({'message': msg, 'current_role': getattr(target_membership, 'role', 'removed')})


class GroupMemberPromoteAPIView(APIView):
    """Promote a group member to admin."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id, member_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        my_role = conv.members.filter(user=request.user).values_list('role', flat=True).first()
        if my_role not in ['owner', 'admin']:
            return Response({'detail': 'Only group admins can promote members.'}, status=status.HTTP_403_FORBIDDEN)
        target = conv.members.filter(id=member_id).first() or conv.members.filter(user_id=member_id).first()
        if not target:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        target.role = 'admin'
        target.save(update_fields=['role'])
        if hasattr(conv, 'group_details'):
            GroupAdmin.objects.get_or_create(group=conv.group_details, user=target.user, defaults={'role': 'admin'})
        return Response({'message': f'{target.user.username} promoted to admin.', 'role': 'admin'})


class GroupMemberDemoteAPIView(APIView):
    """Demote a group admin to regular member."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id, member_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        my_role = conv.members.filter(user=request.user).values_list('role', flat=True).first()
        if my_role not in ['owner', 'admin']:
            return Response({'detail': 'Only group admins can demote members.'}, status=status.HTTP_403_FORBIDDEN)
        target = conv.members.filter(id=member_id).first() or conv.members.filter(user_id=member_id).first()
        if not target:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target.role == 'owner':
            return Response({'detail': 'Cannot demote the group owner.'}, status=status.HTTP_400_BAD_REQUEST)
        target.role = 'member'
        target.save(update_fields=['role'])
        if hasattr(conv, 'group_details'):
            GroupAdmin.objects.filter(group=conv.group_details, user=target.user).delete()
        return Response({'message': f'{target.user.username} demoted to member.', 'role': 'member'})


class GroupMemberDeleteAPIView(APIView):
    """Remove a member from the group."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, group_id, member_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        my_role = conv.members.filter(user=request.user).values_list('role', flat=True).first()
        if my_role not in ['owner', 'admin']:
            return Response({'detail': 'Only group admins can remove members.'}, status=status.HTTP_403_FORBIDDEN)
        target = conv.members.filter(id=member_id).first() or conv.members.filter(user_id=member_id).first()
        if not target:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target.role == 'owner':
            return Response({'detail': 'Cannot remove the group owner.'}, status=status.HTTP_400_BAD_REQUEST)
        u_id = target.user_id
        target.delete()
        if hasattr(conv, 'group_details'):
            GroupAdmin.objects.filter(group=conv.group_details, user_id=u_id).delete()
        return Response({'message': 'Member removed successfully.'})


class GroupLeaveAPIView(APIView):
    """Leave a group conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        ConversationMember.objects.filter(conversation=conv, user=request.user).delete()
        if hasattr(conv, 'group_details'):
            GroupAdmin.objects.filter(group=conv.group_details, user=request.user).delete()
        if conv.members.count() == 0:
            conv.delete()
        return Response({'message': 'You have left the group.'})


class GroupInviteLinkAPIView(APIView):
    """Retrieve or reset group invitation link."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv or not hasattr(conv, 'group_details'):
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        grp = conv.group_details
        if not grp.invite_link_token:
            grp.invite_link_token = secrets.token_urlsafe(16)
            grp.save(update_fields=['invite_link_token'])

        return Response({
            'invite_token': grp.invite_link_token,
            'invite_url': f"/join/{grp.invite_link_token}"
        })

    def post(self, request, group_id):
        """Regenerate new invite token (revokes old link)."""
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        my_role = conv.members.filter(user=request.user).values_list('role', flat=True).first()
        if my_role not in ['owner', 'admin']:
            return Response({'detail': 'Only admins can reset invite links.'}, status=status.HTTP_403_FORBIDDEN)

        grp = conv.group_details
        grp.invite_link_token = secrets.token_urlsafe(16)
        grp.save(update_fields=['invite_link_token'])

        return Response({
            'message': 'Invite link reset successfully.',
            'invite_token': grp.invite_link_token,
            'invite_url': f"/join/{grp.invite_link_token}"
        })


class JoinGroupViaInviteAPIView(APIView):
    """Join a group using an invitation link token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        grp = Group.objects.filter(invite_link_token=token).select_related('conversation').first()
        if not grp:
            return Response({'detail': 'Invalid or expired invitation link.'}, status=status.HTTP_404_NOT_FOUND)

        conv = grp.conversation
        member, created = ConversationMember.objects.get_or_create(
            conversation=conv,
            user=request.user,
            defaults={'role': 'member'}
        )

        if created:
            Message.objects.create(
                conversation=conv,
                sender=None,
                message_type='system',
                content=f"{request.user.username} joined via group invite link"
            )

        return Response({
            'message': 'Joined group successfully.',
            'group': GroupDetailsSerializer(conv, context={'request': request}).data
        })


class GroupPermissionsAPIView(APIView):
    """Update group announcement and admin permissions."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type='group', members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

        my_role = conv.members.filter(user=request.user).values_list('role', flat=True).first()
        if my_role not in ['owner', 'admin']:
            return Response({'detail': 'Only admins can update group permissions.'}, status=status.HTTP_403_FORBIDDEN)

        grp = conv.group_details
        serializer = GroupPermissionsSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            if 'is_announcement_only' in serializer.validated_data:
                grp.is_announcement_only = serializer.validated_data['is_announcement_only']
            if 'only_admins_can_edit_info' in serializer.validated_data:
                grp.only_admins_can_edit_info = serializer.validated_data['only_admins_can_edit_info']
            if 'only_admins_can_invite' in serializer.validated_data:
                grp.only_admins_can_invite = serializer.validated_data['only_admins_can_invite']
            grp.save()

            return Response({
                'is_announcement_only': grp.is_announcement_only,
                'only_admins_can_edit_info': grp.only_admins_can_edit_info,
                'only_admins_can_invite': grp.only_admins_can_invite,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupPollListCreateAPIView(APIView):
    """List polls in a conversation or create an interactive group poll."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conv_id):
        polls = GroupPoll.objects.filter(conversation_id=conv_id, conversation__members__user=request.user).order_by('-created_at')
        return Response(GroupPollSerializer(polls, many=True, context={'request': request}).data)

    def post(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateGroupPollSerializer(data=request.data)
        if serializer.is_valid():
            question = serializer.validated_data['question']
            option_texts = serializer.validated_data['options']
            is_multiple_choice = serializer.validated_data.get('is_multiple_choice', False)

            poll = GroupPoll.objects.create(
                conversation=conv,
                creator=request.user,
                question=question,
                is_multiple_choice=is_multiple_choice
            )

            for opt_text in option_texts:
                GroupPollOption.objects.create(poll=poll, text=opt_text)

            # Post as a poll message into conversation
            msg = Message.objects.create(
                conversation=conv,
                sender=request.user,
                content=f"📊 Poll: {question}",
                message_type='poll',
                metadata={'poll_id': str(poll.id)}
            )

            # Broadcast via Channels layer
            try:
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"chat_{conv.id}",
                        {
                            'type': 'broadcast_message_event',
                            'message': MessageSerializer(msg, context={'request': request}).data
                        }
                    )
            except Exception:
                pass

            return Response(GroupPollSerializer(poll, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupPollVoteAPIView(APIView):
    """Cast or retract a vote on a poll option."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, poll_id):
        poll = GroupPoll.objects.filter(id=poll_id, conversation__members__user=request.user).first()
        if not poll:
            return Response({'detail': 'Poll not found.'}, status=status.HTTP_404_NOT_FOUND)

        if poll.is_closed:
            return Response({'detail': 'This poll has ended.'}, status=status.HTTP_400_BAD_REQUEST)

        option_id = request.data.get('option_id')
        option = GroupPollOption.objects.filter(id=option_id, poll=poll).first()
        if not option:
            return Response({'detail': 'Invalid option.'}, status=status.HTTP_400_BAD_REQUEST)

        # Single choice check: remove other votes by this user
        if not poll.is_multiple_choice:
            GroupPollVote.objects.filter(option__poll=poll, user=request.user).delete()

        vote, created = GroupPollVote.objects.get_or_create(option=option, user=request.user)
        if not created and poll.is_multiple_choice:
            # Toggle off if already voted
            vote.delete()
            return Response({'action': 'vote_retracted', 'poll': GroupPollSerializer(poll, context={'request': request}).data})

        return Response({'action': 'vote_cast', 'poll': GroupPollSerializer(poll, context={'request': request}).data})


class GroupPollCloseAPIView(APIView):
    """Close poll to prevent further votes."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, poll_id):
        poll = GroupPoll.objects.filter(id=poll_id, conversation__members__user=request.user).first()
        if not poll:
            return Response({'detail': 'Poll not found.'}, status=status.HTTP_404_NOT_FOUND)

        if poll.creator != request.user and not request.user.is_staff:
            return Response({'detail': 'Only poll creator can close the poll.'}, status=status.HTTP_403_FORBIDDEN)

        poll.is_closed = True
        poll.save(update_fields=['is_closed'])
        return Response(GroupPollSerializer(poll, context={'request': request}).data)
