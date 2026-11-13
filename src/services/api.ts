import type { ApiResponse } from '../types';

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }

  return json.data as T;
}

export const api = {
  // Auth
  authStatus: () => request<{ authenticated: boolean; setupRequired: boolean }>('/auth/status'),
  setup: (data: { password: string; email?: string; displayName?: string }) =>
    request('/auth/setup', { method: 'POST', body: JSON.stringify(data) }),
  login: (password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Brands
  getBrands: () => request<any[]>('/brands'),
  createBrand: (data: { name: string; timezone?: string; description?: string }) =>
    request('/brands', { method: 'POST', body: JSON.stringify(data) }),
  updateBrand: (id: string, data: Partial<{ name: string; timezone: string; description: string }>) =>
    request(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBrand: (id: string) => request(`/brands/${id}`, { method: 'DELETE' }),

  // Accounts
  getAccounts: (brandId?: string) =>
    request<any[]>(`/accounts${brandId ? `?brandId=${brandId}` : ''}`),
  connectFacebook: (brandId: string) =>
    request<{ url: string }>(`/accounts/connect/facebook?brandId=${brandId}`),
  disconnectAccount: (id: string) => request(`/accounts/${id}`, { method: 'DELETE' }),

  // Posts
  getPosts: (params?: { brandId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.brandId) q.set('brandId', params.brandId);
    if (params?.status) q.set('status', params.status);
    return request<any[]>(`/posts?${q}`);
  },
  createPost: (data: unknown) =>
    request('/posts', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getAnalytics: (brandId?: string) =>
    request<any>(`/analytics${brandId ? `?brandId=${brandId}` : ''}`),

  // System
  getSystemStatus: () => request<any>('/system/status'),

  // AI
  aiGenerate: (data: {
    action: string;
    topic?: string;
    platform?: string;
    tone?: string;
    language?: string;
    caption?: string;
  }) => request<{ content: string }>('/ai/generate', { method: 'POST', body: JSON.stringify(data) }),
  aiUsage: () => request<{ today: number; thisMonth: number }>('/ai/usage'),
};
