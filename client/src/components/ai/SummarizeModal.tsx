import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface SummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  textToSummarize?: string;
}

export const SummarizeModal: React.FC<SummarizeModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  textToSummarize,
}) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      generateSummary();
    }
  }, [isOpen]);

  const generateSummary = async () => {
    setLoading(true);
    setSummary('');
    try {
      const res = await api.post('/api/ai/summarize/', {
        conversation_id: conversationId,
        text: textToSummarize,
      });
      setSummary(res.data.summary || res.data.result || 'No summary could be generated.');
    } catch (err: any) {
      showToast('Failed to generate summary.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    showToast('Summary copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Conversation Summary" size="md">
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-nova-primary/20 flex items-center justify-center text-nova-accent animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Analyzing Discussion...</h4>
            <p className="text-xs text-nova-muted max-w-xs mx-auto">
              Nova AI is condensing key points, highlights, and action items.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-nova-dark/80 border border-nova-border rounded-2xl max-h-72 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-2 text-nova-accent font-semibold text-xs">
                <FileText className="w-4 h-4" /> Executive Briefing
              </div>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                {summary}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCopy} disabled={!summary}>
                {copied ? <Check className="w-4 h-4 mr-1.5 text-nova-success" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </Button>
              <Button type="button" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SummarizeModal;
