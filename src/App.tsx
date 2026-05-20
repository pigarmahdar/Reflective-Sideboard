/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { JournalEditor } from './components/JournalEditor';
import { JournalEntry } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Menu } from 'lucide-react';
import { cn } from './lib/utils';
import Fuse from 'fuse.js';

const STORAGE_KEY = 'spellbook_journal_entries';

export default function App() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile when selecting an entry
  const handleSelectEntry = (id: string) => {
    setSelectedId(id);
    setIsSidebarOpen(false);
  };

  // Close sidebar when creating new entry on mobile
  const handleCreateEntry = () => {
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: '',
      content: '',
      tags: [],
      lastModified: new Date().toISOString()
    };
    setEntries([newEntry, ...entries]);
    setSelectedId(newEntry.id);
    setIsSidebarOpen(false);
  };


  const handleUpdateEntry = (updates: Partial<JournalEntry>) => {
    if (!selectedId) return;
    setEntries(prev => prev.map(e => 
      e.id === selectedId 
        ? { ...e, ...updates, lastModified: new Date().toISOString() } 
        : e
    ));
  };

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Derived state: All unique tags from all entries
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach(e => e.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [entries]);

  // Filtering logic using Fuse.js for search and simple inclusion for tags
  const filteredEntries = useMemo(() => {
    let result = [...entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (selectedTags.length > 0) {
      result = result.filter(e => 
        selectedTags.every(tag => e.tags.includes(tag))
      );
    }

    if (searchQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: ['title', 'content', 'tags'],
        threshold: 0.3
      });
      result = fuse.search(searchQuery).map(r => r.item);
    }

    return result;
  }, [entries, searchQuery, selectedTags]);

  const selectedEntry = useMemo(() => 
    entries.find(e => e.id === selectedId) || null,
  [entries, selectedId]);

  const handleDeleteEntry = () => {
    if (!selectedId) return;
    if (confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
      setEntries(prev => prev.filter(e => e.id !== selectedId));
      setSelectedId(null);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex bg-paper min-h-screen overflow-hidden selection:bg-accent/20">
      <Sidebar 
        entries={filteredEntries}
        selectedId={selectedId}
        onSelect={handleSelectEntry}
        onNew={handleCreateEntry}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        tags={allTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedEntry ? (
            <motion.div
              key={selectedEntry.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full overscroll-none"
            >
              <JournalEditor 
                entry={selectedEntry}
                onChange={handleUpdateEntry}
                onDelete={handleDeleteEntry}
                onOpenSidebar={() => setIsSidebarOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-950 relative"
            >
              <div className="absolute top-6 left-6 md:hidden">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 border border-slate-800 bg-slate-900 rounded-lg text-slate-400 hover:text-white"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
                 <div className="relative w-20 h-20 bg-slate-900 rounded-2xl shadow-2xl flex items-center justify-center border border-slate-800">
                    <BookOpen className="w-10 h-10 text-indigo-500" />
                 </div>
                 <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 rounded-xl shadow-lg flex items-center justify-center text-white"
                 >
                    <Sparkles className="w-4 h-4" />
                 </motion.div>
              </div>
              <h2 className="text-3xl font-bold font-sans text-white mb-3 tracking-tight">Reflective Sideboard</h2>
              <p className="max-w-xs text-slate-500 leading-relaxed text-sm font-medium">
                Log your matches, theorycraft your next brew, and track your card interactions with Scryfall integration.
              </p>
              
              <button 
                onClick={handleCreateEntry}
                className="mt-8 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
              >
                Create New Entry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Texture Overlays */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
    </div>
  );
}
