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

export async function apiDownload(path: string, fallbackFileName: string): Promise<void> {
  const token = window.localStorage.getItem('certindo_access_token');
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiRequestError(payload?.error?.message ?? 'File gagal diunduh', response.status);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fallbackFileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
