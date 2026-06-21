import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const SESSION_KEY = 'tic-toc-pharma-session';

const demoUser = {
  id: 'demo-client',
  name: 'Cliente Demo',
  email: 'cliente@demo.com',
  role: 'client',
  company: 'Farmacia Demo del Norte',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem(SESSION_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: ({ email, password }) => {
        if (email.trim().toLowerCase() === 'cliente@demo.com' && password === 'demo123') {
          setUser(demoUser);
          return { ok: true };
        }

        return {
          ok: false,
          message: 'Credenciales no validas. Usa cliente@demo.com / demo123 para la demo.',
        };
      },
      logout: () => setUser(null),
    }),
    [user],
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
