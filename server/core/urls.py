from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import (
    RegisterAPIView, LoginAPIView, Verify2FAAPIView,
    SendOTPAPIView, VerifyOTPAPIView, ForgotPasswordAPIView,
    ResetPasswordAPIView, LogoutAPIView, TwoFactorToggleAPIView,
    ActiveSessionsAPIView, RevokeSessionAPIView, DeleteAccountAPIView,
    AccountRecoveryAPIView, MeAPIView, ChangePasswordAPIView
)
from .social_views import (
    UserProfileView, AvatarUploadView, CoverImageUploadView,
    UserSearchAPIView, ContactListCreateAPIView, ContactDetailAPIView,
    ContactSyncAPIView, FriendSuggestionsAPIView,
    PersonalNoteListCreateAPIView, PersonalNoteDetailAPIView,
    PresenceHeartbeatAPIView
)
from .chat_views import (
    ConversationListCreateAPIView, DirectConversationAPIView,
    ConversationDetailAPIView, ConversationMuteToggleAPIView,
    ConversationPinToggleAPIView, ConversationArchiveToggleAPIView,
    ConversationClearAPIView, MessageListCreateAPIView, MessageDetailAPIView,
    MessageReactionAPIView, MessageStarToggleAPIView,
    StarredMessagesListAPIView, MessagePinToggleAPIView,
    MessageForwardAPIView, ScheduledMessageListCreateAPIView,
    ScheduledMessageDetailAPIView, MessageDraftAPIView,
    SearchMessagesAPIView, MessageDeleteForEveryoneAPIView
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
    GroupPollCloseAPIView, GroupMemberPromoteAPIView,
    GroupMemberDemoteAPIView, GroupMemberDeleteAPIView,
    GroupLeaveAPIView
)
from .status_views import (
    StatusFeedAPIView, CreateStatusAPIView, StatusDetailAPIView,
    RecordStatusViewAPIView, StatusReactionAPIView, ReplyToStatusAPIView
)
from .call_views import (
    InitiateCallAPIView, CallActionAPIView, CallHistoryAPIView,
    CallICEConfigAPIView
)
from .ai_views import (
    AIChatAssistantAPIView, AISmartRepliesAPIView, AISummarizeAPIView,
    AITranslateAPIView, AIWritingAssistantAPIView, AIVoiceTranscriptionAPIView,
    AIConversationInsightsAPIView
)
from .security_views import (
    RegisterEncryptionKeysAPIView, UserKeyBundleAPIView,
    BlockedUsersListAPIView, UnblockUserAPIView,
    SubmitReportAPIView, DisappearingMessagesConfigAPIView,
    PurgeExpiredDisappearingMessagesAPIView
)
from .admin_views import (
    AdminOverviewAPIView, AdminUserListAPIView, AdminUserActionAPIView,
    AdminGroupListAPIView, AdminGroupDeleteAPIView, AdminReportListAPIView,
    AdminResolveReportAPIView, AdminServerHealthAPIView, AdminAppSettingsAPIView
)

urlpatterns = [
    # Authentication & Security
    path('auth/register/', RegisterAPIView.as_view(), name='auth_register'),
    path('auth/login/', LoginAPIView.as_view(), name='auth_login'),
    path('auth/login/2fa/', Verify2FAAPIView.as_view(), name='auth_verify_2fa'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('auth/otp/send/', SendOTPAPIView.as_view(), name='auth_send_otp'),
    path('auth/otp/verify/', VerifyOTPAPIView.as_view(), name='auth_verify_otp'),
    path('auth/verify-otp/', VerifyOTPAPIView.as_view(), name='auth_verify_otp_dash'),
    path('auth/resend-otp/', SendOTPAPIView.as_view(), name='auth_resend_otp_dash'),
    path('auth/password/forgot/', ForgotPasswordAPIView.as_view(), name='auth_forgot_password'),
    path('auth/password/reset/', ResetPasswordAPIView.as_view(), name='auth_reset_password'),
    path('auth/forgot-password/', ForgotPasswordAPIView.as_view(), name='auth_forgot_password_dash'),
    path('auth/reset-password/', ResetPasswordAPIView.as_view(), name='auth_reset_password_dash'),
    path('auth/change-password/', ChangePasswordAPIView.as_view(), name='auth_change_password'),
    path('auth/logout/', LogoutAPIView.as_view(), name='auth_logout'),
    path('auth/2fa/toggle/', TwoFactorToggleAPIView.as_view(), name='auth_2fa_toggle'),
    path('auth/sessions/', ActiveSessionsAPIView.as_view(), name='auth_active_sessions'),
    path('auth/sessions/revoke/', RevokeSessionAPIView.as_view(), name='auth_revoke_session'),
    path('auth/sessions/<uuid:session_id>/revoke/', RevokeSessionAPIView.as_view(), name='auth_revoke_session_uuid'),
    path('auth/sessions/<str:session_id>/revoke/', RevokeSessionAPIView.as_view(), name='auth_revoke_session_str'),
    path('auth/account/delete/', DeleteAccountAPIView.as_view(), name='auth_delete_account'),
    path('auth/account/recover/', AccountRecoveryAPIView.as_view(), name='auth_recover_account'),
    path('auth/me/', MeAPIView.as_view(), name='auth_me'),

    # Profile & Social
    path('profile/', UserProfileView.as_view(), name='user_profile_me'),
    path('social/profile/', UserProfileView.as_view(), name='social_user_profile_me'),
    path('profile/<uuid:user_id>/', UserProfileView.as_view(), name='user_profile_detail'),
    path('social/profile/<uuid:user_id>/', UserProfileView.as_view(), name='social_user_profile_detail'),
    path('profile/avatar/upload/', AvatarUploadView.as_view(), name='user_avatar_upload'),
    path('profile/cover/upload/', CoverImageUploadView.as_view(), name='user_cover_upload'),
    path('users/search/', UserSearchAPIView.as_view(), name='users_search'),
    path('social/users/search/', UserSearchAPIView.as_view(), name='social_users_search'),
    path('contacts/', ContactListCreateAPIView.as_view(), name='contacts_list_create'),
    path('social/contacts/', ContactListCreateAPIView.as_view(), name='social_contacts_list_create'),
    path('contacts/<uuid:contact_id>/', ContactDetailAPIView.as_view(), name='contact_detail'),
    path('social/contacts/<uuid:contact_id>/', ContactDetailAPIView.as_view(), name='social_contact_detail'),
    path('contacts/sync/', ContactSyncAPIView.as_view(), name='contacts_sync'),
    path('friends/suggestions/', FriendSuggestionsAPIView.as_view(), name='friend_suggestions'),
    path('social/suggestions/', FriendSuggestionsAPIView.as_view(), name='social_friend_suggestions'),
    path('notes/', PersonalNoteListCreateAPIView.as_view(), name='personal_notes_list_create'),
    path('social/notes/', PersonalNoteListCreateAPIView.as_view(), name='social_personal_notes_list_create'),
    path('notes/<uuid:note_id>/', PersonalNoteDetailAPIView.as_view(), name='personal_note_detail'),
    path('social/notes/<uuid:note_id>/', PersonalNoteDetailAPIView.as_view(), name='social_personal_note_detail'),
    path('presence/heartbeat/', PresenceHeartbeatAPIView.as_view(), name='presence_heartbeat'),

    # Real-Time Core Messaging & Conversations
    path('conversations/direct/', DirectConversationAPIView.as_view(), name='conversations_direct'),
    path('chat/conversations/direct/', DirectConversationAPIView.as_view(), name='chat_conversations_direct'),
    path('conversations/', ConversationListCreateAPIView.as_view(), name='conversations_list_create'),
    path('chat/conversations/', ConversationListCreateAPIView.as_view(), name='chat_conversations_list_create'),
    path('conversations/<uuid:conv_id>/', ConversationDetailAPIView.as_view(), name='conversation_detail'),
    path('chat/conversations/<uuid:conv_id>/', ConversationDetailAPIView.as_view(), name='chat_conversation_detail'),
    path('conversations/<uuid:conv_id>/mute/', ConversationMuteToggleAPIView.as_view(), name='conversation_mute_toggle'),
    path('chat/conversations/<uuid:conv_id>/mute/', ConversationMuteToggleAPIView.as_view(), name='chat_conversation_mute_toggle'),
    path('conversations/<uuid:conv_id>/pin/', ConversationPinToggleAPIView.as_view(), name='conversation_pin_toggle'),
    path('chat/conversations/<uuid:conv_id>/pin/', ConversationPinToggleAPIView.as_view(), name='chat_conversation_pin_toggle'),
    path('conversations/<uuid:conv_id>/archive/', ConversationArchiveToggleAPIView.as_view(), name='conversation_archive_toggle'),
    path('chat/conversations/<uuid:conv_id>/archive/', ConversationArchiveToggleAPIView.as_view(), name='chat_conversation_archive_toggle'),
    path('conversations/<uuid:conv_id>/clear/', ConversationClearAPIView.as_view(), name='conversation_clear'),
    path('chat/conversations/<uuid:conv_id>/clear/', ConversationClearAPIView.as_view(), name='chat_conversation_clear'),
    path('conversations/<uuid:conv_id>/messages/', MessageListCreateAPIView.as_view(), name='messages_list_create'),
    path('chat/conversations/<uuid:conv_id>/messages/', MessageListCreateAPIView.as_view(), name='chat_messages_list_create'),
    path('conversations/<uuid:conv_id>/draft/', MessageDraftAPIView.as_view(), name='conversation_draft'),
    path('chat/conversations/<uuid:conv_id>/draft/', MessageDraftAPIView.as_view(), name='chat_conversation_draft'),
    path('messages/', MessageListCreateAPIView.as_view(), name='messages_direct_create'),
    path('chat/messages/', MessageListCreateAPIView.as_view(), name='chat_messages_direct_create'),
    path('messages/<uuid:message_id>/', MessageDetailAPIView.as_view(), name='message_detail'),
    path('chat/messages/<uuid:message_id>/', MessageDetailAPIView.as_view(), name='chat_message_detail'),
    path('messages/<uuid:message_id>/reaction/', MessageReactionAPIView.as_view(), name='message_reaction'),
    path('chat/messages/<uuid:message_id>/reaction/', MessageReactionAPIView.as_view(), name='chat_message_reaction'),
    path('messages/<uuid:message_id>/react/', MessageReactionAPIView.as_view(), name='message_react'),
    path('chat/messages/<uuid:message_id>/react/', MessageReactionAPIView.as_view(), name='chat_message_react'),
    path('messages/<uuid:message_id>/star/', MessageStarToggleAPIView.as_view(), name='message_star_toggle'),
    path('chat/messages/<uuid:message_id>/star/', MessageStarToggleAPIView.as_view(), name='chat_message_star_toggle'),
    path('messages/<uuid:message_id>/pin/', MessagePinToggleAPIView.as_view(), name='message_pin_toggle'),
    path('chat/messages/<uuid:message_id>/pin/', MessagePinToggleAPIView.as_view(), name='chat_message_pin_toggle'),
    path('messages/<uuid:message_id>/delete-for-everyone/', MessageDeleteForEveryoneAPIView.as_view(), name='message_delete_for_everyone'),
    path('chat/messages/<uuid:message_id>/delete-for-everyone/', MessageDeleteForEveryoneAPIView.as_view(), name='chat_message_delete_for_everyone'),
    path('messages/<uuid:message_id>/forward/', MessageForwardAPIView.as_view(), name='message_forward'),
    path('chat/messages/<uuid:message_id>/forward/', MessageForwardAPIView.as_view(), name='chat_message_forward'),
    path('messages/starred/', StarredMessagesListAPIView.as_view(), name='starred_messages_list'),
    path('chat/messages/starred/', StarredMessagesListAPIView.as_view(), name='chat_starred_messages_list'),
    path('messages/scheduled/', ScheduledMessageListCreateAPIView.as_view(), name='scheduled_messages_list_create'),
    path('chat/scheduled-messages/', ScheduledMessageListCreateAPIView.as_view(), name='chat_scheduled_messages_list_create'),
    path('messages/scheduled/<uuid:schedule_id>/', ScheduledMessageDetailAPIView.as_view(), name='scheduled_message_detail'),
    path('chat/scheduled-messages/<uuid:schedule_id>/', ScheduledMessageDetailAPIView.as_view(), name='chat_scheduled_message_detail'),
    path('messages/search/', SearchMessagesAPIView.as_view(), name='messages_search'),
    path('chat/messages/search/', SearchMessagesAPIView.as_view(), name='chat_messages_search'),

    # Media, Files & Rich Sharing
    path('media/gallery/', MediaGalleryAPIView.as_view(), name='media_gallery_global'),
    path('conversations/<uuid:conv_id>/upload/', FileUploadAPIView.as_view(), name='media_upload'),
    path('conversations/<uuid:conv_id>/gallery/', MediaGalleryAPIView.as_view(), name='media_gallery'),
    path('conversations/<uuid:conv_id>/share/location/', ShareLocationAPIView.as_view(), name='share_location'),
    path('conversations/<uuid:conv_id>/share/contact/', ShareContactAPIView.as_view(), name='share_contact'),
    path('attachments/<uuid:attachment_id>/download/', FileDownloadAPIView.as_view(), name='file_download'),

    # Group Conversations, Administration & Polls
    path('groups/', CreateGroupAPIView.as_view(), name='group_root_create'),
    path('groups/create/', CreateGroupAPIView.as_view(), name='group_create'),
    path('groups/<uuid:group_id>/', GroupDetailAPIView.as_view(), name='group_detail'),
    path('groups/<uuid:group_id>/members/', GroupMembersAPIView.as_view(), name='group_members'),
    path('groups/<uuid:group_id>/members/action/', GroupMemberActionAPIView.as_view(), name='group_member_action'),
    path('groups/<uuid:group_id>/members/<uuid:member_id>/promote/', GroupMemberPromoteAPIView.as_view(), name='group_member_promote'),
    path('groups/<uuid:group_id>/members/<uuid:member_id>/demote/', GroupMemberDemoteAPIView.as_view(), name='group_member_demote'),
    path('groups/<uuid:group_id>/members/<uuid:member_id>/', GroupMemberDeleteAPIView.as_view(), name='group_member_delete'),
    path('groups/<uuid:group_id>/leave/', GroupLeaveAPIView.as_view(), name='group_leave'),
    path('groups/<uuid:group_id>/invite/', GroupInviteLinkAPIView.as_view(), name='group_invite_link'),
    path('groups/<uuid:group_id>/invite-link/', GroupInviteLinkAPIView.as_view(), name='group_invite_link_alias'),
    path('groups/join/<str:token>/', JoinGroupViaInviteAPIView.as_view(), name='group_join_via_invite'),
    path('groups/<uuid:group_id>/permissions/', GroupPermissionsAPIView.as_view(), name='group_permissions'),
    path('conversations/<uuid:conv_id>/polls/', GroupPollListCreateAPIView.as_view(), name='group_polls_list_create'),
    path('polls/<uuid:poll_id>/vote/', GroupPollVoteAPIView.as_view(), name='group_poll_vote'),
    path('groups/polls/<uuid:poll_id>/vote/', GroupPollVoteAPIView.as_view(), name='groups_poll_vote_alias'),
    path('polls/<uuid:poll_id>/close/', GroupPollCloseAPIView.as_view(), name='group_poll_close'),

    # 24-Hour Stories & Status Updates
    path('status/', CreateStatusAPIView.as_view(), name='status_create_root'),
    path('status/feed/', StatusFeedAPIView.as_view(), name='status_feed'),
    path('status/create/', CreateStatusAPIView.as_view(), name='status_create'),
    path('status/<uuid:status_id>/', StatusDetailAPIView.as_view(), name='status_detail'),
    path('status/<uuid:status_id>/view/', RecordStatusViewAPIView.as_view(), name='status_record_view'),
    path('status/<uuid:status_id>/react/', StatusReactionAPIView.as_view(), name='status_react'),
    path('status/<uuid:status_id>/reply/', ReplyToStatusAPIView.as_view(), name='status_reply'),

    # Audio & Video WebRTC Calling
    path('calls/initiate/', InitiateCallAPIView.as_view(), name='call_initiate'),
    path('calls/<uuid:call_id>/action/', CallActionAPIView.as_view(), name='call_action'),
    path('calls/history/', CallHistoryAPIView.as_view(), name='call_history'),
    path('calls/ice-config/', CallICEConfigAPIView.as_view(), name='call_ice_config'),

    # AI-Powered Communication Tools
    path('ai/chat/', AIChatAssistantAPIView.as_view(), name='ai_chat_root'),
    path('ai/assistant/chat/', AIChatAssistantAPIView.as_view(), name='ai_chat_assistant'),
    path('ai/smart-replies/', AISmartRepliesAPIView.as_view(), name='ai_smart_replies'),
    path('ai/summarize/', AISummarizeAPIView.as_view(), name='ai_summarize'),
    path('ai/translate/', AITranslateAPIView.as_view(), name='ai_translate'),
    path('ai/writing-assistant/', AIWritingAssistantAPIView.as_view(), name='ai_writing_assistant'),
    path('ai/transcribe/', AIVoiceTranscriptionAPIView.as_view(), name='ai_transcribe'),
    path('conversations/<uuid:conv_id>/insights/', AIConversationInsightsAPIView.as_view(), name='ai_conversation_insights'),

    # Privacy, Security, E2EE Key Management & Reporting
    path('security/keys/register/', RegisterEncryptionKeysAPIView.as_view(), name='security_register_keys'),
    path('security/keys/<uuid:user_id>/', UserKeyBundleAPIView.as_view(), name='security_user_key_bundle'),
    path('security/blocked/', BlockedUsersListAPIView.as_view(), name='security_blocked_list'),
    path('security/blocked-users/', BlockedUsersListAPIView.as_view(), name='security_blocked_users_alias'),
    path('security/blocked/<uuid:user_id>/', UnblockUserAPIView.as_view(), name='security_unblock_user'),
    path('security/blocked-users/<uuid:user_id>/', UnblockUserAPIView.as_view(), name='security_unblock_user_alias'),
    path('security/reports/', SubmitReportAPIView.as_view(), name='security_submit_report'),
    path('conversations/<uuid:conv_id>/disappearing/', DisappearingMessagesConfigAPIView.as_view(), name='disappearing_messages_config'),
    path('security/disappearing/purge/', PurgeExpiredDisappearingMessagesAPIView.as_view(), name='disappearing_messages_purge'),

    # Administrative Dashboard & Moderation
    path('admin/overview/', AdminOverviewAPIView.as_view(), name='admin_overview_alias'),
    path('admin-api/overview/', AdminOverviewAPIView.as_view(), name='admin_overview'),
    path('admin/users/', AdminUserListAPIView.as_view(), name='admin_users_list_alias'),
    path('admin-api/users/', AdminUserListAPIView.as_view(), name='admin_users_list'),
    path('admin/users/<uuid:user_id>/action/', AdminUserActionAPIView.as_view(), name='admin_user_action_alias'),
    path('admin-api/users/<uuid:user_id>/action/', AdminUserActionAPIView.as_view(), name='admin_user_action'),
    path('admin-api/groups/', AdminGroupListAPIView.as_view(), name='admin_groups_list'),
    path('admin-api/groups/<uuid:group_id>/', AdminGroupDeleteAPIView.as_view(), name='admin_group_delete'),
    path('admin/reports/', AdminReportListAPIView.as_view(), name='admin_reports_list_alias'),
    path('admin-api/reports/', AdminReportListAPIView.as_view(), name='admin_reports_list'),
    path('admin/reports/<uuid:report_id>/resolve/', AdminResolveReportAPIView.as_view(), name='admin_report_resolve_alias'),
    path('admin-api/reports/<uuid:report_id>/resolve/', AdminResolveReportAPIView.as_view(), name='admin_report_resolve'),
    path('admin/health/', AdminServerHealthAPIView.as_view(), name='admin_server_health_alias'),
    path('admin-api/health/', AdminServerHealthAPIView.as_view(), name='admin_server_health'),
    path('admin/settings/', AdminAppSettingsAPIView.as_view(), name='admin_app_settings_alias'),
    path('admin-api/settings/', AdminAppSettingsAPIView.as_view(), name='admin_app_settings'),
]
