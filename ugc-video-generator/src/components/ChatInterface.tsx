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

  // Dynamic loading stage text for realism and confidence
  useEffect(() => {
    if (!isLoading) return;
    setLoadingStage('Extracting product details…');
    const t1 = setTimeout(() => setLoadingStage('Selecting matched assets and audio…'), 3000);
    const t2 = setTimeout(() => setLoadingStage('Composing 4-layer 9:16 video…'), 7000);
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

    // Reset textarea height
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

  const handleReset = () => {
    if (confirm('Clear conversation and start fresh?')) {
      setMessages([]);
      setError(null);
    }
  };

  // Format text containing links into clickable spans
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
            className="underline underline-offset-2 decoration-neutral-400 hover:decoration-neutral-900 dark:hover:decoration-neutral-100 font-medium transition-colors"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#121214] sm:rounded-3xl sm:border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden">
      {/* Header */}
      <header className="px-5 sm:px-6 py-3.5 border-b border-neutral-200/70 dark:border-neutral-800/80 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center flex-shrink-0 shadow-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              UGC Video Generator
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Ready
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="text-[12px] font-medium text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 px-2.5 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Start new conversation"
          >
            New chat
          </button>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[380px] h-full text-center px-4 max-w-md mx-auto animate-message">
            {/* Minimalist Visual Mark */}
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center mb-4 text-neutral-800 dark:text-neutral-200 shadow-xs">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Turn any product URL into a UGC video
            </h2>

            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2">
              Paste any product link. We extract core features, structure high-retention marketing hooks, and render a ready-to-post 9:16 video.
            </p>

            {/* Subtle Example Shortcuts */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Try an example
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {['calai.app', 'linear.app', 'supabase.com'].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleQuickSuggestion(example)}
                    className="px-3 py-1.5 text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100/90 dark:bg-neutral-800/90 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 border border-neutral-200/80 dark:border-neutral-700/80 rounded-lg transition-all active:scale-95"
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
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4.5 py-3 text-[14px] leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 rounded-tr-sm shadow-xs font-normal'
                    : 'bg-neutral-50 dark:bg-neutral-850/80 text-neutral-900 dark:text-neutral-100 border border-neutral-200/70 dark:border-neutral-800 rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {renderMessageContent(message.content)}
                </p>

                {/* Hero Video Deliverable */}
                {message.videoUrl && (
                  <div className="mt-4 pt-4 border-t border-neutral-200/60 dark:border-neutral-700/60 flex flex-col items-center">
                    <div className="w-full max-w-[280px] aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-md border border-neutral-200/80 dark:border-neutral-700/80 relative">
                      <video
                        src={message.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="w-full max-w-[280px] mt-3 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        9:16 UGC Render
                      </span>
                      <a
                        href={message.videoUrl}
                        download="ugc-video.mp4"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-900 dark:text-neutral-100 hover:underline underline-offset-2"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download .mp4
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 px-1 select-none">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-start animate-message">
            <div className="bg-neutral-50 dark:bg-neutral-850/80 border border-neutral-200/70 dark:border-neutral-800 rounded-2xl rounded-tl-sm px-4.5 py-3.5 max-w-[85%] flex items-center gap-3 shadow-xs">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100 animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100 animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
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

      {/* Input Box — Tactile Centerpiece */}
      <footer className="p-3.5 sm:p-4 border-t border-neutral-200/70 dark:border-neutral-800/80 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-end gap-2 bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-750 focus-within:border-neutral-900 dark:focus-within:border-neutral-300 focus-within:ring-1 focus-within:ring-neutral-900/5 dark:focus-within:ring-white/5 rounded-2xl p-1.5 sm:p-2 transition-all shadow-xs">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Paste a product URL or describe a product…"
              className="flex-1 px-2.5 py-1.5 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 resize-none text-[13.5px] sm:text-sm leading-relaxed focus:outline-none max-h-32 min-h-[38px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 shadow-xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            <span className="hidden sm:inline">Press <kbd className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px] border border-neutral-200 dark:border-neutral-700">↵ Enter</kbd> to submit</span>
            <span className="text-[10.5px] sm:text-[11px] mx-auto sm:mx-0">4-layer UGC composition • 9:16 vertical</span>
          </div>
        </form>
      </footer>
    </div>
  );
}