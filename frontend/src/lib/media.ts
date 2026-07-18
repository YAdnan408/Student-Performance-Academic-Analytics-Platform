const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/** Turn backend upload paths into absolute URLs the browser can fetch. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
