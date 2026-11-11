import React from 'react';
import { clsx } from 'clsx';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={clsx(
        "animate-pulse bg-slate-800/60 rounded-xl",
        className
      )}
    />
  );
};

export const ChatItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-nova-card/40 border border-nova-border/30 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="w-28 h-4 rounded bg-slate-800" />
          <div className="w-12 h-3 rounded bg-slate-800" />
        </div>
        <div className="w-40 h-3 rounded bg-slate-800/60" />
      </div>
    </div>
  );
};

export const MessageBubbleSkeleton: React.FC<{ isMe?: boolean }> = ({ isMe = false }) => {
  return (
    <div className={clsx("flex items-end gap-2.5 my-2 animate-pulse", isMe ? "justify-end" : "justify-start")}>
      {!isMe && <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />}
      <div className={clsx("h-12 rounded-2xl p-3 flex flex-col gap-1.5", isMe ? "w-48 bg-blue-900/30" : "w-56 bg-slate-800/50")}>
        <div className="w-full h-3 rounded bg-slate-700/60" />
        <div className="w-2/3 h-2.5 rounded bg-slate-700/40" />
      </div>
    </div>
  );
};

export default Skeleton;
