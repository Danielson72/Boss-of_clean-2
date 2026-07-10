'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin } from 'lucide-react';

// Public-page routes where the bar makes sense; everything auth'd or
// flow-specific is excluded. The David widget button sits at bottom-6
// right-6 z-50; this bar is z-40 with its content padded clear of that
// corner, so the two never fight for taps.
const HIDDEN_PREFIXES = ['/dashboard', '/login', '/signup', '/quote-request', '/logout', '/auth'];

export default function StickyMobileCta() {
  const router = useRouter();
  const pathname = usePathname();
  const [zip, setZip] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Appear after the user scrolls past the hero fold.
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  const go = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (zip) params.set('zip', zip);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={go}
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-dark/95 backdrop-blur border-t border-brand-gold/20 px-3 py-2.5 pr-24 flex items-center gap-2 transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP Code"
          maxLength={5}
          pattern="[0-9]*"
          inputMode="numeric"
          aria-label="ZIP Code"
          className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white rounded-xl text-brand-dark text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
        />
      </div>
      <button
        type="submit"
        className="bg-brand-gold hover:bg-brand-gold-light text-white px-5 py-2.5 min-h-[44px] rounded-xl font-semibold text-base whitespace-nowrap"
      >
        Find Pros
      </button>
    </form>
  );
}
