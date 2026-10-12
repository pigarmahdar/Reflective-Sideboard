/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { JournalEditor } from './components/JournalEditor';
import { UndoToast } from './components/UndoToast';
import { JournalEntry, TrashItem } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Menu } from 'lucide-react';
import { cn } from './lib/utils';
import Fuse from 'fuse.js';
import { saveAs } from 'file-saver';
import { useTheme } from './hooks/useTheme';
import { journalStorage, JournalMigrationStatus } from './storage/journalStorage';

const BACKUP_SCHEMA_VERSION = 2;

// Deliberately outside the component so the notification reflects the actual
// one-time load/migration outcome rather than changing on later renders.
const MIGRATION_NOTICES: Record<JournalMigrationStatus, string | null> = {
  canonical: null,
  migrated: 'Journal migrated to the new local storage key.',
  empty: null,
  'legacy-empty': 'Your previous journal was empty, so no entries needed migrating.',
  'legacy-invalid': 'Some journal data could not be migrated safely. The original data was left untouched.',
  'storage-unavailable': 'Browser storage is unavailable. Changes will not persist after this tab is closed.',
  'storage-write-failed': 'The migrated journal could not be written to the new storage key. The original data was left untouched.',
};

const TRASH_NOTICES: Record<string, string | null> = {
  loaded: null,
  missing: null,
  invalid: 'Some recently deleted data could not be loaded safely and was left untouched.',
  'storage-unavailable': 'Browser storage is unavailable. Deleted entries will not persist after this tab is closed.',
};

export default function App() {
  const { theme, setTheme } = useTheme();
  // Read through the repository boundary so React never depends on storage
  // keys or legacy schema details. The repository also performs the one-time
  // legacy-key migration and preserves the old payload on failure.
  const [entriesResult] = useState(() => journalStorage.loadEntries());
  const [entries, setEntries] = useState<JournalEntry[]>(entriesResult.entries);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Soft-deleted entries awaiting either "Put back" or permanent removal.
  const [trashResult] = useState(() => journalStorage.loadTrash());
  const [trash, setTrash] = useState<TrashItem[]>(trashResult.value);
  // The entry just deleted, if any — drives the undo toast.
  const [lastDeleted, setLastDeleted] = useState<{ id: string; title: string } | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
    setEntries(prev => [newEntry, ...prev]);
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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+N / Ctrl+N for New Entry
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateEntry();
      }
      // Cmd+S / Ctrl+S for Save (prevent browser dialog, trigger visual save)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 800);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Persistence — kept behind journalStorage so this component only manages
  // application state, not browser-storage keys or serialization.
  useEffect(() => {
    journalStorage.saveEntries(entries);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setIsSaving(true);
    const timer = setTimeout(() => {
      setIsSaving(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [entries]);

  // Trash persistence — kept in its own key so the legacy entries key is untouched.
  useEffect(() => {
    journalStorage.saveTrash(trash);
  }, [trash]);

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

    if (debouncedSearchQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: ['title', 'content', 'tags'],
        threshold: 0.3
      });
      result = fuse.search(debouncedSearchQuery).map(r => r.item);
    }

    return result;
  }, [entries, debouncedSearchQuery, selectedTags]);

  const selectedEntry = useMemo(() => 
    entries.find(e => e.id === selectedId) || null,
  [entries, selectedId]);

  // Keep the one-time storage load outcomes visible without changing this
  // notice on later saves. Prefer the entries migration result, then trash.
  const storageNotice = useMemo(
    () => MIGRATION_NOTICES[entriesResult.migrationStatus] ?? TRASH_NOTICES[trashResult.status],
    [entriesResult.migrationStatus, trashResult.status],
  );

  /**
   * Soft delete: move the entry to the trash and show an undo toast instead
   * of blocking on a native confirm dialog. Nothing is lost — the entry
   * object is kept whole so "Put back" is lossless.
   */
  const handleDeleteEntry = () => {
    if (!selectedId) return;
    const entry = entries.find(e => e.id === selectedId);
    if (!entry) return;

    const deletedAt = new Date().toISOString();
    setTrash(prev => [{ entry, deletedAt }, ...prev]);
    setEntries(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
    setLastDeleted({ id: entry.id, title: entry.title });
  };

  /** Undo a soft delete (from the toast or from the trash panel). */
  const handlePutBack = (id: string) => {
    const item = trash.find(t => t.entry.id === id);
    if (!item) return;
    setEntries(prev => [item.entry, ...prev]);
    setTrash(prev => prev.filter(t => t.entry.id !== id));
    if (lastDeleted?.id === id) setLastDeleted(null);
  };

  /** Permanently remove an entry from the trash. */
  const handleTrashEntry = (id: string) => {
    setTrash(prev => prev.filter(t => t.entry.id !== id));
    if (lastDeleted?.id === id) setLastDeleted(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  /**
   * Export the full archive as a JSON file. `entries` is the live library
   * (not the filtered view); the trash ships alongside it under its own
   * `recentlyDeleted` key so nothing is silently dropped.
   */
  const handleBackup = () => {
    const payload = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'reflective-sideboard',
      entries,
      recentlyDeleted: trash,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const stamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `sideboard-backup-${stamp}.json`);
  };

  /**
   * Replace the archive from a previously exported backup.
   * Validates shape before touching state so a bad file cannot wipe good data.
   * Accepts a `recentlyDeleted` key (schema v2); older backups default to an
   * empty trash.
   */
  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const candidate = Array.isArray(parsed) ? parsed : parsed?.entries;
        if (!Array.isArray(candidate)) {
          alert('That file does not look like a Reflective Sideboard backup.');
          return;
        }
        // Minimal per-record check: title/content/date are what the UI relies on.
        const normaliseEntry = (e: any): JournalEntry => ({
          id: typeof e.id === 'string' && e.id ? e.id : crypto.randomUUID(),
          title: typeof e.title === 'string' ? e.title : '',
          content: e.content,
          date: typeof e.date === 'string' ? e.date : new Date().toISOString(),
          lastModified: typeof e.lastModified === 'string' ? e.lastModified : new Date().toISOString(),
          tags: Array.isArray(e.tags) ? e.tags.filter((t: unknown) => typeof t === 'string') : [],
        });

        const normalised: JournalEntry[] = candidate
          .filter(e => e && typeof e === 'object' && typeof e.content === 'string')
          .map(normaliseEntry);

        if (normalised.length === 0) {
          alert('No usable entries found in that backup.');
          return;
        }

        // Trash is optional; older backups omit it entirely.
        const candidateTrash = Array.isArray(parsed?.recentlyDeleted) ? parsed.recentlyDeleted : [];
        const normalisedTrash: TrashItem[] = candidateTrash
          .filter((t: any) => t && typeof t === 'object' && t.entry && typeof t.entry === 'object' && typeof t.entry.content === 'string')
          .map((t: any) => ({
            entry: normaliseEntry(t.entry),
            deletedAt: typeof t.deletedAt === 'string' ? t.deletedAt : new Date().toISOString(),
          }));

        const ok = confirm(
          `Restore ${normalised.length} ${normalised.length === 1 ? 'entry' : 'entries'}? ` +
          `This replaces your current ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} and cannot be undone.`
        );
        if (!ok) return;

        setEntries(normalised);
        setTrash(normalisedTrash);
        setLastDeleted(null);
        setSelectedId(null);
        setSearchQuery('');
        setSelectedTags([]);
      } catch {
        alert('Could not read that file as JSON.');
      }
    };
    reader.onerror = () => alert('Could not read that file.');
    reader.readAsText(file);
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
        theme={theme}
        onThemeChange={setTheme}
        onBackup={handleBackup}
        onRestore={handleRestore}
        trash={trash}
        onPutBack={handlePutBack}
        onDeleteForever={handleTrashEntry}
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
                isSaving={isSaving}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-paper relative"
            >
              <div className="absolute top-6 left-6 md:hidden">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 border border-line bg-surface rounded-lg text-faint hover:text-ink"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
                 <div className="relative w-20 h-20 bg-surface rounded-2xl shadow-2xl flex items-center justify-center border border-line">
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
              <h2 className="text-3xl font-bold font-sans text-ink mb-3 tracking-tight">Reflective Sideboard</h2>
              <p className="max-w-xs text-muted leading-relaxed text-sm font-medium">
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

      {storageNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-line bg-surface px-4 py-3 text-xs text-body shadow-xl"
        >
          {storageNotice}
        </div>
      )}

      {/* Decorative Texture Overlays */}
      <div className="fixed inset-0 pointer-events-none hidden [&:where(:root[data-theme=dark]_*)]:block opacity-[0.02] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>

      {/* Undo toast for soft-deleted entries — rendered outside the flex
          layout so it isn't clipped by the overflow-hidden containers. */}
      <AnimatePresence>
        {lastDeleted && (
          <UndoToast
            key={lastDeleted.id}
            entryTitle={lastDeleted.title}
            onUndo={() => handlePutBack(lastDeleted.id)}
            onDismiss={() => setLastDeleted(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
