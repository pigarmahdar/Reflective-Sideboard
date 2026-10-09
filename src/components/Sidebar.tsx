/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { JournalEntry } from '../types';
import { cn, formatDate } from '../lib/utils';
import { Plus, Tag, Search, Hash, Clock, BookOpen, X, ArchiveRestore, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../hooks/useTheme';

interface SidebarProps {
  entries: JournalEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  selectedId,
  onSelect,
  onNew,
  searchQuery,
  setSearchQuery,
  tags,
  selectedTags,
  onToggleTag,
  isOpen,
  onClose,
  theme,
  onThemeChange,
  onBackup,
  onRestore
}) => {
  // Hidden file input so restore is a native picker rather than a drag-and-drop surface
  const restoreInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-72 bg-paper md:bg-surface/50 border-r border-line flex flex-col h-screen shrink-0 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-ink leading-tight">
                Reflective<br/>
                <span className="text-indigo-400 font-medium">Sideboard</span>
              </h1>
            </div>
            <button onClick={onClose} className="md:hidden text-faint hover:text-ink">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative group mb-6 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
            <input 
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-raised/50 border border-line rounded-lg py-2 pl-10 pr-4 text-xs text-body focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-muted"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0 space-y-6 overflow-hidden">
            {/* Tags Section */}
            {tags.length > 0 && (
              <div className="shrink-0">
                <label className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3 block">Filter by Tags</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggleTag(tag)}
                      className={cn(
                        "px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        selectedTags.includes(tag) 
                          ? "bg-accent text-white" 
                          : "bg-surface-raised text-faint hover:bg-surface-overlay hover:text-ink"
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Entries Section */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3 block shrink-0">Recent Entries</label>
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-1">
                {entries.length === 0 ? (
                  <div className="py-4 px-2">
                    <p className="text-xs text-muted italic">No entries found.</p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => onSelect(entry.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-md transition-all group",
                        selectedId === entry.id 
                          ? "bg-indigo-600/10 border-l-2 border-indigo-500 rounded-r-md text-indigo-100" 
                          : "hover:bg-surface-raised/50 text-faint"
                      )}
                    >
                      <div className="font-medium text-sm truncate">
                        {entry.title || "Untitled Entry"}
                      </div>
                      <div className="text-[11px] opacity-60 mt-1 flex items-center gap-2">
                        {formatDate(entry.date)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-line shrink-0 space-y-2">
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />

          <button
            type="button"
            onClick={onNew}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Entry</span>
            <kbd className="ml-1 hidden h-5 select-none items-center rounded border border-accent/60 bg-accent/40 px-1.5 font-mono text-[10px] font-bold text-white lg:inline-flex">
              ⌘N
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackup}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface/50 px-3 py-2 text-xs font-medium text-faint transition-all hover:border-line-strong hover:text-ink"
              title="Download your full journal as JSON"
            >
              <ArchiveRestore className="w-3.5 h-3.5" aria-hidden="true" />
              Library Backup
            </button>
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface/50 p-2 text-faint transition-all hover:border-line-strong hover:text-ink"
              title="Restore from a backup file (replaces current library)"
              aria-label="Restore from backup"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onRestore(file);
                // Reset so picking the same file again still fires change
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </aside>
    </>
  );
};
