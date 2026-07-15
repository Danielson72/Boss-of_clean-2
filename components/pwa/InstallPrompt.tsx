'use client';

import { useEffect, useState } from 'react';

// z-index stack (documented so future widgets stay clear):
//   - David chat launcher/panel: z-50, fixed bottom-right
//   - StickyMobileCta:           z-40, fixed full-width bottom (mobile only)
//   - InstallPrompt (this):      z-[60], fixed TOP banner
// A top banner never shares vertical space with the two bottom-fixed
// widgets, so both remain fully tappable.

const DISMISS_KEY = 'boc_pwa_install_dismissed';
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

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

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS Safari exposes navigator.standalone
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(displayStandalone || iosStandalone);
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // No browser on iOS (Safari, Chrome/CriOS, Firefox/FxiOS, Edge) supports
  // beforeinstallprompt — they all run WebKit. So treat ALL iOS as the
  // manual "Add to Home Screen" case, regardless of which browser.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as "MacIntel"; distinguish from a real Mac via touch.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setShowIosBanner(false);
      setDeferredPrompt(null);
    };

    // iOS never fires beforeinstallprompt (any browser) — show manual steps
    // and DON'T register the prompt listener (the Install button must never
    // appear on iOS). Non-iOS: listen for the real event to drive the button.
    if (isIos()) {
      setShowIosBanner(true);
      setVisible(true);
    } else {
      window.addEventListener('beforeinstallprompt', onBeforeInstall);
    }
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
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
      <div className="flex-1 min-w-0 text-sm">
        {showIosBanner ? (
          <p className="leading-snug">
            <span className="font-semibold">Install Boss of Clean:</span>{' '}
            tap the Share button{' '}
            <span aria-hidden="true">⎋</span>, then &lsquo;Add to Home Screen&rsquo;.
          </p>
        ) : (
          <p className="font-semibold leading-snug">Install the Boss of Clean app</p>
        )}
      </div>

      {!showIosBanner && deferredPrompt && (
        <button
          type="button"
          onClick={install}
          className="shrink-0 bg-white text-[#2563EB] font-semibold text-sm px-4 py-2 min-h-[40px] rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
        >
          Install App
        </button>
      )}

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
