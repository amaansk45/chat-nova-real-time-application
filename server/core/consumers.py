import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import (
    User, Conversation, ConversationMember, Message,
    MessageReceipt, MessageReaction, Call, CallParticipant, Notification
)

class ChatConsumer(AsyncWebsocketConsumer):
    """
    Handles real-time conversation messaging, typing status,
    read receipts, reactions, message editing, and deletions.
    """
    async def connect(self):
        self.user = self.scope.get('user')
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        self.room_group_name = f"chat_{self.conversation_id}"

        # Allow authenticated users or proceed if conversation exists
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Join conversation room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Also join user's personal channel group
        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

        # Update user presence to online
        await self.set_user_online_status(True)

        # Broadcast online status to conversation
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_presence_event',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_online': True,
                'last_seen': timezone.now().isoformat(),
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Broadcast offline status
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_presence_event',
                    'user_id': str(self.user.id) if self.user and self.user.is_authenticated else None,
                    'username': self.user.username if self.user and self.user.is_authenticated else None,
                    'is_online': False,
                    'last_seen': timezone.now().isoformat(),
                }
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

        if self.user and self.user.is_authenticated:
            await self.set_user_online_status(False)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        action = data.get('action') or data.get('type')

        if action in ['chat_message', 'message']:
            await self.handle_chat_message(data)
        elif action == 'typing':
            is_typing = bool(data.get('is_typing', True))
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_status_event',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'is_typing': is_typing,
                }
            )
        elif action == 'typing_start':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_status_event',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'is_typing': True,
                }
            )
        elif action == 'typing_stop':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_status_event',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'is_typing': False,
                }
            )
        elif action == 'read_receipt':
            message_id = data.get('message_id')
            if message_id:
                await self.record_read_receipt(message_id)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'read_receipt_event',
                        'message_id': str(message_id),
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'read_at': timezone.now().isoformat(),
                    }
                )
        elif action == 'mark_all_read':
            await self.mark_conversation_messages_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'all_messages_read_event',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'conversation_id': str(self.conversation_id),
                }
            )
        elif action == 'call_signal':
            # Direct relay of WebRTC signaling within conversation room
            signal_type = data.get('signal_type')
            payload = data.get('payload', {})
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_signal_relay_event',
                    'sender_id': str(self.user.id),
                    'signal_type': signal_type,
                    'payload': payload,
                }
            )
        elif action == 'reaction_add':
            message_id = data.get('message_id')
            emoji = data.get('emoji')
            if message_id and emoji:
                await self.save_message_reaction(message_id, emoji)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'reaction_update_event',
                        'message_id': message_id,
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'emoji': emoji,
                        'action': 'add',
                    }
                )
        elif action == 'reaction_remove':
            message_id = data.get('message_id')
            emoji = data.get('emoji')
            if message_id and emoji:
                await self.remove_message_reaction(message_id, emoji)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'reaction_update_event',
                        'message_id': message_id,
                        'user_id': str(self.user.id),
                        'username': self.user.username,
                        'emoji': emoji,
                        'action': 'remove',
                    }
                )
        elif action == 'message_edit':
            message_id = data.get('message_id')
            new_content = data.get('content', '').strip()
            if message_id and new_content:
                updated = await self.update_message_content(message_id, new_content)
                if updated:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'message_edited_event',
                            'message_id': message_id,
                            'content': new_content,
                            'edited_at': timezone.now().isoformat(),
                        }
                    )
        elif action == 'message_delete':
            message_id = data.get('message_id')
            delete_for_everyone = data.get('for_everyone', False)
            if message_id:
                await self.delete_message(message_id, delete_for_everyone)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_deleted_event',
                        'message_id': message_id,
                        'for_everyone': delete_for_everyone,
                        'user_id': str(self.user.id),
                    }
                )

    async def handle_chat_message(self, data):
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        reply_to_id = data.get('reply_to')
        metadata = data.get('metadata', {})

        msg_obj = await self.save_message_to_db(content, message_type, reply_to_id, metadata)
        if not msg_obj:
            return

        avatar_url = None
        if hasattr(self.user, 'profile') and self.user.profile.avatar:
            avatar_url = self.user.profile.avatar.url

        payload = {
            'type': 'broadcast_message_event',
            'message': {
                'id': str(msg_obj['id']),
                'conversation_id': str(self.conversation_id),
                'sender': {
                    'id': str(self.user.id),
                    'username': self.user.username,
                    'first_name': self.user.first_name,
                    'last_name': self.user.last_name,
                    'avatar_url': avatar_url,
                },
                'message_type': message_type,
                'content': content,
                'reply_to': reply_to_id,
                'metadata': metadata,
                'created_at': msg_obj['created_at'].isoformat(),
                'is_edited': False,
                'reactions': [],
            }
        }
        await self.channel_layer.group_send(self.room_group_name, payload)

    # Event Handlers dispatched from channel layer
    async def broadcast_message_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'action': 'new_message',
            'message': event['message'],
        }))

    async def typing_status_event(self, event):
        # Don't echo typing status back to self
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing_status',
                'action': 'typing_status',
                'user': event['username'],
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))

    async def read_receipt_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'action': 'message_read',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event['username'],
            'read_at': event['read_at'],
        }))

    async def all_messages_read_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'all_messages_read',
            'action': 'all_messages_read',
            'user_id': event['user_id'],
            'username': event['username'],
            'conversation_id': event['conversation_id'],
        }))

    async def call_incoming_event(self, event):
        if event.get('caller', {}).get('id') != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'incoming_call',
                'action': 'incoming_call',
                'call_id': event['call_id'],
                'room_id': event['room_id'],
                'call_type': event['call_type'],
                'caller': event['caller'],
                'conversation_id': event.get('conversation_id'),
            }))

    async def call_status_event(self, event):
        await self.send(text_data=json.dumps({
            'type': f"call_{event['action']}",
            'action': f"call_{event['action']}",
            'call_id': event['call_id'],
            'room_id': event['room_id'],
            'status': event['status'],
        }))

    async def call_signal_relay_event(self, event):
        if event['sender_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': event['signal_type'],
                'action': event['signal_type'],
                'sender_id': event['sender_id'],
                'payload': event['payload'],
            }))

    async def reaction_update_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction_updated',
            'action': 'reaction_updated',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event['username'],
            'emoji': event['emoji'],
            'reaction_action': event['action'],
        }))

    async def message_edited_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'action': 'message_edited',
            'message_id': event['message_id'],
            'content': event['content'],
            'edited_at': event['edited_at'],
        }))

    async def message_deleted_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'action': 'message_deleted',
            'message_id': event['message_id'],
            'for_everyone': event['for_everyone'],
            'user_id': event['user_id'],
        }))

    async def user_presence_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_presence',
            'action': 'user_presence',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_online': event['is_online'],
            'last_seen': event['last_seen'],
        }))

    # Database sync helpers
    @database_sync_to_async
    def set_user_online_status(self, is_online):
        try:
            self.user.is_online = is_online
            self.user.last_seen = timezone.now()
            self.user.save(update_fields=['is_online', 'last_seen'])
        except Exception:
            pass

    @database_sync_to_async
    def save_message_to_db(self, content, message_type, reply_to_id, metadata):
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            reply_msg = Message.objects.filter(id=reply_to_id).first() if reply_to_id else None
            msg = Message.objects.create(
                conversation=conv,
                sender=self.user,
                content=content,
                message_type=message_type,
                reply_to=reply_msg,
                metadata=metadata or {}
            )
            # Update conversation timestamp
            conv.save(update_fields=['updated_at'])
            return {'id': msg.id, 'created_at': msg.created_at}
        except Exception as e:
            print(f"Error saving message: {e}")
            return None

    @database_sync_to_async
    def record_read_receipt(self, message_id):
        try:
            msg = Message.objects.get(id=message_id)
            MessageReceipt.objects.update_or_create(
                message=msg,
                user=self.user,
                status='read',
                defaults={'timestamp': timezone.now()}
            )
        except Exception:
            pass

    @database_sync_to_async
    def mark_conversation_messages_read(self):
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            other_msgs = conv.messages.exclude(sender=self.user)
            for m in other_msgs:
                MessageReceipt.objects.update_or_create(
                    message=m,
                    user=self.user,
                    defaults={'status': 'read', 'timestamp': timezone.now()}
                )
            ConversationMember.objects.filter(conversation=conv, user=self.user).update(unread_count=0)
        except Exception as e:
            print(f"Error marking messages read: {e}")

    @database_sync_to_async
    def save_message_reaction(self, message_id, emoji):
        try:
            msg = Message.objects.get(id=message_id)
            MessageReaction.objects.update_or_create(
                message=msg,
                user=self.user,
                emoji=emoji
            )
        except Exception:
            pass

    @database_sync_to_async
    def remove_message_reaction(self, message_id, emoji):
        try:
            MessageReaction.objects.filter(
                message_id=message_id,
                user=self.user,
                emoji=emoji
            ).delete()
        except Exception:
            pass

    @database_sync_to_async
    def update_message_content(self, message_id, new_content):
        try:
            msg = Message.objects.get(id=message_id, sender=self.user)
            msg.content = new_content
            msg.is_edited = True
            msg.edited_at = timezone.now()
            msg.save(update_fields=['content', 'is_edited', 'edited_at'])
            return True
        except Exception:
            return False

    @database_sync_to_async
    def delete_message(self, message_id, for_everyone):
        try:
            msg = Message.objects.get(id=message_id)
            if for_everyone and msg.sender == self.user:
                msg.is_deleted_for_everyone = True
                msg.content = "This message was deleted"
                msg.save(update_fields=['is_deleted_for_everyone', 'content'])
            else:
                msg.deleted_for_users.add(self.user)
            return True
        except Exception:
            return False


class CallSignalingConsumer(AsyncWebsocketConsumer):
    """
    WebRTC PeerConnection signaling exchange consumer (SDP offer, answer, ICE candidates).
    """
    async def connect(self):
        self.user = self.scope.get('user')
        self.room_id = self.scope['url_route']['kwargs'].get('room_id')
        self.call_group_name = f"call_{self.room_id}"

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(
            self.call_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'call_group_name'):
            await self.channel_layer.group_send(
                self.call_group_name,
                {
                    'type': 'peer_disconnected_event',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                }
            )
            await self.channel_layer.group_discard(
                self.call_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        signal_type = data.get('type')
        payload = data.get('payload', {})

        # Broadcast signal to other call participants in room
        await self.channel_layer.group_send(
            self.call_group_name,
            {
                'type': 'signaling_relay_event',
                'sender_id': str(self.user.id),
                'sender_username': self.user.username,
                'signal_type': signal_type,
                'payload': payload,
            }
        )

    async def signaling_relay_event(self, event):
        # Do not echo back to sender
        if event['sender_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': event['signal_type'],
                'sender_id': event['sender_id'],
                'sender_username': event['sender_username'],
                'payload': event['payload'],
            }))

    async def peer_disconnected_event(self, event):
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'peer_disconnected',
                'user_id': event['user_id'],
                'username': event['username'],
            }))


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Personal notification feed consumer for incoming calls, alerts, and system notifications.
    """
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        # Client can ping/heartbeat
        pass

    async def send_notification_event(self, event):
        await self.send(text_data=json.dumps(event['notification']))
