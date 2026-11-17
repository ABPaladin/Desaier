'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Progressive enhancement: content stays visible without JavaScript. */
export function MotionDirector() {
  const path = usePathname();
  useEffect(() => {
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
        animations.push(el.animate(
          artwork
            ? [{ clipPath: 'inset(12% 0 0 0 round 60px)', transform: 'translateY(35px)' }, { clipPath: 'inset(0 round 0px)', transform: 'translateY(0)' }]
            : line
              ? [{ transform: 'translateX(-22px)', opacity: .3 }, { transform: 'translateX(0)', opacity: 1 }]
              : [{ transform: 'translateY(28px)', opacity: .25 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: artwork ? 1050 : 750, easing: 'cubic-bezier(.16,1,.3,1)' }
        ));
      }
    }, { threshold: .12 });
    document.querySelectorAll('.section-head h2, .manifesto h2, .work, .services article, .three article, .person, .intro h1').forEach(el => observer.observe(el));
    const stop = () => { if (preference.matches) animations.forEach(a => a.cancel()); };
    preference.addEventListener('change', stop);
    return () => { observer.disconnect(); animations.forEach(a => a.cancel()); preference.removeEventListener('change', stop); };
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
        if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const box = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--drift-x', `${(e.clientX - box.left - box.width / 2) * .035}px`);
        e.currentTarget.style.setProperty('--drift-y', `${(e.clientY - box.top - box.height / 2) * .035}px`);
      }}
      onPointerLeave={e => { e.currentTarget.style.setProperty('--drift-x', '0px'); e.currentTarget.style.setProperty('--drift-y', '0px'); }}>
      <div className="aurora" />
      <div className="orbital orbital-one" /><div className="orbital orbital-two" />
      <div className="sculpture"><div className="ribbon-body">
        <svg viewBox="0 0 700 700" fill="none">
          <defs>
            <linearGradient id="ribbon" x1="130" y1="130" x2="570" y2="580" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f3dcff"/><stop offset=".2" stopColor="#bca0f5"/><stop offset=".42" stopColor="#7136c1"/><stop offset=".65" stopColor="#30145e"/><stop offset=".82" stopColor="#b58aee"/><stop offset="1" stopColor="#ead4ff"/>
            </linearGradient>
          </defs>
          {Array.from({length: 32}, (_, i) => <ellipse key={i} cx="350" cy="350" rx={225 - i * 2.3} ry={125 + i * 2.2} transform={`rotate(${i * 5.5} 350 350)`} stroke="url(#ribbon)" strokeWidth="9" />)}
        </svg>
      </div></div>
      <span className="object-label">FIG. 01 / A FORM IN FLUX</span>
    </div>
    <button className="motion-toggle" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Resume motion' : 'Pause motion'} <span aria-hidden="true">{paused ? '\u25b7' : '\u2016'}</span></button>
  </>;
}
