import React from 'react';
import { Sparkles } from 'lucide-react';

interface SmartReplyPillsProps {
  suggestions: string[];
  onSelectSuggestion: (text: string) => void;
  isLoading?: boolean;
}

export const SmartReplyPills: React.FC<SmartReplyPillsProps> = ({
  suggestions,
  onSelectSuggestion,
  isLoading = false,
}) => {
  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto no-scrollbar bg-nova-dark/60 border-t border-nova-border/50 animate-in fade-in duration-200">
      <div className="flex items-center gap-1 text-[11px] font-bold text-nova-accent flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Nova AI:</span>
      </div>

      {isLoading ? (
        <span className="text-[11px] text-nova-muted italic animate-pulse">
          Generating smart suggestions...
        </span>
      ) : (
        suggestions.map((text, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectSuggestion(text)}
            className="flex-shrink-0 px-3 py-1 rounded-full bg-nova-card hover:bg-nova-primary/20 border border-nova-border hover:border-nova-primary text-xs text-slate-200 hover:text-white transition-all shadow-sm"
          >
            {text}
          </button>
        ))
      )}
    </div>
  );
};

export default SmartReplyPills;
