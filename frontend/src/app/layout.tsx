import type { Metadata } from 'next';
import './globals.css';
import './creative.css';
import './workspace.css';
import { Shell } from '@/components/site';
export const metadata: Metadata = { title: 'Desaier — Designed to become.', description: 'An independent creative agency. Strategy, identity and digital experiences, managed as one.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-scroll-behavior="smooth"><body><Shell>{children}</Shell></body></html>; }

