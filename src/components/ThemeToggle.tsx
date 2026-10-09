/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const MODES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onThemeChange }) => {
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="grid w-full grid-cols-2 gap-1 rounded-lg border border-line bg-surface/50 p-1 backdrop-blur-sm"
    >
      {MODES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => onThemeChange(value)}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5',
            'text-[11px] font-bold uppercase tracking-wider transition-all',
            theme === value
              ? 'bg-accent text-white shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
};
