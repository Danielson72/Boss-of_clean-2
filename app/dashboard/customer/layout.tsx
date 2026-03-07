'use client';

import { DashboardSidebar, type SidebarLink } from '@/components/dashboard/DashboardSidebar';
import { LayoutDashboard, Calendar, Heart, MessageSquare, Bell } from 'lucide-react';

const customerLinks: SidebarLink[] = [
  { href: '/dashboard/customer', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/customer/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/dashboard/customer/favorites', label: 'Favorites', icon: Heart },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/customer/notifications', label: 'Notifications', icon: Bell },
];

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar links={customerLinks} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
