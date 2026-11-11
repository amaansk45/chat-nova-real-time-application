import os
import shutil
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q, Count
from django.db import connection
from django.utils import timezone
from .models import (
    User, Conversation, Message, Call, Report, Attachment
)
from .admin_serializers import (
    AdminOverviewStatsSerializer, AdminUserListSerializer,
    AdminUserActionSerializer, AdminGroupListSerializer,
    AdminReportItemSerializer, AdminResolveReportSerializer
)

class IsAdminUserOrStaff(permissions.BasePermission):
    """Allows access to staff, superusers, or admin accounts."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))


class AdminOverviewAPIView(APIView):
    """Provide platform-wide telemetry, user metrics, and activity counters."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = total_users - active_users

        total_messages = Message.objects.count()
        total_conversations = Conversation.objects.count()
        total_calls = Call.objects.count()
        pending_reports = Report.objects.filter(status='pending').count()
        storage_attachments_count = Attachment.objects.count()

        # Activity summary
        recent_signups = User.objects.filter(created_at__gte=now - timezone.timedelta(days=7)).count()
        recent_messages = Message.objects.filter(created_at__gte=now - timezone.timedelta(days=7)).count()

        data = {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'total_messages': total_messages,
            'total_conversations': total_conversations,
            'total_calls': total_calls,
            'pending_reports': pending_reports,
            'storage_attachments_count': storage_attachments_count,
            'weekly_trends': {
                'signups': recent_signups,
                'messages': recent_messages,
            }
        }
        return Response(data)


class AdminUserListAPIView(APIView):
    """List, filter, and search user accounts."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        filter_status = request.query_params.get('filter', 'all') # 'all', 'active', 'suspended', 'staff'

        users = User.objects.all().select_related('profile').order_by('-created_at')

        if filter_status == 'active':
            users = users.filter(is_active=True)
        elif filter_status == 'suspended':
            users = users.filter(is_active=False)
        elif filter_status == 'staff':
            users = users.filter(is_staff=True)

        if query:
            users = users.filter(
                Q(username__icontains=query) |
                Q(email__icontains=query) |
                Q(phone_number__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )

        serializer = AdminUserListSerializer(users[:50], many=True)
        return Response(serializer.data)


class AdminUserActionAPIView(APIView):
    """Perform moderation action: suspend, activate, verify, make_staff."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminUserActionSerializer(data=request.data)
        if serializer.is_valid():
            action = serializer.validated_data['action']
            if action == 'suspend':
                user.is_active = False
                user.save(update_fields=['is_active'])
                msg = f"User {user.username} suspended."
            elif action == 'activate':
                user.is_active = True
                user.save(update_fields=['is_active'])
                msg = f"User {user.username} reactivated."
            elif action == 'verify':
                user.is_verified = True
                user.save(update_fields=['is_verified'])
                msg = f"User {user.username} verified."
            elif action == 'make_staff':
                user.is_staff = True
                user.save(update_fields=['is_staff'])
                msg = f"User {user.username} granted staff privileges."
            elif action == 'remove_staff':
                user.is_staff = False
                user.save(update_fields=['is_staff'])
                msg = f"User {user.username} staff privileges revoked."

            return Response({'message': msg, 'user': AdminUserListSerializer(user).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminGroupListAPIView(APIView):
    """List groups with member counts and activity metrics."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        groups = Conversation.objects.filter(type__in=['group', 'channel']).select_related('created_by').order_by('-created_at')

        if query:
            groups = groups.filter(Q(title__icontains=query) | Q(description__icontains=query))

        serializer = AdminGroupListSerializer(groups[:50], many=True)
        return Response(serializer.data)


class AdminGroupDeleteAPIView(APIView):
    """Delete a group conversation for content moderation."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, group_id):
        conv = Conversation.objects.filter(id=group_id, type__in=['group', 'channel']).first()
        if not conv:
            return Response({'detail': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
        title = conv.title
        conv.delete()
        return Response({'message': f"Group '{title}' deleted by administrator."})


class AdminReportListAPIView(APIView):
    """List submitted moderation reports."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status', 'all')
        reports = Report.objects.all().select_related('reporter', 'reported_user', 'reported_message').order_by('-created_at')

        if status_filter != 'all':
            reports = reports.filter(status=status_filter)

        serializer = AdminReportItemSerializer(reports[:50], many=True)
        return Response(serializer.data)


class AdminResolveReportAPIView(APIView):
    """Resolve report and optionally suspend user or delete offending message."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        report = Report.objects.filter(id=report_id).first()
        if not report:
            return Response({'detail': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminResolveReportSerializer(data=request.data)
        if serializer.is_valid():
            report.status = serializer.validated_data['status']
            report.admin_notes = serializer.validated_data.get('admin_notes', '')
            report.save(update_fields=['status', 'admin_notes'])

            if serializer.validated_data.get('suspend_user') and report.reported_user:
                report.reported_user.is_active = False
                report.reported_user.save(update_fields=['is_active'])

            if serializer.validated_data.get('delete_message') and report.reported_message:
                report.reported_message.is_deleted_for_everyone = True
                report.reported_message.content = "[Message removed by moderator]"
                report.reported_message.save(update_fields=['is_deleted_for_everyone', 'content'])

            return Response({'message': 'Report resolution recorded.', 'status': report.status})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminServerHealthAPIView(APIView):
    """Check database connection, memory, storage, and platform status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Database check
        db_status = 'connected'
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
                if not row or row[0] != 1:
                    db_status = 'error'
        except Exception as e:
            db_status = f'unhealthy: {e}'

        # Disk space check
        total_gb, used_gb, free_gb = 0, 0, 0
        try:
            total, used, free = shutil.disk_usage("/")
            total_gb = round(total / (1024 ** 3), 1)
            used_gb = round(used / (1024 ** 3), 1)
            free_gb = round(free / (1024 ** 3), 1)
        except Exception:
            pass

        return Response({
            'status': 'healthy' if db_status == 'connected' else 'degraded',
            'database': {
                'status': db_status,
                'engine': connection.vendor,
            },
            'disk': {
                'total_gb': total_gb,
                'used_gb': used_gb,
                'free_gb': free_gb,
            },
            'environment': 'development' if os.getenv('DEBUG') == 'True' else 'production',
            'timestamp': timezone.now().isoformat(),
        })


# Application Settings Store in Memory/Cache
PLATFORM_SETTINGS = {
    'allow_new_registrations': True,
    'maintenance_mode': False,
    'max_upload_size_mb': 50,
    'e2ee_enforced': False,
    'max_group_members': 500,
}

class AdminAppSettingsAPIView(APIView):
    """Get and update platform configuration parameters."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(PLATFORM_SETTINGS)

    def patch(self, request):
        for k, v in request.data.items():
            if k in PLATFORM_SETTINGS:
                PLATFORM_SETTINGS[k] = v
        return Response(PLATFORM_SETTINGS)
