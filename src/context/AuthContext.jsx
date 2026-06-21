import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const SESSION_KEY = 'tic-toc-pharma-session';

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
        const matchedUser = demoUsers.find(
          (demoUser) =>
            demoUser.email === email.trim().toLowerCase() && demoUser.password === password,
        );

        if (matchedUser) {
          const { password: _password, ...sessionUser } = matchedUser;
          setUser(sessionUser);
          return { ok: true };
        }

        return {
          ok: false,
          message:
            'Credenciales no válidas. Usa cliente@demo.com / demo123 o admin@demo.com / admin123.',
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
