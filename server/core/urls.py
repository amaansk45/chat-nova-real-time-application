from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import (
    RegisterAPIView, LoginAPIView, Verify2FAAPIView,
    SendOTPAPIView, VerifyOTPAPIView, ForgotPasswordAPIView,
    ResetPasswordAPIView, LogoutAPIView, TwoFactorToggleAPIView,
    ActiveSessionsAPIView, RevokeSessionAPIView, DeleteAccountAPIView,
    AccountRecoveryAPIView, MeAPIView
)
from .social_views import (
    UserProfileView, AvatarUploadView, CoverImageUploadView,
    UserSearchAPIView, ContactListCreateAPIView, ContactDetailAPIView,
    ContactSyncAPIView, FriendSuggestionsAPIView,
    PersonalNoteListCreateAPIView, PersonalNoteDetailAPIView,
    PresenceHeartbeatAPIView
)
from .chat_views import (
    ConversationListCreateAPIView, ConversationDetailAPIView,
    MessageListCreateAPIView, MessageDetailAPIView,
    MessageReactionAPIView, MessageStarToggleAPIView,
    StarredMessagesListAPIView, MessagePinToggleAPIView,
    MessageForwardAPIView, ScheduledMessageListCreateAPIView,
    ScheduledMessageDetailAPIView, MessageDraftAPIView,
    SearchMessagesAPIView
)
from .media_views import (
    FileUploadAPIView, MediaGalleryAPIView,
    ShareLocationAPIView, ShareContactAPIView,
    FileDownloadAPIView
)
from .group_views import (
    CreateGroupAPIView, GroupDetailAPIView, GroupMembersAPIView,
    GroupMemberActionAPIView, GroupInviteLinkAPIView,
    JoinGroupViaInviteAPIView, GroupPermissionsAPIView,
    GroupPollListCreateAPIView, GroupPollVoteAPIView,
    GroupPollCloseAPIView
)

urlpatterns = [
    # Authentication & Security
    path('auth/register/', RegisterAPIView.as_view(), name='auth_register'),
    path('auth/login/', LoginAPIView.as_view(), name='auth_login'),
    path('auth/login/2fa/', Verify2FAAPIView.as_view(), name='auth_verify_2fa'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('auth/otp/send/', SendOTPAPIView.as_view(), name='auth_send_otp'),
    path('auth/otp/verify/', VerifyOTPAPIView.as_view(), name='auth_verify_otp'),
    path('auth/password/forgot/', ForgotPasswordAPIView.as_view(), name='auth_forgot_password'),
    path('auth/password/reset/', ResetPasswordAPIView.as_view(), name='auth_reset_password'),
    path('auth/logout/', LogoutAPIView.as_view(), name='auth_logout'),
    path('auth/2fa/toggle/', TwoFactorToggleAPIView.as_view(), name='auth_2fa_toggle'),
    path('auth/sessions/', ActiveSessionsAPIView.as_view(), name='auth_active_sessions'),
    path('auth/sessions/revoke/', RevokeSessionAPIView.as_view(), name='auth_revoke_session'),
    path('auth/account/delete/', DeleteAccountAPIView.as_view(), name='auth_delete_account'),
    path('auth/account/recover/', AccountRecoveryAPIView.as_view(), name='auth_recover_account'),
    path('auth/me/', MeAPIView.as_view(), name='auth_me'),

    # Profile & Social
    path('profile/', UserProfileView.as_view(), name='user_profile_me'),
    path('profile/<uuid:user_id>/', UserProfileView.as_view(), name='user_profile_detail'),
    path('profile/avatar/upload/', AvatarUploadView.as_view(), name='user_avatar_upload'),
    path('profile/cover/upload/', CoverImageUploadView.as_view(), name='user_cover_upload'),
    path('users/search/', UserSearchAPIView.as_view(), name='users_search'),
    path('contacts/', ContactListCreateAPIView.as_view(), name='contacts_list_create'),
    path('contacts/<uuid:contact_id>/', ContactDetailAPIView.as_view(), name='contact_detail'),
    path('contacts/sync/', ContactSyncAPIView.as_view(), name='contacts_sync'),
    path('friends/suggestions/', FriendSuggestionsAPIView.as_view(), name='friend_suggestions'),
    path('notes/', PersonalNoteListCreateAPIView.as_view(), name='personal_notes_list_create'),
    path('notes/<uuid:note_id>/', PersonalNoteDetailAPIView.as_view(), name='personal_note_detail'),
    path('presence/heartbeat/', PresenceHeartbeatAPIView.as_view(), name='presence_heartbeat'),

    # Real-Time Core Messaging & Conversations
    path('conversations/', ConversationListCreateAPIView.as_view(), name='conversations_list_create'),
    path('conversations/<uuid:conv_id>/', ConversationDetailAPIView.as_view(), name='conversation_detail'),
    path('conversations/<uuid:conv_id>/messages/', MessageListCreateAPIView.as_view(), name='messages_list_create'),
    path('conversations/<uuid:conv_id>/draft/', MessageDraftAPIView.as_view(), name='conversation_draft'),
    path('messages/<uuid:message_id>/', MessageDetailAPIView.as_view(), name='message_detail'),
    path('messages/<uuid:message_id>/reaction/', MessageReactionAPIView.as_view(), name='message_reaction'),
    path('messages/<uuid:message_id>/star/', MessageStarToggleAPIView.as_view(), name='message_star_toggle'),
    path('messages/<uuid:message_id>/pin/', MessagePinToggleAPIView.as_view(), name='message_pin_toggle'),
    path('messages/<uuid:message_id>/forward/', MessageForwardAPIView.as_view(), name='message_forward'),
    path('messages/starred/', StarredMessagesListAPIView.as_view(), name='starred_messages_list'),
    path('messages/scheduled/', ScheduledMessageListCreateAPIView.as_view(), name='scheduled_messages_list_create'),
    path('messages/scheduled/<uuid:schedule_id>/', ScheduledMessageDetailAPIView.as_view(), name='scheduled_message_detail'),
    path('messages/search/', SearchMessagesAPIView.as_view(), name='messages_search'),

    # Media, Files & Rich Sharing
    path('conversations/<uuid:conv_id>/upload/', FileUploadAPIView.as_view(), name='media_upload'),
    path('conversations/<uuid:conv_id>/gallery/', MediaGalleryAPIView.as_view(), name='media_gallery'),
    path('conversations/<uuid:conv_id>/share/location/', ShareLocationAPIView.as_view(), name='share_location'),
    path('conversations/<uuid:conv_id>/share/contact/', ShareContactAPIView.as_view(), name='share_contact'),
    path('attachments/<uuid:attachment_id>/download/', FileDownloadAPIView.as_view(), name='file_download'),

    # Group Conversations, Administration & Polls
    path('groups/create/', CreateGroupAPIView.as_view(), name='group_create'),
    path('groups/<uuid:group_id>/', GroupDetailAPIView.as_view(), name='group_detail'),
    path('groups/<uuid:group_id>/members/', GroupMembersAPIView.as_view(), name='group_members'),
    path('groups/<uuid:group_id>/members/action/', GroupMemberActionAPIView.as_view(), name='group_member_action'),
    path('groups/<uuid:group_id>/invite/', GroupInviteLinkAPIView.as_view(), name='group_invite_link'),
    path('groups/join/<str:token>/', JoinGroupViaInviteAPIView.as_view(), name='group_join_via_invite'),
    path('groups/<uuid:group_id>/permissions/', GroupPermissionsAPIView.as_view(), name='group_permissions'),
    path('conversations/<uuid:conv_id>/polls/', GroupPollListCreateAPIView.as_view(), name='group_polls_list_create'),
    path('polls/<uuid:poll_id>/vote/', GroupPollVoteAPIView.as_view(), name='group_poll_vote'),
    path('polls/<uuid:poll_id>/close/', GroupPollCloseAPIView.as_view(), name='group_poll_close'),
]
