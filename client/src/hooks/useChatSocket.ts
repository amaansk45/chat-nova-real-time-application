import { useEffect, useRef, useState, useCallback } from 'react';
import { ReconnectingWebSocket } from '../utils/websocket';
import { sounds } from '../utils/sounds';
import { Message, MessageReaction } from '../types';

interface UseChatSocketOptions {
  conversationId: string | null;
  currentUserId?: string;
  onNewMessage?: (message: Message) => void;
  onTypingStatus?: (username: string, isTyping: boolean) => void;
  onReadReceipt?: (messageId: string, userId: string) => void;
  onAllMessagesRead?: (userId: string) => void;
  onReactionUpdated?: (messageId: string, reactions: MessageReaction[]) => void;
  onMessageEdited?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
  onUserPresence?: (userId: string, isOnline: boolean) => void;
  onIncomingCall?: (callData: any) => void;
  onCallStatus?: (statusData: any) => void;
}

export const useChatSocket = ({
  conversationId,
  currentUserId,
  onNewMessage,
  onTypingStatus,
  onReadReceipt,
  onAllMessagesRead,
  onReactionUpdated,
  onMessageEdited,
  onMessageDeleted,
  onUserPresence,
  onIncomingCall,
  onCallStatus,
}: UseChatSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    if (!conversationId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('chatnova_access_token') || '';
    const socket = new ReconnectingWebSocket(`/ws/chat/${conversationId}/`, token);
    socketRef.current = socket;

    socket.on('_open', () => {
      setIsConnected(true);
    });

    socket.on('_close', () => {
      setIsConnected(false);
    });

    // Message events
    socket.on('new_message', (data: { message: Message }) => {
      if (data.message.sender?.id !== currentUserId) {
        sounds.playReceived();
      }
      onNewMessage?.(data.message);
    });

    socket.on('typing_status', (data: { user: string; is_typing: boolean }) => {
      onTypingStatus?.(data.user, data.is_typing);
    });

    socket.on('message_read', (data: { message_id: string; user_id: string }) => {
      onReadReceipt?.(data.message_id, data.user_id);
    });

    socket.on('all_messages_read', (data: { user_id: string }) => {
      onAllMessagesRead?.(data.user_id);
    });

    socket.on('incoming_call', (data: any) => {
      sounds.playRingtone();
      onIncomingCall?.(data);
    });

    socket.on('call_status', (data: any) => {
      onCallStatus?.(data);
    });

    socket.on('call_reject', (data: any) => {
      onCallStatus?.({ action: 'reject', ...data });
    });

    socket.on('call_end', (data: any) => {
      onCallStatus?.({ action: 'end', ...data });
    });

    socket.on('reaction_updated', (data: { message_id: string; reactions: MessageReaction[] }) => {
      onReactionUpdated?.(data.message_id, data.reactions);
    });

    socket.on('message_edited', (data: { message: Message }) => {
      onMessageEdited?.(data.message);
    });

    socket.on('message_deleted', (data: { message_id: string }) => {
      onMessageDeleted?.(data.message_id);
    });

    socket.on('user_presence', (data: { user_id: string; is_online: boolean }) => {
      onUserPresence?.(data.user_id, data.is_online);
    });

    socket.connect();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback((content: string, replyToId?: string) => {
    socketRef.current?.send({
      type: 'chat_message',
      message: content,
      reply_to_id: replyToId,
    });
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.send({
      type: 'typing',
      is_typing: isTyping,
    });
  }, []);

  const sendReadReceipt = useCallback((messageId: string) => {
    socketRef.current?.send({
      action: 'read_receipt',
      type: 'read_receipt',
      message_id: messageId,
    });
  }, []);

  const sendMarkAllRead = useCallback(() => {
    socketRef.current?.send({
      action: 'mark_all_read',
      type: 'mark_all_read',
    });
  }, []);

  const sendCallSignal = useCallback((signalType: string, payload: any) => {
    socketRef.current?.send({
      action: 'call_signal',
      type: 'call_signal',
      signal_type: signalType,
      payload,
    });
  }, []);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.send({
      type: 'reaction',
      message_id: messageId,
      emoji,
    });
  }, []);

  const sendEditMessage = useCallback((messageId: string, newContent: string) => {
    socketRef.current?.send({
      type: 'edit_message',
      message_id: messageId,
      new_content: newContent,
    });
  }, []);

  const sendDeleteMessage = useCallback((messageId: string) => {
    socketRef.current?.send({
      type: 'delete_message',
      message_id: messageId,
    });
  }, []);

  return {
    isConnected,
    sendMessage,
    sendTyping,
    sendReadReceipt,
    sendMarkAllRead,
    sendCallSignal,
    sendReaction,
    sendEditMessage,
    sendDeleteMessage,
  };
};

export default useChatSocket;
