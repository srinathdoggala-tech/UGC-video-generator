'use client';

import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[#fbfbfa] dark:bg-[#0c0c0e] flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 transition-colors duration-200">
      <div className="w-full max-w-[800px] h-[100dvh] sm:h-[calc(100dvh-2rem)] md:h-[calc(100dvh-3rem)] flex flex-col">
        <ChatInterface />
      </div>
    </main>
  );
}