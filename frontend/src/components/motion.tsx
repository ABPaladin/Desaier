'use client';
import { Pause, Play } from 'lucide-react';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Progressive enhancement: content stays visible without JavaScript. */
export function MotionDirector() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith('/dashboard') || path.startsWith('/demo') || ['/login', '/register', '/forgot-password', '/reset-password'].includes(path)) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches) continue;
        const el = entry.target as HTMLElement;
        const artwork = el.matches('.work');
        const line = el.matches('.services article');
        const headline = el.matches('h1, h2, .hero-line');
        const step = el.matches('.three article');
        animations.push(el.animate(
          artwork
            ? [{ clipPath: 'inset(12% 0 0 0 round 60px)', transform: 'translateY(35px)' }, { clipPath: 'inset(0 round 0px)', transform: 'translateY(0)' }]
            : headline
              ? [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(18px)' }, { clipPath: 'inset(0)', transform: 'none' }]
            : step
              ? [{ transform: 'translateY(35px) rotate(2deg)', opacity: .4 }, { transform: 'none', opacity: 1 }]
            : line
              ? [{ transform: 'translateX(-22px)', opacity: .3 }, { transform: 'translateX(0)', opacity: 1 }]
              : [{ transform: 'translateY(28px)', opacity: .25 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: artwork ? 1050 : 850, delay: step ? Array.from(el.parentElement!.children).indexOf(el) * 120 : 0, easing: 'cubic-bezier(.16,1,.3,1)' }
        ));
      }
    }, { threshold: .12 });
    document.querySelectorAll('.section-head h2, .manifesto h2, .hero-line, .process h2, .academy h2, .footer-top h2, .work, .services article, .three article, .person, .intro h1').forEach(el => observer.observe(el));
    const chapters = Array.from(document.querySelectorAll<HTMLElement>('.manifesto, .process, .discipline-band'));
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (preference.matches) return;
      for (const chapter of chapters) {
        const box = chapter.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (innerHeight - box.top) / (innerHeight + box.height * .4)));
        chapter.style.setProperty('--journey', String(progress));
      }
    };
    const scroll = () => { if (!frame && !preference.matches) frame = requestAnimationFrame(paint); };
    const stop = () => {
      if (preference.matches) { animations.forEach(a => a.cancel()); chapters.forEach(el => el.style.removeProperty('--journey')); }
      else scroll();
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    scroll();
    preference.addEventListener('change', stop);
    return () => {
      observer.disconnect(); animations.forEach(a => a.cancel()); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll);
      preference.removeEventListener('change', stop);
    };
  }, [path]);
  return null;
}

export function LivingSculpture() {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      el.classList.toggle('offstage', !entry.isIntersecting);
    });
    observer.observe(el);
    const visibility = () => el.classList.toggle('tab-hidden', document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <>
    <div ref={ref} className={`living-field ${paused ? 'paused' : ''}`} aria-hidden="true"
      onPointerMove={e => {
        if (paused || e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const box = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--drift-x', `${(e.clientX - box.left - box.width / 2) * .035}px`);
        e.currentTarget.style.setProperty('--drift-y', `${(e.clientY - box.top - box.height / 2) * .035}px`);
        e.currentTarget.style.setProperty('--light-x', `${Math.min(85, Math.max(15, (e.clientX - box.left) / box.width * 100))}%`);
      }}
      onPointerLeave={e => { e.currentTarget.style.setProperty('--drift-x', '0px'); e.currentTarget.style.setProperty('--drift-y', '0px'); }}>
      <div className="aurora" /><div className="sculpture-halo" />
      <div className="orbital orbital-one" /><div className="orbital orbital-two" />
      <div className="sculpture"><div className="ribbon-body">
        <svg viewBox="0 0 700 700" fill="none" focusable="false">
          <defs>
            <linearGradient id="ribbon" x1="130" y1="130" x2="570" y2="580" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5e3ff"/><stop offset=".18" stopColor="#dca4f5"/><stop offset=".36" stopColor="#ab61ed"/><stop offset=".54" stopColor="#4f2396"/><stop offset=".7" stopColor="#b755b8"/><stop offset=".86" stopColor="#a8a0fa"/><stop offset="1" stopColor="#f5c4e2"/>
            </linearGradient>
            <linearGradient id="ribbon-edge" x1="500" y1="140" x2="170" y2="550" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f8e5ff"/><stop offset=".35" stopColor="#cf8ef5"/><stop offset=".65" stopColor="#7539c9"/><stop offset="1" stopColor="#ea90cf"/>
            </linearGradient>
          </defs>
          {[0, 1, 2].map(layer => <g key={layer} className={`ribbon-layer ribbon-layer-${layer}`}>
            {Array.from({ length: 8 }, (_, i) => {
              const index = layer * 8 + i;
              return <path key={index} d={ribbonPath(index)} stroke={layer === 2 ? 'url(#ribbon-edge)' : 'url(#ribbon)'} strokeWidth={layer === 0 ? 8 : 5.5} strokeLinecap="round" opacity={.72 + i * .035}/>;
            })}
          </g>)}
        </svg>
      </div></div>
      <span className="object-label">FIG. 01 / A FORM IN FLUX</span>
    </div>
    <button className="motion-toggle" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Resume motion' : 'Pause motion'} {paused ? <Play size={14} aria-hidden="true"/> : <Pause size={14} aria-hidden="true"/>}</button>
  </>;
}

// Closed cubic curves form an asymmetric folded ribbon. Fixed geometry keeps
// motion on transforms rather than rebuilding or filtering paths every frame.
function ribbonPath(index: number) {
  const count = 16;
  const phase = index * .105;
  const points = Array.from({ length: count }, (_, step) => {
    const t = step / count * Math.PI * 2;
    const radius = 194 + 32 * Math.sin(3 * t + phase) + 18 * Math.cos(2 * t - phase);
    const x = Math.cos(t) * (radius + index * 1.1);
    const y = Math.sin(t) * (124 + index * 3.1) + 30 * Math.sin(2 * t + phase);
    const tilt = -.48 + index * .042;
    return [350 + x * Math.cos(tilt) - y * Math.sin(tilt), 350 + x * Math.sin(tilt) + y * Math.cos(tilt)];
  });
  const pair = (p: number[]) => p.map(n => n.toFixed(2)).join(' ');
  let d = `M${pair(points[0])}`;
  for (let i = 0; i < count; i++) {
    const a = points[(i + count - 1) % count], b = points[i], c = points[(i + 1) % count], e = points[(i + 2) % count];
    d += ` C${pair(b.map((n, axis) => n + (c[axis] - a[axis]) / 6))} ${pair(c.map((n, axis) => n - (e[axis] - b[axis]) / 6))} ${pair(c)}`;
  }
  return d + ' Z';
}
