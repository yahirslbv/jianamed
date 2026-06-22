import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginWithApi, logout as logoutWithApi } from '../services/authService.js';
import { shouldUseLocalFallback } from '../services/apiClient.js';

const AuthContext = createContext(null);
const FALLBACK_SESSION_KEY = 'tic-toc-pharma-fallback-session';
const LEGACY_SESSION_KEY = 'tic-toc-pharma-session';

const demoUsers = [
  {
    id: 'demo-client',
    name: 'Cliente Demo',
    email: 'cliente@demo.com',
    password: 'demo123',
    role: 'client',
    company: 'Farmacia Demo del Norte',
  },
  {
    id: 'demo-admin',
    name: 'Admin Demo',
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'admin',
    company: 'Tic Toc Pharma',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser =
        localStorage.getItem(FALLBACK_SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((response) => {
        if (!isMounted) return;
        setUser(response.user);
        localStorage.removeItem(FALLBACK_SESSION_KEY);
        localStorage.removeItem(LEGACY_SESSION_KEY);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (!shouldUseLocalFallback(error)) {
          setUser(null);
          localStorage.removeItem(FALLBACK_SESSION_KEY);
          localStorage.removeItem(LEGACY_SESSION_KEY);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async ({ email, password }) => {
        try {
          const response = await loginWithApi({ email, password });
          setUser(response.user);
          localStorage.removeItem(FALLBACK_SESSION_KEY);
          localStorage.removeItem(LEGACY_SESSION_KEY);
          return { ok: true, user: response.user };
        } catch (error) {
          if (!shouldUseLocalFallback(error)) {
            return { ok: false, message: error.message };
          }

        const matchedUser = demoUsers.find(
          (demoUser) =>
            demoUser.email === email.trim().toLowerCase() && demoUser.password === password,
        );

        if (matchedUser) {
          const { password: _password, ...sessionUser } = matchedUser;
          setUser(sessionUser);
          localStorage.setItem(FALLBACK_SESSION_KEY, JSON.stringify(sessionUser));
          return { ok: true, user: sessionUser };
        }

        return {
          ok: false,
          message:
            'Credenciales no válidas. Usa cliente@demo.com / demo123 o admin@demo.com / admin123.',
        };
        }
      },
      logout: async () => {
        try {
          await logoutWithApi();
        } catch {
          // The local fallback is still cleared even if the API is offline.
        }
        setUser(null);
        localStorage.removeItem(FALLBACK_SESSION_KEY);
        localStorage.removeItem(LEGACY_SESSION_KEY);
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
