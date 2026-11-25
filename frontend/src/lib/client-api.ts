export async function api<T>(path: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Please try again.');
    Object.assign(error, { status: response.status }); throw error;
  }
  if (body && path.startsWith('/api/auth/') && typeof window !== 'undefined') {
    const signedOut = ['/api/auth/logout', '/api/auth/register', '/api/auth/update-password'].includes(path);
    if (signedOut || data.navigation) window.dispatchEvent(new CustomEvent('desaier:auth', { detail: signedOut ? { user: null } : data.navigation }));
  }
  return data as T;
}
