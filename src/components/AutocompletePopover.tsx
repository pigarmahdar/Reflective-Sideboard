/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Sparkles, CornerDownLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface AutocompletePopoverProps {
  suggestions: string[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (suggestion: string) => void;
}

export const AutocompletePopover: React.FC<AutocompletePopoverProps> = ({
  suggestions,
  selectedIndex,
  position,
  onSelect,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active item into view when navigating via arrow keys
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!suggestions.length) return null;

  return (
    <div
      role="listbox"
      aria-label="Card suggestions"
      className="absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans"
      style={{
        top: `${position.top}px`,
        left: `${Math.max(8, Math.min(position.left, window.innerWidth - 300))}px`,
      }}
    >
      <div className="px-3 py-2 bg-surface-raised/40 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent-mid">
          <Sparkles className="w-3 h-3 text-accent-mid" />
          <span>Card Suggestion</span>
        </div>
        <span className="text-[9px] text-muted font-mono">
          {selectedIndex >= 0 ? selectedIndex + 1 : 1}/{suggestions.length}
        </span>
      </div>

      <div ref={listRef} className="max-h-56 overflow-y-auto py-1 divide-y divide-line/20">
        {suggestions.map((name, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                // Prevent textarea from blurring before selection is applied
                e.preventDefault();
                onSelect(name);
              }}
              className={cn(
                'w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer',
                isSelected
                  ? 'bg-accent-mid text-white font-medium'
                  : 'text-body hover:bg-surface-raised/60 hover:text-ink'
              )}
            >
              <span className="truncate">{name}</span>
              {isSelected && (
                <CornerDownLeft className="w-3 h-3 opacity-80 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-1.5 bg-surface-raised/20 border-t border-line text-[9px] text-muted flex items-center justify-between select-none font-mono">
        <span>↑↓ to navigate</span>
        <span>↵ to pick</span>
        <span>Esc to dismiss</span>
      </div>
    </div>
  );
};
