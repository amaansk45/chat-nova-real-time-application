import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, Wand2, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface WritingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  onApplyText: (enhancedText: string) => void;
}

type WritingAction = 'grammar' | 'professional' | 'friendly' | 'shorten' | 'expand';

export const WritingAssistantModal: React.FC<WritingAssistantModalProps> = ({
  isOpen,
  onClose,
  initialText,
  onApplyText,
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [enhancedText, setEnhancedText] = useState('');
  const [activeAction, setActiveAction] = useState<WritingAction>('grammar');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleEnhance = async (action: WritingAction) => {
    setActiveAction(action);
    if (!inputText.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post('/api/ai/writing-assistant/', {
        text: inputText,
        action,
      });
      setEnhancedText(res.data.enhanced_text || res.data.result || inputText);
    } catch (err) {
      showToast('Writing assistant service temporarily unavailable.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!enhancedText) return;
    onApplyText(enhancedText);
    onClose();
    showToast('Applied enhanced text to your message!', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Writing Assistant & Polish" size="lg">
      <div className="space-y-4">
        {/* Action presets */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'grammar', label: 'Fix Grammar & Polish' },
            { id: 'professional', label: 'Make Professional' },
            { id: 'friendly', label: 'Make Friendly' },
            { id: 'shorten', label: 'Shorten & Condense' },
            { id: 'expand', label: 'Expand with Detail' },
          ].map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => handleEnhance(act.id as WritingAction)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeAction === act.id
                  ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                  : 'bg-nova-dark text-nova-muted hover:text-white border border-nova-border'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              {act.label}
            </button>
          ))}
        </div>

        {/* Input Textarea */}
        <div>
          <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1">
            Your Original Text
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            className="w-full bg-nova-dark border border-nova-border rounded-xl p-3 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary resize-none custom-scrollbar"
          />
        </div>

        {/* Output Area */}
        <div>
          <label className="text-xs font-semibold text-nova-accent uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Nova AI Suggestion
          </label>
          <div className="min-h-24 p-3 bg-nova-card border border-nova-primary/30 rounded-xl relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-nova-muted animate-pulse">
                Polishing your text...
              </div>
            ) : enhancedText ? (
              <p className="text-xs text-white select-text leading-relaxed whitespace-pre-wrap">
                {enhancedText}
              </p>
            ) : (
              <p className="text-xs text-nova-muted italic py-6 text-center">
                Select an enhancement action above to generate suggestions.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-nova-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            disabled={!enhancedText || isLoading}
          >
            <Check className="w-4 h-4 mr-1.5" /> Apply to Message
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default WritingAssistantModal;
