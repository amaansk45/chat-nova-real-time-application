import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start elapsed timer
      setElapsed(0);
      timerIntervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Web Audio API Visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          // Gradient from electric blue to cyan
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      };

      drawVisualizer();
    } catch (err: any) {
      setError('Microphone permission denied or not available.');
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onSendVoice(audioBlob, elapsed);
      cleanup();
    };

    mediaRecorderRef.current.stop();
  };

  const handleDiscard = () => {
    cleanup();
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="p-3 bg-nova-error/10 border border-nova-error/30 rounded-2xl flex items-center justify-between text-xs text-nova-error">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </span>
        <button onClick={handleDiscard} className="font-semibold underline hover:text-white">
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-nova-dark border border-nova-border rounded-2xl animate-in fade-in duration-150">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-nova-error/20 flex items-center justify-center text-nova-error animate-pulse">
          <Mic className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono font-bold text-white">{formatTime(elapsed)}</span>
      </div>

      {/* Real-Time Waveform Canvas */}
      <div className="flex-1 max-w-xs h-8 flex items-center justify-center">
        <canvas ref={canvasRef} width={200} height={32} className="w-full h-full" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDiscard}
          className="p-2 rounded-xl text-nova-muted hover:text-nova-error hover:bg-nova-card transition-colors"
          title="Discard recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleStopAndSend}
          className="p-2 rounded-xl bg-gradient-to-r from-nova-primary to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
          title="Send voice message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VoiceRecorder;
