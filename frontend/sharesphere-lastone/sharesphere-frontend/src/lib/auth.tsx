import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';
import type { Member, Role } from './types';

interface AuthCtx {
  user: Member | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<Member>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (m: Member) => void;
  hasRole: (...r: Role[]) => boolean;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Member | null>(() => (tokenStore.get() ? tokenStore.getUser() : null));
  const [ready, setReady] = useState(!tokenStore.get());

  const logout = useCallback(() => { tokenStore.clear(); setUserState(null); }, []);
  const setUser = useCallback((m: Member) => { tokenStore.setUser(m); setUserState(m); }, []);
  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  const refresh = useCallback(async () => { setUser(await api.me()); }, [setUser]);

  // Validate any stored session against the backend once on load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(setUser).catch(() => logout()).finally(() => setReady(true));
  }, [setUser, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    tokenStore.set(res.token);
    tokenStore.setUser(res.member);
    let full = res.member;
    try { full = await api.me(); } catch { /* keep login payload */ }
    setUser(full);
    return full;
  }, [setUser]);

  const value = useMemo<AuthCtx>(() => ({
    user, ready, login, logout, refresh, setUser,
    hasRole: (...r) => !!user && r.includes(user.role),
  }), [user, ready, login, logout, refresh, setUser]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
