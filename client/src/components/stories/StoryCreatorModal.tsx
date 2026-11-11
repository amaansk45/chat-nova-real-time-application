import React, { useState, useRef } from 'react';
import { Type, Image as ImageIcon, Send, Sparkles, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface StoryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #1e3a8a, #06b6d4)',
  'linear-gradient(135deg, #7c3aed, #ec4899)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #059669, #10b981)',
  'linear-gradient(135deg, #0f172a, #1e293b)',
];

const FONT_OPTIONS = ['sans-serif', 'serif', 'monospace', 'cursive'];

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const [mode, setMode] = useState<'text' | 'media'>('text');
  const [textContent, setTextContent] = useState('');
  const [bgGradient, setBgGradient] = useState(GRADIENT_PRESETS[0]);
  const [fontStyle, setFontStyle] = useState(FONT_OPTIONS[0]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (mode === 'text' && !textContent.trim()) {
      showToast('Please type some text for your status.', 'error');
      return;
    }

    if (mode === 'media' && !selectedFile) {
      showToast('Please select a photo or video to share.', 'error');
      return;
    }

    setIsPublishing(true);
    try {
      const formData = new FormData();
      formData.append('media_type', mode === 'text' ? 'text' : selectedFile?.type.startsWith('video') ? 'video' : 'image');

      if (mode === 'text') {
        formData.append('text_content', textContent.trim());
        formData.append('background_color', bgGradient);
        formData.append('font_style', fontStyle);
      } else {
        if (selectedFile) formData.append('media_file', selectedFile);
        if (caption.trim()) formData.append('caption', caption.trim());
      }

      await api.post('/api/status/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Status published successfully! Disappears in 24 hours.', 'success');
      onStoryCreated();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to publish status.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create 24-Hour Status" size="md">
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex bg-nova-dark p-1 rounded-xl border border-nova-border">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'text' ? 'bg-nova-card text-white shadow-md' : 'text-nova-muted hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Text Status
          </button>
          <button
            type="button"
            onClick={() => setMode('media')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'media' ? 'bg-nova-card text-white shadow-md' : 'text-nova-muted hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Photo / Video
          </button>
        </div>

        {/* Content based on Mode */}
        {mode === 'text' ? (
          <div className="space-y-3">
            {/* Live Canvas Preview */}
            <div
              style={{ background: bgGradient }}
              className="h-56 rounded-2xl flex items-center justify-center p-6 text-center shadow-inner relative overflow-hidden"
            >
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="What's on your mind? Tap to write..."
                style={{ fontFamily: fontStyle }}
                className="w-full bg-transparent text-white text-lg font-bold text-center outline-none resize-none placeholder-white/60 drop-shadow-md"
                rows={3}
                maxLength={200}
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-white/70">
                {textContent.length}/200
              </span>
            </div>

            {/* Gradient Presets */}
            <div>
              <label className="text-[11px] font-semibold text-nova-muted uppercase tracking-wider block mb-1.5">
                Background Gradient
              </label>
              <div className="flex items-center gap-2">
                {GRADIENT_PRESETS.map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    style={{ background: grad }}
                    onClick={() => setBgGradient(grad)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      bgGradient === grad ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-nova-dark' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Font style */}
            <div>
              <label className="text-[11px] font-semibold text-nova-muted uppercase tracking-wider block mb-1.5">
                Typography Font
              </label>
              <div className="flex gap-2">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFontStyle(f)}
                    style={{ fontFamily: f }}
                    className={`px-3 py-1 rounded-xl text-xs capitalize border ${
                      fontStyle === f
                        ? 'bg-nova-primary text-white border-nova-primary'
                        : 'bg-nova-dark text-nova-muted border-nova-border hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative h-60 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-nova-border">
                {selectedFile?.type.startsWith('video') ? (
                  <video src={previewUrl} controls className="max-h-full max-w-full" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs hover:bg-black"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-56 rounded-2xl border-2 border-dashed border-nova-border hover:border-nova-primary bg-nova-dark/60 flex flex-col items-center justify-center cursor-pointer transition-colors p-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-nova-card flex items-center justify-center text-nova-primary mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-white">Click to select photo or video</p>
                <p className="text-[11px] text-nova-muted mt-1">Supports PNG, JPG, MP4 up to 50MB</p>
              </div>
            )}

            <Input
              label="Caption (Optional)"
              type="text"
              placeholder="Add a nice caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end gap-2 pt-2 border-t border-nova-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" isLoading={isPublishing} onClick={handlePublish}>
            <Send className="w-4 h-4 mr-1.5" /> Post Status
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StoryCreatorModal;
