'use client';

import { useEffect } from 'react';

/**
 * DLD-539: registers the PWA service worker (/sw.js) after the page loads.
 * Renders nothing. The SW itself bypasses /api, /auth and all cross-origin
 * requests, so Supabase auth and Stripe checkout are unaffected.
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[PWA] service worker registration failed:', err);
      });
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
