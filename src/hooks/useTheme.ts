/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'rs-theme';

/**
 * Resolve the theme a fresh visitor should get: their explicit choice wins,
 * otherwise we follow the operating system preference.
 *
 * Kept as a standalone function so the blocking pre-render script in
 * index.html can use identical logic — any divergence there shows up as a
 * visible flash of the wrong theme on load.
 *
 * A `?theme=light|dark` query override is honoured for both, which lets QA and
 * headless screenshotting force a theme without touching OS or storage state.
 */
export const resolveInitialTheme = (): Theme => {
  const fromUrl = new URLSearchParams(window.location.search).get('theme');
  if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can throw in private browsing / blocked-cookie contexts — fall through
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useTheme = () => {
  // Lazy initialiser: read once, synchronously, before first paint.
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Persisting is best-effort; the in-memory theme still applies this session
    }
  }, [theme]);

  const toggleTheme = useCallback(
    (next: Theme) => setTheme(next),
    [],
  );

  return { theme, setTheme: toggleTheme };
};
