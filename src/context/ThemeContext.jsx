import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'tic-toc-pharma-theme';

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialThemePreference() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  } catch {
    // Fall through to system preference.
  }
  return 'system';
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(getInitialThemePreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = themePreference === 'system' ? systemTheme : themePreference;

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    document.documentElement.dataset.theme = theme;
  }, [theme, themePreference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return undefined;

    const syncSystemTheme = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', syncSystemTheme);
    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      themePreference,
      setThemePreference,
      toggleTheme: () => setThemePreference((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark')),
    }),
    [theme, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
}
