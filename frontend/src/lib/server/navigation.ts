import 'server-only';
import { backendConfigured, database } from '@/lib/server/supabase';
import type { NavigationIdentity } from '@/lib/navigation';
import { connection } from 'next/server';

export async function navigationIdentity(readOnly = false): Promise<NavigationIdentity> {
  if (!backendConfigured()) return { user: null };
  // Supabase initializes time-dependent session internals. Exclude this work
  // from partial prerenders, and let Next's dynamic boundary propagate.
  await connection();
  try {
    const db = await database(readOnly);
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      if (error && (!error.status || error.status >= 500)) return { user: null, unavailable: true };
      return { user: null };
    }
    const { data: profile, error: profileError } = await db.from('profiles').select('name,role,active').eq('id', user.id).single();
    if (profileError) return { user: null, unavailable: true };
    if (!profile?.active || !['client', 'designer', 'operator'].includes(profile.role)) return { user: null };
    return { user: { name: profile.name, role: profile.role } };
  } catch { return { user: null, unavailable: true }; }
}
