import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Zap,
  ArrowRight,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const PROMPT_STARTERS = [
  {
    title: 'Draft Announcement',
    desc: 'Write a warm release update for my project team.',
    prompt: 'Please draft a clear, encouraging product release announcement for our team.',
  },
  {
    title: 'Summarize Meeting',
    desc: 'Condense recent project notes into 3 clear bullets.',
    prompt: 'Summarize our recent discussion into 3 key takeaways and actionable next steps.',
  },
  {
    title: 'Polish Email Tone',
    desc: 'Transform a casual reply into a polished business note.',
    prompt: 'Help me rewrite this casual message into a professional, polite email response.',
  },
  {
    title: 'Translate Language',
    desc: 'Translate message greetings into 5 languages.',
    prompt: 'Translate the greeting "Welcome to our community!" into Spanish, French, German, Japanese, and Arabic.',
  },
];

export const NovaAIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        "Hello! I'm Nova, your AI conversational assistant. Ask me anything, draft messages, summarize chats, or translate languages.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/ai/chat/', {
        message: textToSend,
      });

      const reply = res.data.response || res.data.message || 'I have processed your request.';
      const assistantMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      showToast('Nova AI assistant encountered an error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        content: "New session started! How can I assist you with your communications today?",
        created_at: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-nova-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nova-primary to-nova-accent p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-nova-card rounded-[14px] flex items-center justify-center text-nova-accent">
                  <Bot className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Nova AI Assistant
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-primary/20 text-nova-accent font-semibold">
                    v2.5
                  </span>
                </h2>
                <p className="text-xs text-nova-muted">Powered by ChatNova Intelligent Communications Engine</p>
              </div>
            </div>

            <button
              onClick={handleResetChat}
              className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-card transition-colors flex items-center gap-1.5 text-xs"
              title="Reset Chat"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4 custom-scrollbar">
            {messages.length === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 animate-in fade-in duration-300">
                {PROMPT_STARTERS.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="p-4 bg-nova-card border border-nova-border rounded-2xl cursor-pointer hover:border-nova-primary/60 transition-all shadow-md group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-nova-accent transition-colors flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-nova-accent" /> {item.title}
                      </h4>
                      <ArrowRight className="w-3.5 h-3.5 text-nova-muted group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-nova-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-nova-primary/20 text-nova-accent flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[80%] sm:max-w-xl p-4 rounded-3xl ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-nova-primary to-blue-600 text-white rounded-br-none shadow-md'
                      : 'bg-nova-card text-slate-100 border border-nova-border rounded-bl-none shadow-md'
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
                    {m.content}
                  </p>

                  {m.sender === 'assistant' && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-nova-border/40 text-[10px] text-nova-muted">
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-nova-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-nova-primary/20 text-nova-accent flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-nova-card border border-nova-border rounded-3xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-nova-accent animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-nova-accent animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-nova-accent animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 p-2 bg-nova-card border border-nova-border rounded-2xl focus-within:border-nova-primary shadow-xl"
            >
              <input
                type="text"
                placeholder="Ask Nova AI anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent px-3 py-1 text-xs sm:text-sm text-white placeholder-nova-muted outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovaAIChatPage;
