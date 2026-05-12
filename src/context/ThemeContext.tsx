import React, { createContext, useContext, useEffect, useState } from 'react';
import { useApp } from './AppContext';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const [theme, setTheme] = useState<Theme>('light');

  const resolvedTheme: Theme =
    state.settings.themeMode === 0
      ? theme
      : state.settings.themeMode === 1
        ? 'light'
        : 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
