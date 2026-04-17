'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import Image from 'next/image'
import { X, Send } from 'lucide-react'

const ORANGE = '#FF5F1F'
const OPENING_MESSAGE = "Hi! I'm the Boss of Clean assistant. Ask me anything about how the platform works, our services, or how to get started!"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function BocAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const next: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/boc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || "I'm having trouble responding right now. Please try again or contact us at admin@bossofclean.com.",
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Something went wrong. Please try again or email us at admin@bossofclean.com." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open Boss of Clean Assistant"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 50,
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: ORANGE,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 20px rgba(255,95,31,0.5)`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 28px rgba(255,95,31,0.65)`
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px rgba(255,95,31,0.5)`
        }}
      >
        <Image src="/boss-of-clean-logo.png" alt="BOC" width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover' }} />
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.5rem',
            zIndex: 50,
            width: 'min(400px, calc(100vw - 2rem))',
            height: 'min(520px, calc(100dvh - 8rem))',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <div style={{
            background: ORANGE,
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            flexShrink: 0,
          }}>
            <Image src="/boss-of-clean-logo.png" alt="BOC" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>Boss of Clean Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? ORANGE : '#f3f4f6',
                  color: msg.role === 'user' ? '#fff' : '#111827',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '14px 14px 14px 4px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#9ca3af',
                      display: 'inline-block',
                      animation: `boc-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.85rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                maxHeight: '80px',
                overflowY: 'auto',
                lineHeight: '1.4',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.target.style.borderColor = ORANGE }}
              onBlur={(e) => { e.target.style.borderColor = '#d1d5db' }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: input.trim() && !isLoading ? ORANGE : '#e5e7eb',
                border: 'none',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={15} color={input.trim() && !isLoading ? '#fff' : '#9ca3af'} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes boc-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  )
}
