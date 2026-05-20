/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { JournalEntry } from '../types';
import { cn, formatDate } from '../lib/utils';
import { Plus, Tag, Search, Hash, Clock, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  onClose
}) => {
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
        "fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-950 md:bg-slate-900/50 border-r border-slate-800 flex flex-col h-screen shrink-0 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                Reflective<br/>
                <span className="text-indigo-400 font-medium">Sideboard</span>
              </h1>
            </div>
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

        <div className="relative group mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="space-y-8">
          {/* Tags Section */}
          {tags.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 block">Filter by Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                      selectedTags.includes(tag) 
                        ? "bg-indigo-600 text-white" 
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entries Section */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 block">Recent Entries</label>
            <div className="space-y-1">
              {entries.length === 0 ? (
                <div className="py-4 px-2">
                  <p className="text-xs text-slate-600 italic">No entries found.</p>
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
                        : "hover:bg-slate-800/50 text-slate-400"
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
      
      <div className="mt-auto p-6 border-t border-slate-800">
        <button 
          onClick={onNew}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Entry</span>
        </button>
      </div>
    </aside>
    </>
  );
};
