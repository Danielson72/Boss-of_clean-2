'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { detectPlatform, getDeferredPrompt, subscribeInstall } from '@/lib/pwa/install';

// z-index stack (documented so future widgets stay clear):
//   - David chat launcher/panel: z-50, fixed bottom-right
//   - StickyMobileCta:           z-40, fixed full-width bottom (mobile only)
//   - InstallPrompt (this):      z-[60], fixed TOP banner
// A top banner never shares vertical space with the two bottom-fixed
// widgets, so both remain fully tappable.
//
// The banner is now a thin entry point: it links to /install, where the
// browser/OS-specific steps live (iOS forbids programmatic install in every
// browser, so cramming steps into a banner never worked well).

const DISMISS_KEY = 'boc_pwa_install_dismissed';
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const p = detectPlatform();
      if (p.isStandalone || recentlyDismissed()) {
        setVisible(false);
        return;
      }
      // Install matters on phones; on desktop only show if a real prompt exists.
      const isPhone = p.os === 'ios' || p.os === 'android';
      setVisible(isPhone || getDeferredPrompt() !== null);
    };

    evaluate();
    // A late-firing beforeinstallprompt can bring a desktop user into scope.
    return subscribeInstall(evaluate);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Boss of Clean app"
      className="fixed top-0 inset-x-0 z-[60] bg-[#2563EB] text-white px-3 py-2.5 shadow-md flex items-center gap-3"
      style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
    >
      <span className="text-2xl leading-none" aria-hidden="true">🐱</span>
      <p className="flex-1 min-w-0 text-sm font-semibold leading-snug">
        <span aria-hidden="true">📱</span> Install our app
      </p>

      <Link
        href="/install"
        className="shrink-0 bg-white text-[#2563EB] font-semibold text-sm px-4 py-2 min-h-[40px] flex items-center rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
      >
        How?
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install banner"
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white/90 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white text-xl leading-none"
      >
        &times;
      </button>
    </div>
  );
}
