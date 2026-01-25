'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { ConversationList } from '@/components/messaging/ConversationList';
import { useConversations } from '@/lib/hooks/useMessages';
import { MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MessagesPage() {
  const { user, isCustomer } = useAuth();
  const { conversations, loading, error } = useConversations();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 py-6">
              <Link
                href={isCustomer ? '/dashboard/customer' : '/dashboard/cleaner'}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="text-sm text-gray-600">
                  {isCustomer
                    ? 'Communicate with cleaners'
                    : 'Respond to customer inquiries'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                isCustomer={isCustomer}
              />
            )}
          </div>

          {/* Help text */}
          {!loading && conversations.length === 0 && isCustomer && (
            <div className="mt-6 text-center">
              <Link
                href="/search"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse cleaners to start a conversation
              </Link>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
