import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(fn);
  run.current = fn;
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError(null);
    try {
      const d = await run.current();
      if (id === seq.current) setData(d);
    } catch (e) {
      if (id === seq.current) setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) void load(); else setLoading(false); /* eslint-disable-next-line */ }, [enabled, ...deps]);
  return { data, loading, error, reload: load, setData };
}

export function usePaged<T>(items: T[], size = 9) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { page, setPage, pages, slice: items.slice((page - 1) * size, page * size), total: items.length };
}

export const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
