from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import (
    RegisterAPIView, LoginAPIView, Verify2FAAPIView,
    SendOTPAPIView, VerifyOTPAPIView, ForgotPasswordAPIView,
    ResetPasswordAPIView, LogoutAPIView, TwoFactorToggleAPIView,
    ActiveSessionsAPIView, RevokeSessionAPIView, DeleteAccountAPIView,
    AccountRecoveryAPIView, MeAPIView
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
]
