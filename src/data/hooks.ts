import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile } from '@/types/domain';
import { store } from './index';

interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Executa uma leitura e repete sempre que os dados mudarem
 * (escrita local ou alteração de outro usuário via realtime).
 */
export function useStoreQuery<T>(fn: () => Promise<T>, deps: unknown[]): QueryState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => store.subscribe(reload), [reload]);

  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return { data, error, loading, reload };
}

export function useProfiles() {
  const { data } = useStoreQuery(() => store.listProfiles(), []);
  return useMemo(() => {
    const profiles: Profile[] = data ?? [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return {
      profiles,
      activeProfiles: profiles.filter((p) => p.active),
      nameOf: (id: string | null | undefined) => (id ? (byId.get(id)?.full_name ?? '—') : '—'),
    };
  }, [data]);
}

export function useCurrentUserId(): string | null {
  const { data } = useStoreQuery(() => store.currentUserId(), []);
  return data ?? null;
}
