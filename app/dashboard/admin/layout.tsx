'use client';

import { DashboardSidebar, type SidebarLink } from '@/components/dashboard/DashboardSidebar';
import { LayoutDashboard, BarChart3, Star } from 'lucide-react';

const adminLinks: SidebarLink[] = [
  { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin/reviews', label: 'Reviews', icon: Star },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar links={adminLinks} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
