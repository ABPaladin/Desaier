import { Auth } from '@/components/auth';
import { backendConfigured } from '@/lib/server/supabase';
export default function Page(){return <Auth mode="recover" configured={backendConfigured()}/>}
