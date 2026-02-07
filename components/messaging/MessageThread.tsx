'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, Flag, MoreVertical } from 'lucide-react';

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

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
];

export function MessageThread({ messages, isCustomer, currentUserId }: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  async function handleReport(messageId: string, reason: string) {
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/messages/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reason }),
      });
      if (res.ok) {
        setReportSuccess(messageId);
        setTimeout(() => setReportSuccess(null), 3000);
      }
    } finally {
      setReportSubmitting(false);
      setReportingMessageId(null);
      setMenuOpenId(null);
    }
  }

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
            <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} group`}>
              <div className="relative">
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

                {/* Report button for received messages */}
                {!isSent && reportSuccess !== message.id && (
                  <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === message.id ? null : message.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {menuOpenId === message.id && (
                      <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => {
                            setReportingMessageId(message.id);
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Report
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Report success indicator */}
                {reportSuccess === message.id && (
                  <div className="absolute -right-20 top-1 text-xs text-green-600">
                    Reported
                  </div>
                )}

                {/* Report reason dialog */}
                {reportingMessageId === message.id && (
                  <div className="absolute left-0 top-full mt-2 bg-white border rounded-lg shadow-lg z-20 p-3 min-w-[200px]">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Why are you reporting this?</p>
                    <div className="space-y-1">
                      {REPORT_REASONS.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          disabled={reportSubmitting}
                          onClick={() => handleReport(message.id, r.value)}
                          className="block w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportingMessageId(null)}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
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
