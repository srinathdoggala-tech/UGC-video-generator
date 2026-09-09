'use client';

import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-[100dvh] w-full bg-[#0c0c0e] text-[#ededec] flex flex-col items-center justify-center selection:bg-white/20">
      <div className="w-full max-w-4xl h-[100dvh] flex flex-col">
        <ChatInterface />
      </div>
    </main>
  );
}