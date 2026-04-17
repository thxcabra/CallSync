const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002/api';

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

interface ApiOptions {
  body?: unknown;
  formData?: FormData;
  authorName?: string;
  signal?: AbortSignal;
}

export async function api<T>(method: string, path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.authorName) headers['x-author-name'] = opts.authorName;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body, signal: opts.signal });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = typeof data === 'string' ? data : data?.error ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data?.details);
  }
  return data as T;
}
