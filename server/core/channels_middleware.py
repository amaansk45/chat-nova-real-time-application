import urllib.parse
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from .models import User

@database_sync_to_async
def get_user_from_token(token_string):
    try:
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except Exception as e:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom WebSocket middleware that authenticates users via JWT token
    passed in query string (?token=...) or Sec-WebSocket-Protocol header.
    """
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = urllib.parse.parse_qs(query_string)
        token = None

        if 'token' in query_params:
            token = query_params['token'][0]
        else:
            # Check headers
            headers = dict(scope.get('headers', []))
            if b'sec-websocket-protocol' in headers:
                token = headers[b'sec-websocket-protocol'].decode('utf-8')

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
