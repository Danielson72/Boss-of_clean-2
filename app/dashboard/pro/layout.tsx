'use client';

import { DashboardSidebar, type SidebarLink } from '@/components/dashboard/DashboardSidebar';
import {
  LayoutDashboard, User, FileText, Calendar,
  DollarSign, Clock, Images, Star, MapPin, CreditCard, Bell, MessageSquare,
  ShieldCheck, Lock,
} from 'lucide-react';
import { usePendingDocumentActions } from '@/lib/hooks/usePendingDocumentActions';
import { useProSidebarCounts } from '@/lib/hooks/useProSidebarCounts';

export default function ProDashboardLayout({ children }: { children: React.ReactNode }) {
  const { rejectedCount } = usePendingDocumentActions();
  // DLD-507: unread badges on Messages, Notifications, and Leads.
  const { unreadMessages, unreadNotifications, pendingLeads, actionNeededLeads } = useProSidebarCounts();

  const proLinks: SidebarLink[] = [
    { href: '/dashboard/pro', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/pro/profile', label: 'My Profile', icon: User },
    { href: '/dashboard/pro/documents', label: 'Documents', icon: ShieldCheck, badge: rejectedCount },
    { href: '/dashboard/pro/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { href: '/dashboard/pro/quote-requests', label: 'Quote Requests', icon: FileText, badge: pendingLeads },
    { href: '/dashboard/pro/leads', label: 'Action Needed', icon: Lock, badge: actionNeededLeads },
    { href: '/dashboard/pro/bookings', label: 'Bookings', icon: Calendar },
    { href: '/dashboard/pro/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/dashboard/pro/availability', label: 'Availability', icon: Clock },
    { href: '/dashboard/pro/portfolio', label: 'Portfolio', icon: Images },
    { href: '/dashboard/pro/reviews', label: 'Reviews', icon: Star },
    { href: '/dashboard/pro/service-areas', label: 'Service Areas', icon: MapPin },
    { href: '/dashboard/pro/billing', label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar links={proLinks} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 px-2 md:px-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
