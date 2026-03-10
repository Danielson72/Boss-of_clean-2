'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';

// Sign out is handled by the /logout server route (full page nav, no JS needed)

export interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardSidebarProps {
  links: SidebarLink[];
}

export function DashboardSidebar({ links }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  const isActive = (href: string) => {
    if (href === pathname) return true;
    // For non-overview links, check if current path starts with the link href
    const isOverview = links[0]?.href === href;
    if (!isOverview && pathname.startsWith(href + '/')) return true;
    return false;
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="p-4 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
        <p className="text-xs text-gray-500 truncate">{userEmail}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                active
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out — plain <a> to server route, no client JS needed */}
      <div className="p-2 border-t border-gray-200">
        <a
          href="/logout"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button — only visible when sidebar is closed */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-[4.5rem] left-4 z-[60] bg-white shadow-md rounded-lg p-2 border border-gray-200"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55] bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-[55] h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button inside sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-900">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {navContent}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
        {navContent}
      </aside>
    </>
  );
}
