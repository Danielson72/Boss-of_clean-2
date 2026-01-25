'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface UseMessagesOptions {
  conversationId: string;
  enabled?: boolean;
}

export function useMessages({ conversationId, enabled = true }: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch messages');
        return;
      }

      setMessages(data.messages || []);
    } catch {
      setError('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !enabled) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, supabase]);

  // Add message locally (optimistic update)
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    addMessage,
  };
}

// Hook for conversation list with unread updates
export function useConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const supabase = createClient();

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/messages');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch conversations');
        return;
      }

      setConversations(data.conversations || []);
      setTotalUnread(
        (data.conversations || []).reduce(
          (sum: number, c: any) => sum + (c.unreadCount || 0),
          0
        )
      );
    } catch {
      setError('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Refetch on any conversation change
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch when new message arrives
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    totalUnread,
    refetch: fetchConversations,
  };
}
