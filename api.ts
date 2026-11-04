import type { CollectionName, Workspace } from '../../shared/types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
}

async function request<T>(path: string, init: RequestInit = {}, csrfToken?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (csrfToken) headers.set('x-csrf-token', csrfToken);
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try { const body = await response.json() as { error?: string }; if (body.error) message = body.error; } catch { /* use the status fallback */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface AuthResponse { user: { id: string; name: string; email: string | null }; csrfToken: string; }
export const api = {
  getAuth: () => request<AuthResponse>('/api/auth/me'),
  getWorkspace: () => request<Workspace>('/api/workspace'),
  startSignIn: async () => {
    const result = await request<{ url: string }>('/api/auth/start', {
      method: 'POST', body: JSON.stringify({ origin: window.location.origin }),
    });
    return result.url;
  },
  signOut: (csrf: string) => request<void>('/api/auth/logout', { method: 'POST' }, csrf),
  create: <K extends CollectionName>(collection: K, record: Workspace[K] extends Array<infer T> ? T : never, csrf: string) =>
    request(`/api/data/${collection}`, { method: 'POST', body: JSON.stringify(record) }, csrf),
  update: <K extends CollectionName>(collection: K, record: Workspace[K] extends Array<infer T> ? T : never, id: string, csrf: string) =>
    request(`/api/data/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(record) }, csrf),
  remove: (collection: CollectionName, id: string, csrf: string) =>
    request<void>(`/api/data/${collection}/${id}`, { method: 'DELETE' }, csrf),
  savePreferences: (preferences: Workspace['preferences'], csrf: string) =>
    request<Workspace['preferences']>('/api/preferences', { method: 'PUT', body: JSON.stringify(preferences) }, csrf),
};
