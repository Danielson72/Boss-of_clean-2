'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, MapPin, ArrowRight } from 'lucide-react';

// Scroll-scrubbed "fly through the Boss of Clean world" hero. Five pre-rendered
// Higgsfield clips play inside the existing framed CEO-cat card; page scroll
// drives the camera scene 1 → 5, landing on the Boss in his office. Hosted on
// the Netlify assets CDN (byte-range 206), never committed to the repo.
//
// Legal: neutral marketplace — no vetted/verified/guarantee language; the
// commercial scene is labelled "Every business" (never commercial *cleaning*,
// per the Coverall carve-out).

const ASSETS = 'https://boc-scroll-assets.netlify.app/scrollworld';

interface Scene {
  key: string;
  eyebrow: string;
}
const SCENES: Scene[] = [
  { key: 'boc-scene-1-aerial', eyebrow: 'Every home' },
  { key: 'boc-scene-2-interior', eyebrow: 'Every room' },
  { key: 'boc-scene-3-backyard', eyebrow: 'Every yard' },
  { key: 'boc-scene-4-commercial', eyebrow: 'Every business' },
  { key: 'boc-scene-5-office', eyebrow: 'One Boss' },
];
const N = SCENES.length;
const CROSSFADE = 0.14; // fraction of a band spent blending into the next clip

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export default function ScrollWorldHero({ services }: { services: string[] }) {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const primed = useRef(false);
  const rafPending = useRef(false);
  const started = useRef(false); // gate heavy video bytes until idle/first scroll (protects LCP)

  const [reduced, setReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [payoff, setPayoff] = useState(0); // 0..1, fades the locked brand overlay in on the last scene

  // Search state (compact; routes to /search — the ZIP/service search)
  const [serviceType, setServiceType] = useState('');
  const [zip, setZip] = useState('');
  const options = services && services.length > 0 ? services : [];

  const src = useCallback(
    (key: string) => `${ASSETS}/${key}${isMobile ? '-m' : ''}.mp4`,
    [isMobile]
  );

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

  // iOS decodes frames from a paused <video> on currentTime only after a real
  // play() has run once. Prime all loaded videos on the first user gesture.
  const prime = useCallback(() => {
    if (primed.current) return;
    primed.current = true;
    videoRefs.current.forEach((v) => {
      if (!v) return;
      const p = v.play();
      if (p && typeof p.then === 'function') p.then(() => v.pause()).catch(() => {});
    });
  }, []);

  const update = useCallback(() => {
    rafPending.current = false;
    const section = sectionRef.current;
    if (!section || reduced) return;
    const rect = section.getBoundingClientRect();
    const travel = section.offsetHeight - window.innerHeight;
    const p = clamp(-rect.top / Math.max(1, travel), 0, 1);
    const sf = p * N; // 0..N scene-float
    const idx = Math.min(Math.floor(sf), N - 1);
    const frac = sf - idx;

    // Lazy-load: nothing heavy loads until started (idle or first scroll), which
    // keeps the initial paint to the tiny poster. Then scene 0, and any clip the
    // camera is within ~1.3 bands of, upgrades from metadata to full data.
    if (started.current) {
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if ((i === 0 || Math.abs(sf - i) < 1.3) && v.dataset.full !== '1') {
          v.dataset.full = '1';
          v.preload = 'auto';
          v.load();
        }
      });
    }

    // Only seek the active clip and its crossfade neighbour (perf).
    const seek = (i: number, local: number) => {
      const v = videoRefs.current[i];
      if (!v || !v.duration || Number.isNaN(v.duration)) return;
      const t = clamp(local, 0, 1) * v.duration;
      if (Math.abs(v.currentTime - t) > 0.02) v.currentTime = t;
    };
    seek(idx, frac);
    if (idx < N - 1) seek(idx + 1, 0);

    // Opacity: active clip full; blend into the next in the last CROSSFADE band.
    const next = frac > 1 - CROSSFADE && idx < N - 1 ? (frac - (1 - CROSSFADE)) / CROSSFADE : 0;
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.style.opacity = i === idx ? String(1 - next) : i === idx + 1 ? String(next) : '0';
    });

    // Payoff overlay fades in across the final scene.
    setPayoff(idx >= N - 1 ? clamp(frac * 1.4, 0, 1) : idx === N - 2 ? clamp(next, 0, 1) : 0);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const kick = () => {
      started.current = true;
      requestAnimationFrame(update);
    };
    const onScroll = () => {
      prime();
      if (!started.current) started.current = true;
      if (!rafPending.current) {
        rafPending.current = true;
        requestAnimationFrame(update);
      }
    };
    // Preload scene 1 once the browser is idle (so it's ready before the first
    // scroll) — but only after LCP, so it never competes with the initial paint.
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const idle = ric ? ric(kick, { timeout: 2500 }) : window.setTimeout(kick, 2000);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('touchstart', prime, { passive: true, once: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('touchstart', prime);
    };
  }, [reduced, update, prime]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (serviceType) params.set('service', serviceType);
    if (zip) params.set('zip', zip);
    router.push(`/search?${params.toString()}`);
  };

  const scrollToSearch = () => {
    document.getElementById('boc-hero-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('boc-hero-zip')?.focus();
  };

  // Section is tall (drives scroll); the inner hero pins. Reduced-motion collapses
  // to a single static screen showing the scene-5 poster — no video, no pin.
  const sectionHeight = reduced ? undefined : `${N * 90}vh`;

  return (
    <section
      ref={sectionRef}
      className="relative bg-brand-dark"
      style={{ height: sectionHeight }}
      aria-label="Boss of Clean"
    >
      {/* Warm the asset-CDN connection before the poster/clips are requested */}
      <link rel="preconnect" href={ASSETS} crossOrigin="" />
      <link rel="dns-prefetch" href={ASSETS} />
      {/* SEO / no-JS mirror — real crawlable copy (hidden once mounted is irrelevant; kept lightweight) */}
      <div className="sr-only" data-sw-seo>
        <h1>Any Service. Any Day. One Boss.</h1>
        <p>Purrfection is our Standard. Boss of Clean is Florida&apos;s home service marketplace —
          request quotes from independent local pros for cleaning, handyman, HVAC, landscaping,
          pressure washing, and more.</p>
        <a href="/search">Hire like a Boss — search local pros</a>
      </div>

      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        {/* bg glows */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* LEFT — headline + search + payoff */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <p className="inline-block text-brand-gold text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-4 border border-brand-gold/30 rounded-full px-4 py-1">
              Florida&apos;s Home Service Marketplace
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] mb-4">
              Any Service. Any Day.{' '}
              <span className="text-brand-gold">One Boss.</span>
            </h2>
            <p
              className="text-brand-gold/90 font-display italic text-base sm:text-lg mb-6 transition-opacity duration-300"
              style={{ opacity: 0.55 + payoff * 0.45 }}
            >
              Purrfection is our Standard
            </p>

            {/* Compact ZIP/service search */}
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

          {/* RIGHT — the framed card with the scrubbing video */}
          <div className="order-1 lg:order-2 mx-auto w-56 sm:w-72 lg:w-[380px]">
            <div className="absolute -inset-6 bg-brand-gold/15 rounded-3xl blur-3xl pointer-events-none" />
            <div className="relative rounded-2xl overflow-hidden border-[3px] border-brand-gold/70 shadow-[0_0_20px_rgba(200,163,95,0.4),0_8px_32px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 rounded-2xl border border-brand-gold/20 pointer-events-none z-20" />
              <div className="relative aspect-[3/4] bg-brand-navy">
                {reduced ? (
                  <Image
                    src={`${ASSETS}/boc-scene-5-office.webp`}
                    alt="Boss of Clean CEO cat at his Orlando office desk"
                    fill
                    sizes="380px"
                    className="object-cover"
                    priority
                    unoptimized
                  />
                ) : (
                  SCENES.map((s, i) => (
                    <video
                      key={s.key}
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: i === 0 ? 1 : 0, transition: 'opacity 120ms linear' }}
                      src={src(s.key)}
                      poster={i === 0 ? `${ASSETS}/${s.key}.webp` : undefined}
                      muted
                      playsInline
                      onLoadedMetadata={() => requestAnimationFrame(update)}
                      preload="none"
                      // @ts-expect-error non-standard but harmless on iOS
                      webkit-playsinline="true"
                    />
                  ))
                )}

                {/* Payoff overlay — locked brand, fades in on the landing (scene 5) */}
                {!reduced && (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-end text-center p-4 pb-6 bg-gradient-to-t from-brand-dark/85 via-brand-dark/10 to-transparent pointer-events-none"
                    style={{ opacity: payoff }}
                  >
                    <p className="font-display text-white text-lg sm:text-xl font-bold leading-tight drop-shadow">
                      Any Service. Any Day.{' '}
                      <span className="text-brand-gold">One Boss.</span>
                    </p>
                    <button
                      type="button"
                      onClick={scrollToSearch}
                      className="pointer-events-auto mt-3 inline-flex items-center gap-2 bg-[#FF5F1F] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 transition"
                    >
                      Hire like a Boss
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Nameplate */}
              <div className="relative bg-gradient-to-r from-brand-dark via-brand-navy to-brand-dark px-4 py-2.5 text-center border-t border-brand-gold/30 z-20">
                <p className="font-display text-brand-gold text-sm font-bold tracking-wide">Boss of Clean</p>
                <p className="text-gray-400 text-[10px] tracking-[0.15em] uppercase mt-0.5">
                  Purrfection is our Standard
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint on first scene */}
        {!reduced && (
          <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 text-brand-gold/70 text-xs tracking-widest uppercase transition-opacity"
            style={{ opacity: payoff > 0.05 ? 0 : 0.8 }}
          >
            Scroll to explore ↓
          </div>
        )}
      </div>
    </section>
  );
}
