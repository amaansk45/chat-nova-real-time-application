import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { WebRTCManager } from '../../utils/webrtc';
import Avatar from '../ui/Avatar';

interface ActiveCallScreenProps {
  callId: string;
  partner: {
    username: string;
    avatar_url?: string | null;
  };
  callType: 'audio' | 'video';
  webrtcManager: WebRTCManager;
  onEndCall: () => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  callId,
  partner,
  callType,
  webrtcManager,
  onEndCall,
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach WebRTC streams
  useEffect(() => {
    const updateStreams = () => {
      const local = webrtcManager.getLocalStream();
      const remote = webrtcManager.getRemoteStream();
      if (localVideoRef.current && local && localVideoRef.current.srcObject !== local) {
        localVideoRef.current.srcObject = local;
      }
      if (remoteVideoRef.current && remote && remoteVideoRef.current.srcObject !== remote) {
        remoteVideoRef.current.srcObject = remote;
      }
      if (remoteAudioRef.current && remote && remoteAudioRef.current.srcObject !== remote) {
        remoteAudioRef.current.srcObject = remote;
      }
    };

    updateStreams();
    const interval = setInterval(updateStreams, 1000);
    return () => clearInterval(interval);
  }, [webrtcManager]);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMic = () => {
    const newState = webrtcManager.toggleAudio();
    setIsMuted(!newState);
  };

  const handleToggleVideo = () => {
    const newState = webrtcManager.toggleVideo();
    setIsVideoOff(!newState);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      webrtcManager.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await webrtcManager.startScreenShare();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen share error', err);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#060A12] flex flex-col justify-between p-6 select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Avatar src={partner.avatar_url} alt={partner.username} size="md" />
          <div>
            <h4 className="text-sm font-bold text-white">{partner.username}</h4>
            <span className="text-xs font-mono text-nova-accent">{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={handleToggleFullscreen}
          className="p-2.5 rounded-xl bg-nova-card/80 text-nova-muted hover:text-white border border-nova-border/50"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Hidden remote audio receiver for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Main View Area */}
      <div className="flex-1 relative flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-nova-card/30 border border-nova-border/30">
        {callType === 'video' ? (
          <>
            {/* Remote Video Feed */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-3xl"
            />

            {/* Local Video Picture-in-Picture */}
            <div className="absolute bottom-4 right-4 w-44 h-28 rounded-2xl overflow-hidden border-2 border-nova-primary/50 shadow-2xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-nova-card border-4 border-nova-primary/30 flex items-center justify-center mb-6 shadow-2xl relative">
              <div className="absolute inset-0 rounded-full border border-nova-accent/40 animate-ping" />
              <Avatar src={partner.avatar_url} alt={partner.username} size="xl" />
            </div>
            <h3 className="text-xl font-bold text-white">{partner.username}</h3>
            <p className="text-xs text-nova-muted mt-1 font-mono">{formatTime(duration)}</p>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center justify-center gap-4 z-10">
        <button
          onClick={handleToggleMic}
          className={`p-4 rounded-2xl transition-all shadow-lg ${
            isMuted ? 'bg-nova-error text-white' : 'bg-nova-card text-white hover:bg-nova-dark border border-nova-border'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={handleToggleVideo}
          className={`p-4 rounded-2xl transition-all shadow-lg ${
            isVideoOff ? 'bg-nova-error text-white' : 'bg-nova-card text-white hover:bg-nova-dark border border-nova-border'
          }`}
          title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button
          onClick={handleToggleScreenShare}
          className={`p-4 rounded-2xl transition-all shadow-lg ${
            isScreenSharing ? 'bg-nova-accent text-white' : 'bg-nova-card text-white hover:bg-nova-dark border border-nova-border'
          }`}
          title="Share Screen"
        >
          <Monitor className="w-6 h-6" />
        </button>

        <button
          onClick={onEndCall}
          className="p-4 rounded-2xl bg-nova-error hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ActiveCallScreen;
