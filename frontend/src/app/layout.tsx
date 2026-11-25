import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import './globals.css';
import './creative.css';
import './workspace.css';
import './refinement.css';
import { Shell } from '@/components/site';
import { BrandMark } from '@/components/brand-mark';
import { navigationIdentity } from '@/lib/server/navigation';
export const metadata: Metadata = { title: 'Desaier — Designed to become.', description: 'An independent creative agency. Strategy, identity and digital experiences, managed as one.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip" href="#main">Skip to content</a><Suspense fallback={<header aria-busy="true"><Link className="logo" href="/" aria-label="Desaier home">desaier<BrandMark/></Link><span className="eyebrow" role="status">Loading Desaier…</span></header>}><SessionShell>{children}</SessionShell></Suspense></body></html>;
}
async function SessionShell({ children }: { children: React.ReactNode }) {
  const identity = await navigationIdentity(true);
  return <Shell initialIdentity={identity}>{children}</Shell>;
}

