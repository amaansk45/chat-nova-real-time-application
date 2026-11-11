import { useEffect, useRef, useState, useCallback } from 'react';
import { ReconnectingWebSocket } from '../utils/websocket';
import { sounds } from '../utils/sounds';
import { Notification } from '../types';

interface UseNotificationsSocketOptions {
  onNotification?: (notification: Notification) => void;
  onIncomingCall?: (callData: { call_id: string; caller: any; call_type: string }) => void;
  onBadgeCount?: (count: number) => void;
}

export const useNotificationsSocket = ({
  onNotification,
  onIncomingCall,
  onBadgeCount,
}: UseNotificationsSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('chatnova_access_token');
    if (!token) return;

    const socket = new ReconnectingWebSocket('/ws/notifications/', token);
    socketRef.current = socket;

    socket.on('_open', () => {
      setIsConnected(true);
    });

    socket.on('_close', () => {
      setIsConnected(false);
    });

    socket.on('notification', (data: { notification: Notification }) => {
      sounds.playNotification();
      onNotification?.(data.notification);
    });

    socket.on('incoming_call', (data: any) => {
      sounds.playRingtone();
      onIncomingCall?.(data);
    });

    socket.on('badge_count', (data: { count: number }) => {
      onBadgeCount?.(data.count);
    });

    socket.connect();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const markAllRead = useCallback(() => {
    socketRef.current?.send({ type: 'mark_all_read' });
  }, []);

  return {
    isConnected,
    markAllRead,
  };
};

export default useNotificationsSocket;
