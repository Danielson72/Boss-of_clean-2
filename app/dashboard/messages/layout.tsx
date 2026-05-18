'use client';

import { DashboardSidebar, type SidebarLink } from '@/components/dashboard/DashboardSidebar';
import { useAuth } from '@/lib/context/AuthContext';
import {
  LayoutDashboard, User, Calendar, Heart, MessageSquare, Bell, HelpCircle,
  Inbox, FileText, DollarSign, Clock, Images, Star, MapPin, CreditCard, ShieldCheck,
} from 'lucide-react';

// DLD-508: /dashboard/messages and /dashboard/messages/[conversationId]
// previously had no layout, so the dashboard sidebar disappeared the moment
// the user clicked into a conversation. This layout restores the sidebar by
// picking the appropriate set of links based on the signed-in user's role.
//
// Link arrays intentionally duplicated from app/dashboard/{pro,customer}/layout.tsx
// instead of factoring into a shared module — the lists are short and the
// duplication makes role-specific sidebar changes locally obvious. If this
// trio grows in lockstep, extract to `lib/dashboard/sidebarLinks.ts`.

const customerLinks: SidebarLink[] = [
  { href: '/dashboard/customer', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/customer/profile', label: 'Profile', icon: User },
  { href: '/dashboard/customer/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/dashboard/customer/favorites', label: 'Favorites', icon: Heart },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/customer/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/customer/help', label: 'Help', icon: HelpCircle },
];

const proLinks: SidebarLink[] = [
  { href: '/dashboard/pro', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/pro/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/pro/documents', label: 'Documents', icon: ShieldCheck },
  { href: '/dashboard/pro/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/pro/leads', label: 'Leads', icon: Inbox },
  { href: '/dashboard/pro/quote-requests', label: 'Quote Requests', icon: FileText },
  { href: '/dashboard/pro/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/pro/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/dashboard/pro/availability', label: 'Availability', icon: Clock },
  { href: '/dashboard/pro/portfolio', label: 'Portfolio', icon: Images },
  { href: '/dashboard/pro/reviews', label: 'Reviews', icon: Star },
  { href: '/dashboard/pro/service-areas', label: 'Service Areas', icon: MapPin },
  { href: '/dashboard/pro/billing', label: 'Billing', icon: CreditCard },
];

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { isCustomer } = useAuth();
  const links = isCustomer ? customerLinks : proLinks;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar links={links} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 px-2 md:px-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
