import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { sounds } from '../../utils/sounds';
import Avatar from '../ui/Avatar';

interface IncomingCallModalProps {
  isOpen: boolean;
  caller: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  caller,
  callType,
  onAccept,
  onReject,
}) => {
  useEffect(() => {
    if (isOpen) {
      sounds.playRingtone();
      const ringInterval = setInterval(() => {
        sounds.playRingtone();
      }, 4000);
      return () => clearInterval(ringInterval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm bg-nova-card border border-nova-border rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow circle */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-nova-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Avatar with pulsing rings */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 rounded-full bg-nova-primary/30 animate-ping" />
          <Avatar
            src={caller.avatar_url}
            alt={caller.username}
            size="xl"
            className="relative z-10 border-4 border-nova-card"
          />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">{caller.username}</h3>
        <p className="text-xs font-semibold text-nova-accent uppercase tracking-wider flex items-center justify-center gap-1.5 mb-8">
          {callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          Incoming {callType === 'video' ? 'Video Call' : 'Voice Call'}...
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onReject}
            className="w-14 h-14 rounded-full bg-nova-error/20 hover:bg-nova-error text-nova-error hover:text-white border border-nova-error/40 flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95"
            title="Decline"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <button
            onClick={onAccept}
            className="w-14 h-14 rounded-full bg-nova-success text-white shadow-xl shadow-green-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            title="Accept"
          >
            <Phone className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
