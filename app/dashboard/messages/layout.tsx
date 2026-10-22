'use client';

import { DashboardSidebar, type SidebarLink } from '@/components/dashboard/DashboardSidebar';
import {
  LayoutDashboard, User, Calendar, Heart, MessageSquare, Bell, HelpCircle,
  FileText, DollarSign, Clock, Images, Star, MapPin, CreditCard, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { usePendingDocumentActions } from '@/lib/hooks/usePendingDocumentActions';
import { useProSidebarCounts } from '@/lib/hooks/useProSidebarCounts';
import { useCustomerSidebarCounts } from '@/lib/hooks/useCustomerSidebarCounts';

// DLD-508: /dashboard/messages and /dashboard/messages/[conversationId] had no
// layout, so the dashboard sidebar disappeared the moment a user clicked into a
// conversation — only a "Back" button remained. The pro and customer dashboards
// each own a layout, but neither covers the shared /dashboard/messages subtree.
//
// This layout restores the sidebar by picking the role-appropriate link set.
// The link arrays mirror app/dashboard/{pro,customer}/layout.tsx (including the
// DLD-507 unread badges) so the Messages routes show the exact same sidebar the
// rest of the dashboard does. The arrays are intentionally duplicated rather
// than extracted to a shared module — they're short and keeping them local
// makes role-specific sidebar changes obvious. If this trio starts changing in
// lockstep, extract to lib/dashboard/sidebarLinks.ts in a follow-up.

// Sidebar-only components. Split by role so a customer never runs the pro count
// queries and vice versa (hooks can't be called conditionally in one component).
function ProSidebar() {
  const { rejectedCount } = usePendingDocumentActions();
  const { unreadMessages, unreadNotifications, pendingLeads } = useProSidebarCounts();

  const proLinks: SidebarLink[] = [
    { href: '/dashboard/pro', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/pro/profile', label: 'My Profile', icon: User },
    { href: '/dashboard/pro/documents', label: 'Documents', icon: ShieldCheck, badge: rejectedCount },
    { href: '/dashboard/pro/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { href: '/dashboard/pro/quote-requests', label: 'Quote Requests', icon: FileText, badge: pendingLeads },
    { href: '/dashboard/pro/bookings', label: 'Bookings', icon: Calendar },
    { href: '/dashboard/pro/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/dashboard/pro/availability', label: 'Availability', icon: Clock },
    { href: '/dashboard/pro/portfolio', label: 'Portfolio', icon: Images },
    { href: '/dashboard/pro/reviews', label: 'Reviews', icon: Star },
    { href: '/dashboard/pro/service-areas', label: 'Service Areas', icon: MapPin },
    { href: '/dashboard/pro/billing', label: 'Billing', icon: CreditCard },
  ];

  return <DashboardSidebar links={proLinks} />;
}

function CustomerSidebar() {
  const { unreadMessages, unreadNotifications } = useCustomerSidebarCounts();

  const customerLinks: SidebarLink[] = [
    { href: '/dashboard/customer', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/customer/profile', label: 'Profile', icon: User },
    { href: '/dashboard/customer/bookings', label: 'My Bookings', icon: Calendar },
    { href: '/dashboard/customer/favorites', label: 'Favorites', icon: Heart },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { href: '/dashboard/customer/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { href: '/dashboard/customer/help', label: 'Help', icon: HelpCircle },
  ];

  return <DashboardSidebar links={customerLinks} />;
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { isCustomer } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {isCustomer ? <CustomerSidebar /> : <ProSidebar />}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 px-2 md:px-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
