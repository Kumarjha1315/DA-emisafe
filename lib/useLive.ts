import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribe } from './store';

/**
 * Live data hook: loads immediately, re-loads on any store mutation (event bus),
 * and polls every 4s so parallel browser tabs / role sessions stay in sync.
 */
export function useLive<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    try {
      const d = await loader();
      if (mounted.current) {
        setData(d);
        setLoading(false);
      }
    } catch {
      if (mounted.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    mounted.current = true;
    load();
    const unsub = subscribe(load);
    const iv = setInterval(load, 4000);
    return () => {
      mounted.current = false;
      unsub();
      clearInterval(iv);
    };
  }, [load]);

  return { data, loading, reload: load };
}
