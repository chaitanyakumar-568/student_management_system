import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { setCsrfToken, setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true); // true until the first /auth/me check completes

  // Verify the session with the server on every page load/refresh.
  useEffect(() => {
    let active = true;
    authService
      .getMe()
      .then((data) => {
        if (!active) return;
        setCsrfToken(data.csrfToken);
        setAdmin(data.admin);
      })
      .catch(() => {
        if (!active) return;
        setCsrfToken(null);
        setAdmin(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // If any API call returns 401 (expired session), drop local auth state -> ProtectedRoute redirects.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCsrfToken(null);
      setAdmin(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setCsrfToken(data.csrfToken);
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setCsrfToken(null);
      setAdmin(null);
    }
  }, []);

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
