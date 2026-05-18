'use client';

import { DashboardSidebar, type SidebarLink } from '@/components/dashboard/DashboardSidebar';
import { LayoutDashboard, User, Calendar, Heart, MessageSquare, Bell, HelpCircle } from 'lucide-react';
import { useCustomerSidebarCounts } from '@/lib/hooks/useCustomerSidebarCounts';

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  // DLD-507: unread badges on Messages and Notifications.
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar links={customerLinks} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 px-2 md:px-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
