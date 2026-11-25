'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { MotionDirector } from '@/components/motion';
import { NavigationIdentityProvider } from '@/components/navigation-identity';
import { SiteHeader, ProjectLink } from '@/components/site-header';
import type { NavigationIdentity } from '@/lib/navigation';
import { projects, services } from '@/lib/demo';

export function Shell({ children, initialIdentity }: { children: React.ReactNode; initialIdentity: NavigationIdentity }) {
  return <NavigationIdentityProvider initial={initialIdentity}>
    <MotionDirector/><SiteHeader/>
    <main id="main">{children}</main>
    <footer><div className="footer-top"><h2>Your next chapter<br/>starts with an idea.</h2><ProjectLink>Let’s shape it together</ProjectLink></div>
      <div className="footer-bottom"><Link className="logo" href="/" aria-label="Desaier home">desaier<BrandMark/></Link><p>Independent minds. Shared direction.</p><span>© 2026 Desaier · Creative agency</span></div>
    </footer>
  </NavigationIdentityProvider>;
}
export function Intro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="intro"><div className="intro-orbit" aria-hidden="true"/><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{copy}</p></section>;
}
export function Services() {
  return <div className="services">{services.map(([n, title, copy, items]) => <article key={n}>
    <span className="eyebrow">{n}</span><div><h3>{title}</h3><p>{copy}</p><small>{items}</small></div><ProjectLink className="service-action" service={title}/>
  </article>)}</div>;
}
export function Portfolio() {
  const [active, setActive] = useState<string | null>(null);
  return <><div className="work-grid">{projects.map((p, index) => <button className="work" key={p.name} onClick={() => setActive(active === p.name ? null : p.name)} aria-expanded={active === p.name} aria-controls={`study-${index}`}>
    <div className={'art ' + p.className}><span>{p.name}</span><i aria-hidden="true"/>
      <div className="art-meta" aria-hidden="true"><small>DESAIER STUDIO / 0{index + 1}</small><small>CONCEPT EXPLORATION</small></div>
      <div className="view-project" aria-hidden="true">{active === p.name ? 'Close study' : 'Explore study'}</div>
    </div>
    <div className="work-caption"><h3>{p.name}</h3><span>{p.category}</span></div><p>{p.description}</p>
    <div id={`study-${index}`} className="study-expansion" aria-hidden={active !== p.name}><div><p className="detail">{p.detail} Concept project — demo content.</p></div></div>
  </button>)}</div><p className="note">Selected concept projects · Illustrative demo work, not client commissions.</p></>;
}
