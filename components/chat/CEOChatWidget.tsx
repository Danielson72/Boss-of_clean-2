'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const LOCAL_STORAGE_KEY = 'boc_chat_rate';
const MAX_MESSAGES_PER_HOUR = 20;

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('boc_chat_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('boc_chat_session', id);
  }
  return id;
}

function getLocalCount(): { count: number; windowStart: number } {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { count: 0, windowStart: Date.now() };
    return JSON.parse(raw);
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function incrementLocalCount() {
  const { count, windowStart } = getLocalCount();
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const newWindowStart = windowStart < hourAgo ? Date.now() : windowStart;
  const newCount = windowStart < hourAgo ? 1 : count + 1;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ count: newCount, windowStart: newWindowStart }));
  return newCount;
}

function isLocalRateLimited(): boolean {
  const { count, windowStart } = getLocalCount();
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (windowStart < hourAgo) return false;
  return count >= MAX_MESSAGES_PER_HOUR;
}

export default function CEOChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: "Meow! 🐱 I'm Purrfection, your Boss of Clean assistant. How can I help you find the purrfect cleaning service today?",
        },
      ]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (isLocalRateLimited()) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: 'You have reached the hourly message limit. Please try again in an hour! 🐾' },
      ]);
      setInput('');
      return;
    }

    const userMessage: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    incrementLocalCount();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          sessionId: getSessionId(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat with Purrfection Assistant"
        className="fixed bottom-6 right-6 z-50 w-[60px] h-[60px] rounded-full shadow-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 animate-pulse-slow"
        style={{ padding: 0 }}
      >
        <Image
          src="/images/ceo-cat-hero.png"
          alt="CEO Cat"
          width={60}
          height={60}
          className="object-cover w-full h-full"
          priority
        />
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-[84px] right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300"
          style={{ width: 'clamp(320px, 90vw, 380px)', height: '560px' }}
          role="dialog"
          aria-label="Purrfection Assistant chat"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-700 text-white flex-shrink-0">
            <Image
              src="/images/ceo-cat-hero.png"
              alt=""
              width={36}
              height={36}
              className="rounded-full object-cover border-2 border-white"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-none">Purrfection Assistant</p>
              <p className="text-xs text-emerald-200 mt-0.5">Boss of Clean AI</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 rounded-full hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-3 py-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-200 bg-white flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Purrfection anything…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent max-h-[96px] overflow-y-auto"
              style={{ lineHeight: '1.4' }}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex-shrink-0 p-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(5, 150, 105, 0); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
