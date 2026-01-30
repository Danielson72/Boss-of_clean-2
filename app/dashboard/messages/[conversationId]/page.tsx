'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { MessageThread } from '@/components/messaging/MessageThread';
import { MessageInput } from '@/components/messaging/MessageInput';
import { useMessages } from '@/lib/hooks/useMessages';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import type { ConversationDetail } from '@/lib/types/api';

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: PageProps) {
  const { conversationId } = use(params);
  const { user, isCustomer } = useAuth();
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { messages, loading: messagesLoading, addMessage } = useMessages({
    conversationId,
    enabled: !!conversationId && !!user,
  });

  // Fetch conversation details and mark as read
  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/messages/${conversationId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Conversation not found');
          return;
        }

        setConversation(data.conversation);

        // Mark messages as read
        await fetch(`/api/messages/${conversationId}`, {
          method: 'POST',
        });
      } catch {
        setError('Failed to load conversation');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, user]);

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        content,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send message');
    }

    // Optimistic update is handled by real-time subscription
  };

  const getOtherPartyName = () => {
    if (!conversation) return 'Loading...';
    return isCustomer
      ? conversation.cleaner?.business_name || 'Cleaner'
      : conversation.customer?.full_name || 'Customer';
  };

  if (initialLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/dashboard/messages"
              className="text-blue-600 hover:text-blue-700"
            >
              Back to Messages
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 py-4">
              <Link
                href="/dashboard/messages"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">
                    {getOtherPartyName()}
                  </h1>
                  <p className="text-xs text-gray-500">
                    {isCustomer ? 'Cleaning Professional' : 'Customer'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
          <div className="h-full flex flex-col bg-white shadow-sm">
            {/* Message Thread */}
            <MessageThread
              messages={messages}
              isCustomer={isCustomer}
              currentUserId={user?.id || ''}
            />

            {/* Message Input */}
            <MessageInput
              onSend={handleSendMessage}
              placeholder={`Message ${getOtherPartyName()}...`}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
