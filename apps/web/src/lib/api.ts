import type { ApiResponse } from '@certindo/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('certindo_access_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T> | { success: false; error: { message: string } };
  if (!response.ok || !payload.success) {
    throw new ApiRequestError(payload.success ? 'Permintaan gagal' : payload.error.message, response.status);
  }
  return payload.data;
}
