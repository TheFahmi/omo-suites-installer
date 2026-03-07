const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async healthCheck(): Promise<{ openCode: { status: string } } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },
};
