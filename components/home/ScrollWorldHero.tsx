'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, MapPin, ArrowRight } from 'lucide-react';

// Autoplay cinematic hero. On load the five Higgsfield clips play themselves in
// order (aerial → interior → backyard → business → office), crossfading, and
// FREEZE on the office Boss with the payoff overlay — no scroll required, no
// loop. A same-origin poster paints first (fast LCP); the muted video starts
// after. Assets live on the Netlify assets CDN (byte-range 206), not committed.
//
// Legal: neutral marketplace — no vetted/verified/guarantee language; the
// commercial scene is "Every business" (never commercial *cleaning*, Coverall).

const ASSETS = 'https://boc-scroll-assets.netlify.app/scrollworld';
const POSTER_1 = '/images/boc-scroll-poster-1.jpg'; // same-origin LCP poster (scene 1)
const OFFICE_STILL = '/images/ceo-cat-hero.png'; // same-origin reduced-motion poster (scene 5)

const KEYS = [
  'boc-scene-1-aerial',
  'boc-scene-2-interior',
  'boc-scene-3-backyard',
  'boc-scene-4-commercial',
  'boc-scene-5-office',
];
const N = KEYS.length;
const HOLD_MS = 3400; // dwell per non-final scene → ~13.6s + final clip ≈ 18s total

export default function ScrollWorldHero({ services }: { services: string[] }) {
  const router = useRouter();
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reduced, setReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false); // first video frame painted → fade poster
  const [ended, setEnded] = useState(false); // frozen on scene 5 + payoff

  const [serviceType, setServiceType] = useState('');
  const [zip, setZip] = useState('');
  const options = services && services.length > 0 ? services : [];

  const srcFor = useCallback((key: string) => `${ASSETS}/${key}${isMobile ? '-m' : ''}.mp4`, [isMobile]);

  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqMobile = window.matchMedia('(max-width: 600px)');
    const sync = () => {
      setReduced(mqReduce.matches);
      setIsMobile(mqMobile.matches);
    };
    sync();
    mqReduce.addEventListener('change', sync);
    mqMobile.addEventListener('change', sync);
    return () => {
      mqReduce.removeEventListener('change', sync);
      mqMobile.removeEventListener('change', sync);
    };
  }, []);

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setActive(N - 1);
    setEnded(true);
    const v = videoRefs.current[N - 1];
    if (v) {
      v.preload = 'auto';
      v.load();
      // Land on the office and hold on a late frame (never black, never loop).
      const settle = () => {
        try {
          v.pause();
          if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05);
        } catch {
          /* ignore */
        }
      };
      const p = v.play();
      if (p && typeof p.then === 'function') p.then(() => setStarted(true)).catch(settle);
      v.addEventListener('loadeddata', () => setStarted(true), { once: true });
    }
  }, []);

  // Drive the cinematic (skipped entirely under reduced-motion).
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;

    const play = (i: number) => {
      if (cancelled) return;
      setActive(i);
      const v = videoRefs.current[i];
      if (v) {
        v.preload = 'auto';
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
        const pr = v.play();
        if (pr && typeof pr.then === 'function') pr.then(() => setStarted(true)).catch(() => {});
      }
      // Warm the next clip so its turn is seamless.
      const nx = videoRefs.current[i + 1];
      if (nx) {
        nx.preload = 'auto';
        nx.load();
      }
      if (i < N - 1) {
        timer.current = setTimeout(() => play(i + 1), HOLD_MS);
      } else if (v) {
        // Final scene: freeze on its last frame, show payoff, no loop.
        const hold = () => {
          try {
            v.pause();
            if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05);
          } catch {
            /* ignore */
          }
          setEnded(true);
        };
        v.addEventListener('ended', hold, { once: true });
        timer.current = setTimeout(() => setEnded(true), 5200); // fallback if 'ended' misses
      }
    };

    // Start after first paint so the poster is the LCP, not the video.
    const raf = requestAnimationFrame(() => play(0));
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, isMobile]);

  const skip = () => {
    finish();
    document.getElementById('boc-hero-zip')?.focus();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (serviceType) params.set('service', serviceType);
    if (zip) params.set('zip', zip);
    router.push(`/search?${params.toString()}`);
  };

  const showPayoff = ended || reduced;

  return (
    <section className="relative bg-brand-dark overflow-hidden" aria-label="Boss of Clean">
      <link rel="preconnect" href={ASSETS} crossOrigin="" />

      {/* SEO / no-JS mirror */}
      <div className="sr-only" data-sw-seo>
        <h1>Any Service. Any Day. One Boss.</h1>
        <p>Purrfection is our Standard. Boss of Clean is Florida&apos;s home service marketplace —
          request quotes from independent local pros for cleaning, handyman, HVAC, landscaping,
          pressure washing, and more.</p>
        <a href="/search">Hire like a Boss — search local pros</a>
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* LEFT — headline + search (the escape hatch, always usable) */}
        <div className="order-2 lg:order-1 text-center lg:text-left">
          <p className="inline-block text-brand-gold text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-4 border border-brand-gold/30 rounded-full px-4 py-1">
            Florida&apos;s Home Service Marketplace
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] mb-4">
            Any Service. Any Day.{' '}
            <span className="text-brand-gold">One Boss.</span>
          </h2>
          <p className="text-brand-gold/90 font-display italic text-base sm:text-lg mb-6">
            Purrfection is our Standard
          </p>

          <form
            id="boc-hero-search"
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-2 max-w-xl mx-auto lg:mx-0"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                aria-label="Service type"
                className="w-full pl-11 pr-8 py-3 min-h-[48px] bg-brand-cream rounded-xl text-brand-dark font-medium text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              >
                <option value="">What service do you need?</option>
                {options.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="relative sm:w-40">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="boc-hero-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                inputMode="numeric"
                placeholder="ZIP Code"
                aria-label="ZIP code"
                className="w-full pl-11 pr-3 py-3 min-h-[48px] bg-brand-cream rounded-xl text-brand-dark font-medium text-base focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
            <button
              type="submit"
              className="bg-[#FF5F1F] hover:brightness-110 text-white px-6 py-3 rounded-xl font-semibold text-sm tracking-wide transition min-h-[48px] whitespace-nowrap"
            >
              Hire like a Boss
            </button>
          </form>
        </div>

        {/* RIGHT — framed card with the autoplaying cinematic */}
        <div className="order-1 lg:order-2 mx-auto w-56 sm:w-72 lg:w-[380px]">
          <div className="absolute -inset-6 bg-brand-gold/15 rounded-3xl blur-3xl pointer-events-none" />
          <div className="relative rounded-2xl overflow-hidden border-[3px] border-brand-gold/70 shadow-[0_0_20px_rgba(200,163,95,0.4),0_8px_32px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0 rounded-2xl border border-brand-gold/20 pointer-events-none z-30" />
            <div className="relative aspect-[3/4] bg-brand-navy">
              {/* Same-origin poster — first paint (LCP). Scene 5 still under reduced-motion. */}
              <Image
                src={reduced ? OFFICE_STILL : POSTER_1}
                alt="Boss of Clean CEO cat with the Orlando skyline"
                fill
                sizes="380px"
                className="object-cover transition-opacity duration-500"
                style={{ opacity: !reduced && started ? 0 : 1 }}
                priority
              />

              {!reduced &&
                KEYS.map((key, i) => (
                  <video
                    key={key}
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                    style={{ opacity: i === active ? 1 : 0 }}
                    src={srcFor(key)}
                    muted
                    playsInline
                    preload={i === 0 ? 'auto' : 'none'}
                    // @ts-expect-error non-standard but required for older iOS
                    webkit-playsinline="true"
                  />
                ))}

              {/* Payoff overlay — locked brand; shows on the office landing / reduced-motion */}
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-end text-center p-4 pb-6 bg-gradient-to-t from-brand-dark/85 via-brand-dark/10 to-transparent transition-opacity duration-500"
                style={{ opacity: showPayoff ? 1 : 0, pointerEvents: showPayoff ? 'auto' : 'none' }}
              >
                <p className="font-display text-white text-lg sm:text-xl font-bold leading-tight drop-shadow">
                  Any Service. Any Day.{' '}
                  <span className="text-brand-gold">One Boss.</span>
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById('boc-hero-zip')?.focus()}
                  className="mt-3 inline-flex items-center gap-2 bg-[#FF5F1F] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 transition"
                >
                  Hire like a Boss
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Skip intro — subtle, only during the cinematic */}
              {!reduced && !ended && (
                <button
                  type="button"
                  onClick={skip}
                  className="absolute top-2 right-2 z-30 text-white/80 hover:text-white text-[11px] tracking-wide bg-black/35 hover:bg-black/55 rounded-full px-3 py-1 backdrop-blur-sm transition"
                >
                  Skip intro ›
                </button>
              )}
            </div>

            {/* Nameplate */}
            <div className="relative bg-gradient-to-r from-brand-dark via-brand-navy to-brand-dark px-4 py-2.5 text-center border-t border-brand-gold/30 z-30">
              <p className="font-display text-brand-gold text-sm font-bold tracking-wide">Boss of Clean</p>
              <p className="text-gray-400 text-[10px] tracking-[0.15em] uppercase mt-0.5">
                Purrfection is our Standard
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
