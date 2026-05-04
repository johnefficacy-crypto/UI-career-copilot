'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'career-copilot-theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
