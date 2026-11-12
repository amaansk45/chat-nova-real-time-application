import React, { useState } from 'react';
import { Globe, ArrowRight, Copy, Check, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface TranslationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
}

const LANGUAGES = [
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'it', name: 'Italian (Italiano)' },
];

export const TranslationPopover: React.FC<TranslationPopoverProps> = ({
  isOpen,
  onClose,
  originalText,
}) => {
  const [targetLang, setTargetLang] = useState('es');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleTranslate = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/ai/translate/', {
        text: originalText,
        target_language: targetLang,
      });
      setTranslatedText(res.data.translated_text || res.data.result || '');
    } catch (err) {
      showToast('Translation service unavailable.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    showToast('Translation copied!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Language Translation" size="sm">
      <div className="space-y-4">
        {/* Source Text Snippet */}
        <div className="p-3 bg-nova-dark/80 border border-nova-border rounded-xl">
          <span className="text-[10px] uppercase font-bold text-nova-muted block mb-1">Original</span>
          <p className="text-xs text-slate-300 italic max-h-20 overflow-y-auto">
            "{originalText}"
          </p>
        </div>

        {/* Target language selector */}
        <div>
          <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1.5">
            Translate into
          </label>
          <div className="flex gap-2">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 bg-nova-dark border border-nova-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nova-primary"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={handleTranslate}
            >
              <Globe className="w-3.5 h-3.5 mr-1" /> Translate
            </Button>
          </div>
        </div>

        {/* Translation Output */}
        {translatedText && (
          <div className="p-3.5 bg-nova-primary/10 border border-nova-primary/30 rounded-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-nova-accent flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Translation Result
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-nova-muted hover:text-white text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-nova-success" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-white font-medium select-text leading-relaxed">
              {translatedText}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TranslationPopover;
