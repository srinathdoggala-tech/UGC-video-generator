'use client';

import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[calc(100vh-2rem)]">
        <ChatInterface />
      </div>
    </div>
  );
}