'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, ChevronLeft, Loader2, Inbox } from 'lucide-react';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const subjectLabels: Record<string, string> = {
  general: 'General Inquiry',
  list_business: 'List My Business',
  customer_support: 'Customer Support',
  partnership: 'Partnership',
  other: 'Other',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  if (diffHours < 48) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ContactMessages() {
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/contact-submissions');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.submissions || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    setMarkingRead(true);
    try {
      const res = await fetch('/api/admin/contact-submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: isRead }),
      });
      if (res.ok) {
        setMessages(prev =>
          prev.map(m => m.id === id ? { ...m, is_read: isRead } : m)
        );
        if (selected?.id === id) {
          setSelected(prev => prev ? { ...prev, is_read: isRead } : null);
        }
      }
    } catch {
      // silent
    } finally {
      setMarkingRead(false);
    }
  };

  const handleSelectMessage = (msg: ContactSubmission) => {
    setSelected(msg);
    if (!msg.is_read) {
      handleMarkRead(msg.id, true);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Detail view
  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to messages
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  {subjectLabels[selected.subject] || selected.subject}
                </CardTitle>
                <CardDescription className="mt-1">
                  From {selected.name} &middot; {formatDate(selected.created_at)}
                </CardDescription>
              </div>
              <Badge variant={selected.is_read ? 'secondary' : 'default'}>
                {selected.is_read ? 'Read' : 'Unread'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Email:</span>{' '}
                <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">
                  {selected.email}
                </a>
              </div>
              {selected.phone && (
                <div>
                  <span className="font-medium text-muted-foreground">Phone:</span>{' '}
                  <a href={`tel:${selected.phone}`} className="text-blue-600 hover:underline">
                    {selected.phone}
                  </a>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.message}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={markingRead}
                onClick={() => handleMarkRead(selected.id, !selected.is_read)}
              >
                {selected.is_read ? (
                  <>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Mark as Unread
                  </>
                ) : (
                  <>
                    <MailOpen className="h-4 w-4 mr-1.5" />
                    Mark as Read
                  </>
                )}
              </Button>
              <Button size="sm" asChild>
                <a href={`mailto:${selected.email}?subject=Re: ${subjectLabels[selected.subject] || selected.subject}`}>
                  Reply via Email
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div>
      {unreadCount > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </p>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No contact form submissions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleSelectMessage(msg)}
              className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                !msg.is_read ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!msg.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${!msg.is_read ? 'font-semibold' : 'font-medium'}`}>
                      {msg.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{msg.email}</span>
                  </div>
                  <p className={`text-sm ${!msg.is_read ? 'font-medium' : ''} text-brand-dark`}>
                    {subjectLabels[msg.subject] || msg.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {msg.message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(msg.created_at)}
                  </span>
                  <Badge variant={msg.is_read ? 'secondary' : 'default'} className="text-[10px]">
                    {msg.is_read ? 'Read' : 'New'}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
