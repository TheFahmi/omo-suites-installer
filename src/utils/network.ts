import { debugLog } from './debug.ts';

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 10000, retries = 2, retryDelayMs = 1000, ...fetchInit } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Simple signal handling - use provided if exists, else timeout controller
      const signal = options.signal || controller.signal;

      debugLog('network', `[Attempt ${attempt + 1}/${retries + 1}] Fetching ${url} with timeout ${timeoutMs}ms`);
      const response = await fetch(url, { ...fetchInit, signal });

      clearTimeout(timeoutId);

      // Only retry on 5xx server errors, not 4xx client errors
      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error: unknown) {
      lastError = error;
      const isAbort = error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'));

      debugLog('network', `[Attempt ${attempt + 1} Failed] ${url}: ${error instanceof Error ? error.message : String(error)}`);

      // Don't retry on aborts (timeouts) unless it's a server connection timeout
      if (attempt < retries && !isAbort) {
        debugLog('network', `Waiting ${retryDelayMs}ms before next attempt...`);
        await new Promise(r => setTimeout(r, retryDelayMs));
      } else {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}