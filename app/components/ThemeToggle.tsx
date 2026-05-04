'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="cc-theme-toggle"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="cc-theme-toggle-icon" aria-hidden="true">{isDark ? '🌙' : '☀️'}</span>
      <span className="cc-theme-toggle-label">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
