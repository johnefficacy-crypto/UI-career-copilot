'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme} className="cc-theme-toggle" aria-label="Toggle theme" title="Toggle theme">
      <span className="cc-theme-toggle-icon" aria-hidden="true">◐</span>
      <span className="cc-theme-toggle-label">Theme</span>
    </button>
  );
}
