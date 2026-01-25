'use client';

import { useEffect, useRef } from 'react';
import { CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface MessageThreadProps {
  messages: Message[];
  isCustomer: boolean;
  currentUserId: string;
}

export function MessageThread({ messages, isCustomer, currentUserId }: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <p className="text-gray-500">No messages yet</p>
          <p className="text-gray-400 text-sm mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => {
        const isSent = message.sender_id === currentUserId;
        const showDate = shouldShowDate(messages, index);

        return (
          <div key={message.id}>
            {showDate && (
              <div className="flex justify-center my-4">
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  {formatMessageDate(message.created_at)}
                </span>
              </div>
            )}
            <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isSent
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${isSent ? 'text-blue-100' : 'text-gray-400'}`}>
                  <span className="text-xs">{formatTime(message.created_at)}</span>
                  {isSent && message.read_at && (
                    <CheckCheck className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function shouldShowDate(messages: Message[], index: number): boolean {
  if (index === 0) return true;

  const currentDate = new Date(messages[index].created_at).toDateString();
  const prevDate = new Date(messages[index - 1].created_at).toDateString();

  return currentDate !== prevDate;
}

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
