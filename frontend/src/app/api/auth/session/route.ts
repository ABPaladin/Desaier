import { navigationIdentity } from '@/lib/server/navigation';
import { json } from '@/lib/server/http';

export async function GET() {
  const identity = await navigationIdentity();
  return json(identity, identity.unavailable ? 503 : 200);
}
