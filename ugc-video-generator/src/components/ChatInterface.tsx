'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[];
}

export function ChatInterface({ initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('Creating your video…');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Dynamic stage progression for confidence and realism
  useEffect(() => {
    if (!isLoading) return;
    setLoadingStage('Analyzing product page…');
    const t1 = setTimeout(() => setLoadingStage('Selecting matched assets and audio…'), 3000);
    const t2 = setTimeout(() => setLoadingStage('Composing 9:16 video layers…'), 7000);
    const t3 = setTimeout(() => setLoadingStage('Finalizing render…'), 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setInput('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: messages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        videoUrl: data.videoUrl,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Could not process request. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleQuickSuggestion = (url: string) => {
    setInput(`https://${url}`);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Format URLs into elegant clickable links
  const renderMessageContent = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-[#9C9B98] hover:decoration-[#18181A] dark:hover:decoration-[#EDEDEC] font-medium transition-colors"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#141416] sm:rounded-3xl sm:border border-[#E8E7E4] dark:border-[#242427] shadow-[0_12px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Header — Understated brand identity */}
      <header className="px-5 sm:px-6 py-3.5 border-b border-[#E8E7E4] dark:border-[#242427] bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          {/* Custom geometric framing aperture mark */}
          <div className="w-6 h-6 rounded-md bg-[#18181A] dark:bg-[#EDEDEC] text-white dark:text-[#141416] flex items-center justify-center flex-shrink-0 shadow-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8V4h4" />
              <path d="M20 8V4h-4" />
              <path d="M4 16v4h4" />
              <path d="M20 16v4h-4" />
            </svg>
          </div>
          <h1 className="text-[13.5px] font-semibold text-[#18181A] dark:text-[#EDEDEC] tracking-[-0.015em]">
            UGC Video Generator
          </h1>
        </div>
      </header>

      {/* Chat & Creative Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[380px] h-full text-center px-4 max-w-md mx-auto animate-message">
            {/* Minimalist 9:16 Viewport Aspect Mark */}
            <div className="w-11 h-11 rounded-2xl bg-[#F2F1EE] dark:bg-[#1C1C1F] border border-[#E4E3DF] dark:border-[#2C2C30] flex items-center justify-center mb-4 text-[#18181A] dark:text-[#EDEDEC] shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
              </svg>
            </div>

            <h2 className="text-[21px] sm:text-[24px] font-semibold text-[#18181A] dark:text-[#EDEDEC] tracking-[-0.025em] leading-[1.2]">
              Generate short-form UGC videos from any product link
            </h2>

            <p className="text-[13.5px] text-[#636261] dark:text-[#8E8D8A] leading-[1.55] mt-2">
              Paste a product URL. The engine extracts key features, arranges pacing hooks, and renders a 9:16 marketing video.
            </p>

            {/* Curated Example Shortcuts */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium tracking-wide text-[#9C9B98] dark:text-[#5E5D5A]">
                Try with an example
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {['calai.app', 'linear.app', 'resend.com'].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleQuickSuggestion(example)}
                    className="px-3 py-1.5 text-[12px] font-mono font-medium text-[#4D4C49] dark:text-[#B5B4B0] bg-[#F2F1EE] dark:bg-[#1C1C1F] hover:bg-[#E8E7E3] dark:hover:bg-[#28282C] border border-[#E4E3DF] dark:border-[#2C2C30] rounded-lg transition-all active:scale-95"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col animate-message ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4.5 py-3 text-[13.5px] sm:text-[14px] leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-[#18181A] text-[#FBFBFA] dark:bg-[#EDEDEC] dark:text-[#0C0C0E] rounded-tr-xs shadow-xs font-normal'
                    : 'bg-[#F5F4F0]/80 dark:bg-[#1C1C1F] text-[#18181A] dark:text-[#EDEDEC] border border-[#E8E7E4] dark:border-[#2A2A2E] rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {renderMessageContent(message.content)}
                </p>

                {/* Hero Video Deliverable with Obvious Action Hierarchy */}
                {message.videoUrl && (
                  <div className="mt-4 pt-4 border-t border-[#E0DFDB] dark:border-[#2E2E32] flex flex-col items-center">
                    <div className="w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-[0_16px_36px_-10px_rgba(0,0,0,0.22)] border border-black/10 dark:border-white/10 relative">
                      <video
                        src={message.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <a
                      href={message.videoUrl}
                      download="ugc-video.mp4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full max-w-[280px] py-2.5 px-4 rounded-xl bg-[#18181A] text-white dark:bg-[#EDEDEC] dark:text-[#0C0C0E] text-[12.5px] font-medium hover:opacity-90 active:scale-98 transition-all shadow-xs"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Video (.mp4)
                    </a>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-[#9C9B98] dark:text-[#5E5D5A] mt-1 px-1 select-none">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-start animate-message">
            <div className="bg-[#F5F4F0]/80 dark:bg-[#1C1C1F] border border-[#E8E7E4] dark:border-[#2A2A2E] rounded-2xl rounded-tl-xs px-4.5 py-3.5 max-w-[85%] flex items-center gap-3 shadow-xs">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18181A] dark:bg-[#EDEDEC] animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#18181A] dark:bg-[#EDEDEC] animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#18181A] dark:bg-[#EDEDEC] animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-[12.5px] font-medium text-[#4D4C49] dark:text-[#B5B4B0]">
                {loadingStage}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/30 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
          <p className="text-rose-700 dark:text-rose-300 text-xs font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Instrument — Centerpiece */}
      <footer className="p-3.5 sm:p-4 border-t border-[#E8E7E4] dark:border-[#242427] bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-end gap-2 bg-[#F7F6F3] dark:bg-[#18181B] border border-[#DCDAD5] dark:border-[#2B2B30] focus-within:border-[#18181A] dark:focus-within:border-[#EDEDEC] focus-within:ring-2 focus-within:ring-black/[0.03] dark:focus-within:ring-white/[0.03] rounded-2xl p-1.5 sm:p-2 transition-all shadow-xs">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Paste product URL (e.g. https://resend.com) or say hello…"
              className="flex-1 px-2.5 py-1.5 bg-transparent text-[#18181A] dark:text-[#EDEDEC] placeholder-[#9C9B98] dark:placeholder-[#5E5D5A] resize-none text-[13.5px] sm:text-sm leading-relaxed focus:outline-none max-h-32 min-h-[38px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#18181A] dark:bg-[#EDEDEC] text-white dark:text-[#141416] flex items-center justify-center hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 shadow-xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}