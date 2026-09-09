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
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, loadingStep]);

  // Dynamic creation sequence progression
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(1);
      return;
    }
    setLoadingStep(1);
    const t1 = setTimeout(() => setLoadingStep(2), 2500);
    const t2 = setTimeout(() => setLoadingStep(3), 6000);
    const t3 = setTimeout(() => setLoadingStep(4), 10000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading]);

  const handleSubmitText = async (textToSubmit: string) => {
    if (!textToSubmit.trim() || isLoading) return;

    const userText = textToSubmit.trim();
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

  const handleLandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitText(input);
  };

  const handleBottomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitText(input);
  };

  const handleQuickSuggestion = (url: string) => {
    const formatted = `https://${url}`;
    setInput(formatted);
    handleSubmitText(formatted);
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  // Format URLs into clickable links
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
            className="underline underline-offset-4 decoration-[#5e5d5a] hover:decoration-[#ededec] text-[#ededec] transition-colors"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const isLanding = messages.length === 0;

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0e] text-[#ededec] overflow-hidden">
      {/* Pinned Top Navigation */}
      <header className="px-6 sm:px-8 py-5 border-b border-[#242427]/80 flex items-center justify-between z-20 bg-[#0c0c0e]/95 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded border border-[#36363a] flex items-center justify-center text-[#ededec]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8V4h4" />
              <path d="M20 8V4h-4" />
              <path d="M4 16v4h4" />
              <path d="M20 16v4h-4" />
            </svg>
          </div>
          <span className="text-[12px] font-mono font-semibold tracking-widest text-[#ededec] uppercase">
            UGC / Studio
          </span>
        </div>

        <div>
          {isLanding ? (
            <span className="text-[11px] font-mono tracking-widest text-[#5e5d5a] uppercase">
              01 / Create
            </span>
          ) : (
            <button
              onClick={handleReset}
              className="text-[11px] font-mono tracking-wider text-[#8e8d8a] hover:text-[#ededec] px-2.5 py-1 rounded border border-[#242427] hover:border-[#36363a] bg-[#141417] transition-colors uppercase"
            >
              + New Edit
            </button>
          )}
        </div>
      </header>

      {/* STATE A: THE EDITORIAL LANDING CANVAS */}
      {isLanding ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 text-center relative animate-message">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            {/* Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-[64px] font-bold tracking-[-0.04em] leading-[1.02] text-[#ededec] uppercase select-none">
              Turn products<br />
              into short-form<br />
              <span className="text-[#8e8d8a]">culture.</span>
            </h1>

            {/* Subtext */}
            <p className="text-sm sm:text-base text-[#8e8d8a] max-w-md mx-auto leading-relaxed mt-5">
              Paste a product URL. Get a ready-to-use 9:16 UGC video edit with background footage, typography, audio, and reaction elements.
            </p>

            {/* Hero Input Instrument */}
            <form
              onSubmit={handleLandingSubmit}
              className="w-full max-w-xl mt-8"
            >
              <div className="relative flex items-center bg-[#141417] border border-[#2c2c30] hover:border-[#3d3d42] focus-within:border-[#ededec] rounded-2xl p-2 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste a product URL (e.g. https://resend.com)..."
                  className="flex-1 px-4 py-3 bg-transparent text-[#ededec] placeholder-[#5e5d5a] text-sm sm:text-base focus:outline-none"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Generate video"
                  className="w-10 h-10 rounded-xl bg-[#ededec] text-[#0c0c0e] flex items-center justify-center hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Editorial References */}
            <div className="mt-6 flex items-center gap-2 text-[12px] text-[#5e5d5a] font-mono">
              <span className="text-[#5e5d5a]">Try with:</span>
              {['calai.app', 'linear.app', 'resend.com'].map((example) => (
                <button
                  key={example}
                  onClick={() => handleQuickSuggestion(example)}
                  className="text-[#8e8d8a] hover:text-[#ededec] underline underline-offset-4 decoration-[#36363a] hover:decoration-[#ededec] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* STATE B: ACTIVE STUDIO WORKSPACE */
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 space-y-10">
          {messages.map((message) => (
            <div
              key={message.id}
              className="w-full max-w-2xl mx-auto animate-message"
            >
              {message.role === 'user' ? (
                /* User Entry */
                <div className="border-l-2 border-[#36363a] pl-4 py-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#5e5d5a] block mb-1">
                    01 / Input
                  </span>
                  <p className="text-base sm:text-lg font-medium text-[#ededec]">
                    {message.content}
                  </p>
                  <span className="text-[10px] font-mono text-[#5e5d5a] mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                /* Assistant Deliverable */
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#8e8d8a] bg-[#141417] px-2 py-0.5 rounded border border-[#242427]">
                      {message.videoUrl ? 'Your Edit' : 'Studio'}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-[#8e8d8a] leading-relaxed">
                    {renderMessageContent(message.content)}
                  </p>

                  {/* Hero 9:16 Video Deliverable */}
                  {message.videoUrl && (
                    <div className="mt-6 flex flex-col items-center sm:items-start">
                      <div className="w-full max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-[0_24px_60px_rgba(0,0,0,0.7)] border border-white/10 relative">
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
                        className="mt-4 inline-flex items-center justify-center gap-2 w-full max-w-[320px] py-3 px-5 rounded-xl bg-[#ededec] text-[#0c0c0e] hover:bg-white text-xs font-semibold uppercase tracking-wider transition-all active:scale-98 shadow-md"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download Video (.mp4)
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Creation Sequence Loading Feedback */}
          {isLoading && (
            <div className="w-full max-w-2xl mx-auto animate-message">
              <div className="bg-[#141417] border border-[#242427] rounded-2xl p-5 space-y-3 shadow-lg">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8e8d8a] block">
                  Creating Your Edit
                </span>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#ededec]">
                    <span>01 &nbsp;Analyzing product page</span>
                    <span className={loadingStep >= 1 ? 'text-emerald-400 font-bold' : 'text-[#5e5d5a]'}>
                      {loadingStep > 1 ? '✓' : '●'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#ededec]">
                    <span>02 &nbsp;Selecting creative assets</span>
                    <span className={loadingStep >= 2 ? (loadingStep > 2 ? 'text-emerald-400 font-bold' : 'text-emerald-400') : 'text-[#5e5d5a]'}>
                      {loadingStep > 2 ? '✓' : (loadingStep === 2 ? '●' : '—')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#ededec]">
                    <span>03 &nbsp;Composing 9:16 edit</span>
                    <span className={loadingStep >= 3 ? (loadingStep > 3 ? 'text-emerald-400 font-bold' : 'text-emerald-400') : 'text-[#5e5d5a]'}>
                      {loadingStep > 3 ? '✓' : (loadingStep === 3 ? '●' : '—')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#ededec]">
                    <span>04 &nbsp;Finalizing render</span>
                    <span className={loadingStep >= 4 ? 'text-emerald-400' : 'text-[#5e5d5a]'}>
                      {loadingStep === 4 ? '●' : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="px-6 py-3 bg-rose-950/40 border-t border-rose-900/60 flex items-center justify-between text-xs text-rose-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Persistent Bottom Bar in Active Mode */}
      {!isLanding && (
        <footer className="p-4 sm:p-6 border-t border-[#242427]/80 bg-[#0c0c0e]/95 backdrop-blur-md flex-shrink-0">
          <form
            onSubmit={handleBottomSubmit}
            className="w-full max-w-2xl mx-auto"
          >
            <div className="relative flex items-center bg-[#141417] border border-[#2c2c30] hover:border-[#3d3d42] focus-within:border-[#ededec] rounded-2xl p-1.5 sm:p-2 transition-all shadow-md">
              <input
                ref={bottomInputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste another product URL or ask a question..."
                className="flex-1 px-3.5 py-2 bg-transparent text-[#ededec] placeholder-[#5e5d5a] text-sm focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send"
                className="w-9 h-9 rounded-xl bg-[#ededec] text-[#0c0c0e] flex items-center justify-center hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 font-medium"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </form>
        </footer>
      )}
    </div>
  );
}