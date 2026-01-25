'use client';

import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Conversation {
  id: string;
  customer_id: string;
  cleaner_id: string;
  last_message_at: string | null;
  customer: {
    id: string;
    full_name: string;
    email: string;
  };
  cleaner: {
    id: string;
    business_name: string;
    user_id: string;
  };
  lastMessage: {
    content: string;
    sender_role: string;
    created_at: string;
  } | null;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  isCustomer: boolean;
  activeConversationId?: string;
}

export function ConversationList({
  conversations,
  isCustomer,
  activeConversationId,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
        <p className="text-gray-600 text-sm max-w-sm">
          {isCustomer
            ? "Start a conversation by messaging a cleaner from their profile page."
            : "Customer messages will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conv) => {
        const otherParty = isCustomer ? conv.cleaner.business_name : conv.customer.full_name;
        const isActive = conv.id === activeConversationId;

        return (
          <Link
            key={conv.id}
            href={`/dashboard/messages/${conv.id}`}
            className={`block p-4 hover:bg-gray-50 transition ${
              isActive ? 'bg-blue-50 border-l-4 border-blue-600' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {otherParty}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-600 text-white rounded-full">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className={`text-sm truncate mt-1 ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessage.sender_role === (isCustomer ? 'customer' : 'cleaner')
                      ? 'You: '
                      : ''}
                    {conv.lastMessage.content}
                  </p>
                )}
              </div>
              {conv.last_message_at && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatTimeAgo(conv.last_message_at)}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
