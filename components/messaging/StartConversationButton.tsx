'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, X, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

interface StartConversationButtonProps {
  cleanerId: string;
  cleanerName: string;
}

export function StartConversationButton({ cleanerId, cleanerName }: StartConversationButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleClick = () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/auth/signin?redirect=/cleaner/${cleanerId}`);
      return;
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
    setError('');
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanerId,
          content: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send message');
        return;
      }

      // Redirect to conversation
      router.push(`/dashboard/messages/${data.conversationId}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full mt-3 border border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium flex items-center justify-center gap-2"
      >
        <MessageSquare className="h-5 w-5" />
        Send Message
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Message {cleanerName}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi, I'm interested in your cleaning services..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={sending}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleClose}
                disabled={sending}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
