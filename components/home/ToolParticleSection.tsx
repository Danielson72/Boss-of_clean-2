'use client';

import { useRef, useEffect } from 'react';

type DrawFn = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) => void;

// Tool drawing functions — each draws a tool shape using canvas strokes
const TOOLS: DrawFn[] = [
  // Broom
  (ctx, x, y, size, alpha) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255,95,31,${alpha})`;
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size * 0.3); ctx.stroke();
    ctx.lineWidth = size * 0.06;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (size * 0.15), size * 0.3);
      ctx.lineTo(i * (size * 0.18) + i * 2, size * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Spray bottle
  (ctx, x, y, size, alpha) => {
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255,150,60,${alpha})`;
    ctx.fillStyle = `rgba(255,95,31,${alpha * 0.15})`;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = 'round';
    // Body
    ctx.beginPath();
    ctx.rect(-size * 0.25, -size * 0.1, size * 0.5, size * 0.8);
    ctx.stroke(); ctx.fill();
    // Nozzle
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, -size * 0.1);
    ctx.lineTo(-size * 0.6, -size * 0.3);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.stroke();
    // Trigger
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.1);
    ctx.lineTo(-size * 0.5, size * 0.05);
    ctx.stroke();
    // Spray dots
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-size * 0.75 - i * size * 0.18, -size * 0.4 + i * size * 0.15 - size * 0.05, size * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,150,60,${alpha * 0.6})`;
      ctx.fill();
    }
    ctx.restore();
  },
  // Mop
  (ctx, x, y, size, alpha) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 12);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255,95,31,${alpha})`;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size * 0.4); ctx.stroke();
    ctx.lineWidth = size * 0.05;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (size * 0.12), size * 0.4);
      ctx.bezierCurveTo(i * (size * 0.15) - 5, size * 0.65, i * (size * 0.1) + 5, size * 0.75, i * (size * 0.12) + 3, size);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Bucket
  (ctx, x, y, size, alpha) => {
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255,120,40,${alpha})`;
    ctx.fillStyle = `rgba(255,95,31,${alpha * 0.12})`;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(-size * 0.35, size * 0.6);
    ctx.lineTo(size * 0.35, size * 0.6);
    ctx.lineTo(size * 0.5, -size * 0.3);
    ctx.closePath();
    ctx.stroke(); ctx.fill();
    // Handle
    ctx.beginPath();
    ctx.arc(0, -size * 0.5, size * 0.4, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  },
  // Scrub brush
  (ctx, x, y, size, alpha) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 6);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255,95,31,${alpha})`;
    ctx.fillStyle = `rgba(255,95,31,${alpha * 0.1})`;
    ctx.lineWidth = size * 0.06;
    // Body
    ctx.beginPath();
    ctx.rect(-size * 0.4, -size * 0.2, size * 0.8, size * 0.4);
    ctx.stroke(); ctx.fill();
    // Bristles
    ctx.lineWidth = size * 0.04;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (size * 0.1), size * 0.2);
      ctx.lineTo(i * (size * 0.1), size * 0.55);
      ctx.stroke();
    }
    // Handle
    ctx.lineWidth = size * 0.07;
    ctx.beginPath();
    ctx.moveTo(size * 0.4, 0);
    ctx.lineTo(size * 0.9, 0);
    ctx.stroke();
    ctx.restore();
  },
  // Sparkle
  (ctx, x, y, size, alpha) => {
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255,180,100,${alpha})`;
    ctx.lineWidth = size * 0.06;
    ctx.lineCap = 'round';
    const s = size * 0.6;
    // 4-point star
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
    // Diagonal arms
    const d = s * 0.6;
    ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke();
    // Center dot
    ctx.beginPath(); ctx.arc(0, 0, size * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,180,100,${alpha * 0.8})`; ctx.fill();
    ctx.restore();
  },
];

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  drift: number;
  alpha: number;
  alphaDrift: number;
  toolIdx: number;
  rotation: number;
  rotSpeed: number;
}

function createParticles(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 18 + Math.random() * 22,
    speed: 0.18 + Math.random() * 0.25,
    angle: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.008,
    alpha: 0.12 + Math.random() * 0.25,
    alphaDrift: (Math.random() - 0.5) * 0.004,
    toolIdx: Math.floor(Math.random() * TOOLS.length),
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.008,
  }));
}

const BADGES = [
  '\u{1F9F9} Cleaning',
  '\u{1F33F} Landscaping',
  '\u{1F4A7} Pressure Washing',
  '\u{1F3CA} Pool Care',
  '\u{1F697} Mobile Detailing',
  '\u{1F4A8} Air Duct',
  '\u{1FA9F} Windows',
  '\u{1F3D7} Post-Construction',
];

export default function ToolParticleSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = createParticles(canvas.width, canvas.height, 18);

    if (prefersReduced) {
      // Draw a single static frame, no animation loop
      particles.forEach((p) => {
        TOOLS[p.toolIdx](ctx, p.x, p.y, p.size, p.alpha * 0.5);
      });
      return () => window.removeEventListener('resize', resize);
    }

    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ambient glow blobs
      for (let i = 0; i < 3; i++) {
        const p = particles[i * 5];
        if (!p) continue;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120);
        grad.addColorStop(0, 'rgba(255,95,31,0.04)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 120, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,95,31,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw and update each particle
      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.translate(-p.x, -p.y);
        TOOLS[p.toolIdx](ctx, p.x, p.y, p.size, p.alpha);
        ctx.restore();

        // Update position
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += p.drift;
        p.rotation += p.rotSpeed;

        // Pulse alpha
        p.alpha += p.alphaDrift;
        if (p.alpha < 0.08) p.alphaDrift = Math.abs(p.alphaDrift);
        if (p.alpha > 0.38) p.alphaDrift = -Math.abs(p.alphaDrift);

        // Wrap around edges
        if (p.x < -60) p.x = canvas.width + 60;
        if (p.x > canvas.width + 60) p.x = -60;
        if (p.y < -60) p.y = canvas.height + 60;
        if (p.y > canvas.height + 60) p.y = -60;
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />

      {/* Canvas — behind content */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Content — above canvas */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-[#FF5F1F] text-sm font-semibold tracking-[0.2em] uppercase mb-4">
          Built for the Trade
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
          Every Professional.<br />Every Service.
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          From residential cleaning to post-construction, Boss of Clean connects
          Florida&apos;s most serious service pros with customers who value quality.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {BADGES.map((badge) => (
            <span
              key={badge}
              className="bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white/10 hover:bg-white/15 transition-colors"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
