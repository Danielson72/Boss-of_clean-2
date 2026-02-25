'use client';

import { useMemo } from 'react';
import { Sparkles, Droplets, Wind, Leaf, Star, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Spray can icon — Lucide doesn't have SprayCan, so we use a simple SVG
function SprayCan({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 11h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
      <path d="M10 11V7" />
      <path d="M7 7h6" />
      <path d="M12 4l2-1" />
      <path d="M12 7l3-2" />
    </svg>
  );
}

interface FloatingIcon {
  Icon: LucideIcon | typeof SprayCan;
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
  animation: 'drift-up' | 'float-gentle';
  opacity: number;
}

const ICON_POOL: (LucideIcon | typeof SprayCan)[] = [
  Sparkles,
  Droplets,
  SprayCan,
  Wind,
  Leaf,
  Star,
  Home,
];

// Seeded pseudo-random for consistent server/client rendering
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateIcons(variant: 'default' | 'alt', count: number): FloatingIcon[] {
  const rand = seededRandom(variant === 'default' ? 42 : 137);
  const icons: FloatingIcon[] = [];

  for (let i = 0; i < count; i++) {
    icons.push({
      Icon: ICON_POOL[Math.floor(rand() * ICON_POOL.length)],
      x: `${5 + rand() * 90}%`,
      y: `${10 + rand() * 80}%`,
      size: 32 + Math.floor(rand() * 48), // 32–80px
      delay: rand() * 6,
      duration: 6 + rand() * 8, // 6–14s
      animation: rand() > 0.5 ? 'drift-up' : 'float-gentle',
      opacity: 0.04 + rand() * 0.06, // 0.04–0.10
    });
  }

  return icons;
}

interface FloatingToolsProps {
  children: React.ReactNode;
  variant?: 'default' | 'alt';
}

export default function FloatingTools({ children, variant = 'default' }: FloatingToolsProps) {
  const icons = useMemo(() => generateIcons(variant, 10), [variant]);

  return (
    <div className="relative overflow-hidden">
      {/* Floating icons layer — behind content */}
      <div
        className="absolute inset-0 pointer-events-none motion-reduce:hidden"
        aria-hidden="true"
      >
        {icons.map((icon, i) => (
          <div
            key={i}
            className="absolute will-change-transform"
            style={{
              left: icon.x,
              top: icon.y,
              opacity: icon.opacity,
              animation: `${icon.animation} ${icon.duration}s ease-in-out ${icon.delay}s infinite`,
            }}
          >
            <icon.Icon
              className="text-brand-gold"
              style={{ width: icon.size, height: icon.size }}
            />
          </div>
        ))}
      </div>

      {/* Actual content — always on top */}
      <div className="relative">{children}</div>
    </div>
  );
}
