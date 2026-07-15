'use client';

// PWA install helpers — platform detection + a shared beforeinstallprompt
// store. iOS forbids programmatic install in EVERY browser (Safari, Chrome,
// Firefox, Edge on iOS are all WebKit — manual Share → Add to Home Screen is
// the only path). Only Chromium browsers (Android Chrome/Samsung/Edge, and
// desktop Chrome/Edge) fire `beforeinstallprompt` for a real install button.

export type OS = 'ios' | 'android' | 'desktop';
export type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'opera' | 'other';
export type InApp = 'facebook' | 'instagram' | 'other' | null;

export interface Platform {
  os: OS;
  browser: Browser;
  /** Non-null when we're inside an in-app webview with no install path. */
  inApp: InApp;
  isStandalone: boolean;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS Safari exposes navigator.standalone
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(displayStandalone || iosStandalone);
}

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') {
    return { os: 'desktop', browser: 'other', inApp: null, isStandalone: false };
  }
  const ua = navigator.userAgent || '';

  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as "MacIntel"; a real Mac has no touch points.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const os: OS = isIos ? 'ios' : isAndroid ? 'android' : 'desktop';

  // In-app webviews (Instagram/Facebook/etc.) can't add to the home screen —
  // detect the common ones so we can route the user to a real browser.
  let inApp: InApp = null;
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) inApp = 'facebook';
  else if (/Instagram/i.test(ua)) inApp = 'instagram';
  else if (/Line\/|Twitter|TikTok|Snapchat|Pinterest|LinkedInApp|WhatsApp/i.test(ua)) inApp = 'other';
  // Generic Android WebView marker used by many in-app browsers.
  else if (isAndroid && /;\s*wv\)/i.test(ua)) inApp = 'other';

  let browser: Browser;
  if (isIos) {
    // Every iOS browser is WebKit; the token just tells us where the Share
    // button lives. Order matters (CriOS/FxiOS/EdgiOS all also contain Safari).
    if (/CriOS/i.test(ua)) browser = 'chrome';
    else if (/FxiOS/i.test(ua)) browser = 'firefox';
    else if (/EdgiOS/i.test(ua)) browser = 'edge';
    else if (/OPiOS|OPT\//i.test(ua)) browser = 'opera';
    else browser = 'safari';
  } else if (isAndroid) {
    if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
    else if (/EdgA/i.test(ua)) browser = 'edge';
    else if (/Firefox/i.test(ua)) browser = 'firefox';
    else if (/OPR|Opera/i.test(ua)) browser = 'opera';
    else if (/Chrome/i.test(ua)) browser = 'chrome';
    else browser = 'other';
  } else {
    if (/Edg\//i.test(ua)) browser = 'edge';
    else if (/Firefox/i.test(ua)) browser = 'firefox';
    else if (/OPR/i.test(ua)) browser = 'opera';
    else if (/Chrome/i.test(ua)) browser = 'chrome';
    else if (/Safari/i.test(ua)) browser = 'safari';
    else browser = 'other';
  }

  return { os, browser, inApp, isStandalone: isStandalone() };
}

// ---------------------------------------------------------------------------
// Shared beforeinstallprompt store
// ---------------------------------------------------------------------------
// The event fires once per eligible page load. We capture it at module load
// (imported by the always-mounted banner) and stash it so a later visit to
// /install can fire the real prompt. The root layout persists across client
// navigations, so this singleton survives route changes.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppress Chrome's mini-infobar; we drive install from our own UI.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  emit();
  return outcome;
}

/** Subscribe to prompt availability changes. Returns an unsubscribe fn. */
export function subscribeInstall(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
