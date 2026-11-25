'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { NavigationIdentity } from '@/lib/navigation';

const IdentityContext = createContext<NavigationIdentity>({ user: null });
export const useNavigationIdentity = () => useContext(IdentityContext);

export function NavigationIdentityProvider({ initial, children }: { initial: NavigationIdentity; children: React.ReactNode }) {
  const [identity, setIdentity] = useState(initial);
  const current = useRef(identity);
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    let controller: AbortController | undefined;
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('desaier:session') : null;
    function accept(next: NavigationIdentity) {
      const changed = JSON.stringify(current.current.user) !== JSON.stringify(next.user);
      current.current = next;
      setIdentity(next);
      // Clear cached private page content when another tab signs out or roles change.
      if (changed && path.startsWith('/dashboard')) {
        router.replace(next.user ? `/dashboard/${next.user.role}` : '/login');
        router.refresh();
      }
    }
    async function refresh() {
      if (document.hidden) return;
      controller?.abort(); controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin', signal });
        const next: NavigationIdentity = await response.json();
        if (signal.aborted) return;
        if (response.ok) accept(next);
        else setIdentity(previous => ({ ...previous, unavailable: true }));
      } catch { if (!signal.aborted) setIdentity(previous => ({ ...previous, unavailable: true })); }
    }
    function auth(event: Event) {
      controller?.abort();
      accept((event as CustomEvent<NavigationIdentity>).detail);
      channel?.postMessage('invalidate'); // No profile, role or token in browser storage.
    }
    if (channel) channel.onmessage = () => void refresh();
    window.addEventListener('desaier:auth', auth);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60_000);
    void refresh();
    return () => {
      controller?.abort(); channel?.close(); clearInterval(timer);
      window.removeEventListener('desaier:auth', auth);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [path, router]);
  return <IdentityContext value={identity}>{children}</IdentityContext>;
}
