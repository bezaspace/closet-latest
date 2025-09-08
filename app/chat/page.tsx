"use client";

import AIChat from '@/components/AIChat';

export default function ChatPage() {
  return (
    // full viewport — Navbar is outside, this fills remaining viewport height
    <div className="h-screen bg-background text-foreground">
      <AIChat />
    </div>
  );
}
