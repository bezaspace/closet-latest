/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import { useBasket } from '@/lib/basket-context';

type Message = { id: string; role: 'user'|'ai'; text?: string; products?: any[] };

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { add } = useBasket();

  useEffect(() => {
    // initial prompt from AI to start conversation
    setMessages([{ id: 'm0', role: 'ai', text: 'Hi — what are you looking for today? (party, dinner, date night, etc.)' }]);
  }, []);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text: input };
    setMessages((s) => [...s, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input }) });
      const data = await res.json();
      const aiMsg: Message = { id: `a_${Date.now()}`, role: 'ai', text: data.modelText || '' , products: data.products || [] };
      setMessages((s) => [...s, aiMsg]);
    } catch (err) {
      setMessages((s) => [...s, { id: `a_err_${Date.now()}`, role: 'ai', text: 'Sorry — something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full h-[calc(100vh-64px)]"> {/* subtract navbar height if present */}
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-bold">Style Guide Chat</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.text && <div className={`inline-block p-3 rounded ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{m.text}</div>}
            {m.products && m.products.length > 0 && (
              <div className="mt-2 overflow-x-auto flex gap-3 py-3">
                {m.products.map((p: any) => (
                  <div key={p.id} className="flex-none w-64">
                    <ProductCard product={p} onAdd={() => add(p)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t bg-background sticky bottom-0">
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 input input-bordered" placeholder="Ask for shirts, pants, accessories..." />
          <button onClick={send} disabled={loading} className="btn btn-primary">{loading ? '...' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
