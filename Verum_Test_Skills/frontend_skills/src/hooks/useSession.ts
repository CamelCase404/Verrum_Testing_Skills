import { useCallback, useEffect, useState } from 'react';
import type { SessionState } from '../types';

const KEY = 'verum.session.v1';

function read(): SessionState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed.interviewId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(() => read());

  useEffect(() => {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }, [session]);

  const save = useCallback((s: SessionState) => setSession(s), []);
  const clear = useCallback(() => setSession(null), []);

  return { session, save, clear };
}
