'use client';

import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[#fafafa] dark:bg-[#09090b] flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 transition-colors duration-200">
      <div className="w-full max-w-3xl h-[100dvh] sm:h-[calc(100dvh-2rem)] md:h-[calc(100dvh-3rem)] flex flex-col">
        <ChatInterface />
      </div>
    </main>
  );
}