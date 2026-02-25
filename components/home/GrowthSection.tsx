'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, TrendingUp, Home } from 'lucide-react';

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true);
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

function CountUp({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const steps = 60;
    const increment = target / steps;
    const stepTime = duration / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // Ease-out curve
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(eased * target);
      setCount(current);

      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

// SVG growth curve path
const CURVE_PATH = 'M 0 180 C 80 170, 160 150, 240 130 C 320 110, 400 95, 480 80 C 560 65, 640 45, 720 35 C 800 25, 880 15, 960 10';
const AREA_PATH = CURVE_PATH + ' L 960 200 L 0 200 Z';

export default function GrowthSection() {
  const { ref: sectionRef, isInView } = useInView(0.2);
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  const measurePath = useCallback(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  useEffect(() => {
    measurePath();
  }, [measurePath]);

  const stats = [
    { value: 67, suffix: '', label: 'Florida Counties Served', icon: MapPin },
    { value: 20, suffix: '+', label: 'Service Categories', icon: TrendingUp },
    { value: 100, suffix: '%', label: 'Residential Focus', icon: Home },
  ];

  // Dot positions along the curve (approximate x,y for key points)
  const dots = [
    { x: 120, y: 155, delay: '0.6s' },
    { x: 360, y: 98, delay: '1.0s' },
    { x: 600, y: 52, delay: '1.4s' },
    { x: 840, y: 18, delay: '1.8s' },
  ];

  // Floating labels that appear after the line draws
  const labels = [
    { text: '67 Counties', icon: MapPin, x: '10%', y: '20%', delay: '2.0s' },
    { text: 'Growing Daily', icon: TrendingUp, x: '45%', y: '10%', delay: '2.3s' },
    { text: 'Residential Focus', icon: Home, x: '75%', y: '25%', delay: '2.6s' },
  ];

  return (
    <section ref={sectionRef} className="relative bg-brand-dark py-20 sm:py-28 overflow-hidden">
      {/* Subtle background orbs */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-gold/3 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-brand-gold/2 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-4 border border-brand-gold/30 rounded-full px-5 py-1.5">
            Our Mission
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Building Florida&apos;s Most{' '}
            <span className="text-brand-gold">Trusted</span> Marketplace
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            We&apos;re on a mission to connect every Florida homeowner with quality cleaning professionals.
          </p>
        </div>

        {/* Animated Graph */}
        <div className="relative max-w-4xl mx-auto mb-16">
          <div className="relative bg-brand-navy/50 rounded-2xl border border-white/5 p-6 sm:p-10 overflow-hidden">
            {/* SVG Graph */}
            <svg
              viewBox="0 0 960 200"
              fill="none"
              className="w-full h-auto"
              aria-hidden="true"
            >
              {/* Grid lines */}
              {[50, 100, 150].map((y) => (
                <line
                  key={y}
                  x1="0" y1={y} x2="960" y2={y}
                  stroke="rgba(200, 163, 95, 0.06)"
                  strokeWidth="1"
                />
              ))}

              {/* Area fill */}
              <path
                d={AREA_PATH}
                fill="url(#goldGradient)"
                className={`transition-opacity duration-1000 ${isInView ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: '0.5s' }}
              />

              {/* Line stroke */}
              <path
                ref={pathRef}
                d={CURVE_PATH}
                stroke="url(#goldLineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                style={{
                  strokeDasharray: pathLength || 1000,
                  strokeDashoffset: isInView ? 0 : (pathLength || 1000),
                  transition: 'stroke-dashoffset 2s ease-in-out',
                }}
                className="motion-reduce:![stroke-dashoffset:0] motion-reduce:![transition:none]"
              />

              {/* Animated dots */}
              {dots.map((dot, i) => (
                <circle
                  key={i}
                  cx={dot.x}
                  cy={dot.y}
                  r="5"
                  fill="#C8A35F"
                  className={`transition-all duration-500 ${isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                  style={{
                    transitionDelay: dot.delay,
                    transformOrigin: `${dot.x}px ${dot.y}px`,
                  }}
                />
              ))}

              {/* Glow dot at the end */}
              <circle
                cx="960"
                cy="10"
                r="8"
                fill="#C8A35F"
                className={`transition-all duration-500 ${isInView ? 'opacity-60' : 'opacity-0'}`}
                style={{ transitionDelay: '2s' }}
              />
              <circle
                cx="960"
                cy="10"
                r="4"
                fill="#D4B878"
                className={`transition-all duration-500 ${isInView ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: '2s' }}
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8A35F" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#C8A35F" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="goldLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#A88B4A" />
                  <stop offset="50%" stopColor="#C8A35F" />
                  <stop offset="100%" stopColor="#D4B878" />
                </linearGradient>
              </defs>
            </svg>

            {/* Floating labels that appear after the line draws */}
            {labels.map((label, i) => (
              <div
                key={i}
                className={`absolute flex items-center gap-1.5 bg-brand-dark/80 backdrop-blur-sm border border-brand-gold/20 rounded-full px-3 py-1.5 text-xs font-medium text-brand-gold transition-all duration-700 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{
                  left: label.x,
                  top: label.y,
                  transitionDelay: label.delay,
                }}
              >
                <label.icon className="h-3 w-3" />
                {label.text}
              </div>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`text-center bg-brand-navy/40 border border-white/5 rounded-2xl p-6 sm:p-8 transition-all duration-700 ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${2.2 + i * 0.2}s` }}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 mb-4">
                <stat.icon className="h-5 w-5 text-brand-gold" />
              </div>
              <div className="font-display text-4xl sm:text-5xl font-bold text-white mb-2">
                <CountUp target={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
