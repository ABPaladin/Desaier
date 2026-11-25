'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { useNavigationIdentity } from '@/components/navigation-identity';
import { dashboardHref, initials, projectAction, type NavigationUser } from '@/lib/navigation';
import { api } from '@/lib/client-api';

export function ProjectLink({ children, className = 'pill', service }: { children?: React.ReactNode; className?: string; service?: string }) {
  const { user } = useNavigationIdentity();
  const action = projectAction(user);
  return <Link className={className} href={action.href}>{service ? <><span className="sr-only">{user && user.role !== 'client' ? action.label : `Start a ${service} project`}</span><ArrowUpRight size={24} aria-hidden="true"/></> : user && user.role !== 'client' ? action.label : children || action.label}</Link>;
}

export function SiteHeader() {
  const path = usePathname();
  const { user, unavailable } = useNavigationIdentity();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === path;
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setOpenPath(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) { setOpenPath(null); toggle.current?.focus(); }
    }
    const desktop = matchMedia('(min-width: 901px)');
    const close = () => setOpenPath(null);
    desktop.addEventListener('change', close);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { desktop.removeEventListener('change', close); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const close = () => setOpenPath(null);
  const action = projectAction(user);
  return <header ref={header} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <Link className="logo" href="/" aria-label="Desaier home" onClick={close}>desaier<BrandMark/></Link>
    <button ref={toggle} className="menu" aria-controls="main-navigation" aria-expanded={open} onClick={() => setOpenPath(open ? null : path)}>Menu {open ? 'Close' : '+'}</button>
    <nav id="main-navigation" className={open ? 'open' : ''} aria-label="Main navigation">
      {[['Services', '/services'], ['Work & people', '/designers'], ['Academy', '/academy']].map(([name, href]) => <Link aria-current={path === href ? 'page' : undefined} onClick={close} key={href} href={href}>{name}</Link>)}
      {user ? <ProfileMenu key={`${path}:${user.role}:${open}`} user={user} closeNavigation={close}/> : unavailable ? <Link href="/dashboard" onClick={close}>Account</Link> : <Link onClick={close} href="/login">Log in</Link>}
      <Link onClick={close} className="pill small" href={action.href}>{action.label}</Link>
    </nav>
  </header>;
}

function ProfileMenu({ user, closeNavigation }: { user: NavigationUser; closeNavigation: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() { setOpen(false); closeNavigation(); }
  return <div className="profile-menu" ref={container}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = Array.from(container.current?.querySelectorAll<HTMLElement>('.profile-panel a, .profile-panel button:not(:disabled)') || []);
        if (!items.length) return;
        event.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
      }
    }}>
    <button ref={trigger} className="profile-trigger" aria-expanded={open} aria-controls="profile-panel" aria-label={`Account: ${user.name || 'Desaier member'}, ${user.role}`} onClick={() => setOpen(!open)}>
      <span className="profile-avatar" aria-hidden="true">{initials(user.name)}</span>
      <span className="profile-summary"><strong>{user.name || 'Your account'}</strong><small>{user.role}</small></span>
      <ChevronDown size={14} aria-hidden="true"/>
    </button>
    {open && <div className="profile-panel" id="profile-panel" aria-label="Account actions">
      <p>YOUR WORKSPACE<span>{user.role}</span></p>
      <Link href={dashboardHref(user)} onClick={close}><LayoutDashboard size={17} aria-hidden="true"/>My Dashboard</Link>
      {user.role === 'designer' && <Link href="/dashboard/designer#profile" onClick={() => { window.dispatchEvent(new Event('desaier:open-profile')); close(); }}><UserRound size={17} aria-hidden="true"/>My Profile</Link>}
      <button aria-disabled={busy} onClick={async () => {
        if (busy) return;
        setBusy(true); setError('');
        try { await api('/api/auth/logout', {}); close(); router.replace('/login'); router.refresh(); }
        catch { setError('Could not log out. Please try again.'); setBusy(false); }
      }}><LogOut size={17} aria-hidden="true"/>{busy ? 'Logging out…' : 'Log out'}</button>
      {error && <p className="profile-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
