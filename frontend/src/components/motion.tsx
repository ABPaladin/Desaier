'use client';
import { Pause, Play } from 'lucide-react';
import { Sculpture3D } from '@/components/sculpture-3d';

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
    const scrollEffects: { chapter: HTMLElement; animation: Animation }[] = [];
    const prepareScroll = () => {
      scrollEffects.splice(0).forEach(({ animation }) => animation.cancel());
      for (const chapter of chapters) {
        const targets = chapter.matches('.manifesto') ? chapter.querySelectorAll('.manifesto-seal')
          : chapter.matches('.discipline-band') ? chapter.querySelectorAll(':scope > span') : [chapter];
        for (const target of targets) {
          const seal = chapter.matches('.manifesto'), process = chapter.matches('.process');
          const animation = target.animate(
            process ? [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
              : seal ? [{ transform: 'translateY(25px) rotate(-8deg)' }, { transform: 'translateY(-25px) rotate(-8deg)' }]
              : [{ transform: 'translateX(-12px)' }, { transform: 'translateX(12px)' }],
            { duration: 1000, fill: 'both', ...(process ? { pseudoElement: '::before' } : {}) }
          );
          animation.id = 'desaier-scroll'; animation.pause();
          scrollEffects.push({ chapter, animation });
        }
      }
    };
    const paint = () => {
      frame = 0;
      if (preference.matches) return;
      for (const { chapter, animation } of scrollEffects) {
        const box = chapter.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (innerHeight - box.top) / (innerHeight + box.height * .4)));
        animation.currentTime = progress * 1000;
      }
    };
    const scroll = () => { if (!frame && !preference.matches) frame = requestAnimationFrame(paint); };
    const stop = () => {
      if (preference.matches) {
        animations.forEach(a => a.cancel());
        scrollEffects.splice(0).forEach(({ animation }) => animation.cancel());
      } else { prepareScroll(); scroll(); }
    };
    if (!preference.matches) prepareScroll();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    scroll();
    preference.addEventListener('change', stop);
    return () => {
      observer.disconnect(); animations.forEach(a => a.cancel()); scrollEffects.forEach(({ animation }) => animation.cancel()); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll);
      preference.removeEventListener('change', stop);
    };
  }, [path]);
  return null;
}

export function LivingSculpture() {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const svg = el.querySelector<SVGSVGElement>('svg');
    if (!svg) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let onstage = true;
    function sync() {
      const stopped = paused || !onstage || document.hidden || preference.matches;
      el!.classList.toggle('offstage', !onstage);
      el!.classList.toggle('tab-hidden', document.hidden);
      if (stopped || el!.querySelector('.sculpture-3d[data-ready]')) svg!.pauseAnimations();
      else {
        if (!started.current) {
          svg!.querySelectorAll<SVGAnimationElement>('animate').forEach(animation => animation.beginElement());
          started.current = true;
        }
        svg!.unpauseAnimations();
      }
      if (preference.matches) svg!.setCurrentTime(0);
    }
    const observer = new IntersectionObserver(([entry]) => { onstage = entry.isIntersecting; sync(); });
    observer.observe(el);
    const rendererObserver = new MutationObserver(sync);
    rendererObserver.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-ready'] });
    sync();
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    return () => {
      observer.disconnect(); rendererObserver.disconnect(); svg.pauseAnimations();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
    };
  }, [paused]);
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
      <div className="aurora" />
      <div className="sculpture"><div className="ribbon-body"><Sculpture3D paused={paused}/></div></div>
      <span className="object-label">FIG. 01 / A FORM IN FLUX</span>
    </div>
    <button className="motion-toggle" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Resume motion' : 'Pause motion'} {paused ? <Play size={14} aria-hidden="true"/> : <Pause size={14} aria-hidden="true"/>}</button>
  </>;
}
