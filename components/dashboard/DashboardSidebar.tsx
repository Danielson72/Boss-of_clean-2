'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { NavBadge } from '@/components/ui/NavBadge';

// Sign out is handled by the /logout server route (full page nav, no JS needed)

export interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
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
      <div className="p-4 border-b border-brand-gold/20">
        <p className="text-sm font-semibold text-brand-cream truncate">{userName}</p>
        <p className="text-xs text-brand-cream/60 truncate">{userEmail}</p>
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
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                active
                  ? 'bg-brand-gold/15 text-brand-gold'
                  : 'text-brand-cream/80 hover:bg-white/5 hover:text-brand-cream'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {link.label}
              <NavBadge
                count={link.badge}
                ariaLabel={link.badge ? `${link.badge} ${link.label} need attention` : undefined}
                className="absolute top-1 right-2"
              />
            </Link>
          );
        })}
      </nav>

      {/* Sign Out — plain <a> to server route, no client JS needed */}
      <div className="p-2 border-t border-brand-gold/20">
        <a
          href="/logout"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-brand-cream/70 hover:bg-red-500/15 hover:text-red-300 transition-colors"
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
        className={`md:hidden fixed top-0 left-0 z-[55] h-full w-64 bg-brand-dark border-r border-brand-gold/20 transform transition-transform duration-200 flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button inside sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-brand-gold/20 flex-shrink-0">
          <span className="font-display text-sm font-semibold text-brand-cream">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-brand-cream/60 hover:bg-white/5 hover:text-brand-cream transition-colors"
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
      <aside className="hidden md:block w-64 flex-shrink-0 bg-brand-dark border-r border-brand-gold/20 min-h-[calc(100vh-4rem)]">
        {navContent}
      </aside>
    </>
  );
}
