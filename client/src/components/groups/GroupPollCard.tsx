import React, { useState } from 'react';
import { BarChart2, CheckCircle2, Circle } from 'lucide-react';
import { Poll } from '../../types';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface GroupPollCardProps {
  poll: Poll;
  onVoteUpdated?: (updatedPoll: Poll) => void;
}

export const GroupPollCard: React.FC<GroupPollCardProps> = ({ poll, onVoteUpdated }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const { showToast } = useToast();

  const handleVote = async (optionId: string) => {
    if (poll.is_closed || isVoting) return;

    setIsVoting(true);
    try {
      const res = await api.post(`/api/groups/polls/${poll.id}/vote/`, {
        option_id: optionId,
      });
      setSelectedOptionId(optionId);
      onVoteUpdated?.(res.data);
      showToast('Vote recorded!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to submit vote.', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  const totalVotes = poll.total_votes || 1;

  return (
    <div className="p-4 bg-nova-dark/80 border border-nova-border rounded-2xl max-w-sm space-y-3 select-none">
      <div className="flex items-center gap-2 text-nova-accent font-semibold text-xs">
        <BarChart2 className="w-4 h-4" /> Group Poll
      </div>

      <h4 className="text-sm font-bold text-white leading-snug">{poll.question}</h4>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const percent = Math.round((opt.votes_count / (poll.total_votes || 1)) * 100);

          return (
            <div
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              className={`group relative p-2.5 rounded-xl border cursor-pointer overflow-hidden transition-all ${
                opt.has_voted
                  ? 'border-nova-primary bg-nova-primary/10'
                  : 'border-nova-border hover:border-slate-500 bg-nova-card/60'
              }`}
            >
              {/* Progress background bar */}
              <div
                style={{ width: `${percent}%` }}
                className="absolute inset-y-0 left-0 bg-nova-primary/20 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {opt.has_voted ? (
                    <CheckCircle2 className="w-4 h-4 text-nova-accent flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-nova-muted flex-shrink-0" />
                  )}
                  <span className="font-medium text-white">{opt.text}</span>
                </div>
                <span className="text-[11px] font-bold text-nova-muted">
                  {percent}% ({opt.votes_count})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-nova-muted pt-1">
        <span>{poll.total_votes} total votes</span>
        <span>{poll.is_multiple_choice ? 'Multiple answers allowed' : 'Select one'}</span>
      </div>
    </div>
  );
};

export default GroupPollCard;
