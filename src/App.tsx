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
import { Dialog } from './components/Dialog';
import { BackupNudge } from './components/BackupNudge';
import { JournalEntry, TrashItem, ConsideredCard, MTGCard } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Menu } from 'lucide-react';
import { cn } from './lib/utils';
import Fuse from 'fuse.js';
import { saveAs } from 'file-saver';
import { useTheme } from './hooks/useTheme';
import { journalStorage, JournalMigrationStatus, createDebouncedSaver, StorageSaveCoordinator } from './storage/journalStorage';
import { createBackup, parseBackup } from './storage/backup';
import { shouldShowBackupNudge, dismissBackupNudge, acknowledgeBackup } from './lib/backupNudge';

interface DialogState {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

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
  // Considered / sleeved cards library
  const [consideredResult] = useState(() => journalStorage.loadConsideredCards());
  const [consideredCards, setConsideredCards] = useState<ConsideredCard[]>(consideredResult.value);
  const [inspectCard, setInspectCard] = useState<string | null>(null);
  // The entry just deleted, if any — drives the undo toast.
  const [lastDeleted, setLastDeleted] = useState<{ id: string; title: string } | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  // Replaces native alert/confirm, which are unstyled and unevenly announced.
  const [dialog, setDialog] = useState<DialogState | null>(null);
  // Reminder that the journal has no server-side copy.
  const [nudgeState, setNudgeState] = useState(() => journalStorage.loadBackupNudge());
  const isFirstRender = useRef(true);

  const entrySaver = useRef<StorageSaveCoordinator | null>(null);
  if (!entrySaver.current) {
    entrySaver.current = createDebouncedSaver((toSave) => {
      const ok = journalStorage.saveEntries(toSave);
      if (!ok) setQuotaExceeded(true);
      return ok;
    }, 300);
  }

  // Ensure any pending save is immediately flushed if the tab is closed or hidden
  useEffect(() => {
    const flushSave = () => {
      entrySaver.current?.flush();
    };

    window.addEventListener('beforeunload', flushSave);
    window.addEventListener('pagehide', flushSave);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', flushSave);
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', handleVisibility);
      flushSave();
    };
  }, []);

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
      // Cmd+S / Ctrl+S for Save (prevent browser dialog, trigger visual save & immediate disk flush)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        entrySaver.current?.flush();
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 800);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Persistence — debounced through entrySaver so keystrokes remain 60fps non-blocking,
  // with guaranteed flush on blur/unload/manual save.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    entrySaver.current?.schedule(entries);
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

  const showBackupNudge = shouldShowBackupNudge(nudgeState, entries.length);

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
    entrySaver.current?.flush();
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

  const handleToggleConsidered = (card: MTGCard) => {
    setConsideredCards(prev => {
      const exists = prev.some(c => c.name.toLowerCase() === card.name.toLowerCase());
      let updated: ConsideredCard[];
      if (exists) {
        updated = prev.filter(c => c.name.toLowerCase() !== card.name.toLowerCase());
      } else {
        const newCard: ConsideredCard = {
          id: card.id || String(Date.now()),
          name: card.name,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          image_uri: card.image_uris?.normal,
          scryfall_uri: card.scryfall_uri,
          sleevedAt: new Date().toISOString(),
        };
        updated = [newCard, ...prev];
      }
      journalStorage.saveConsideredCards(updated);
      return updated;
    });
  };

  const handleRemoveConsidered = (cardName: string) => {
    setConsideredCards(prev => {
      const updated = prev.filter(c => c.name.toLowerCase() !== cardName.toLowerCase());
      journalStorage.saveConsideredCards(updated);
      return updated;
    });
  };

  const handleSelectConsideredCard = (cardName: string) => {
    setInspectCard(cardName);
    if (!selectedId && entries.length > 0) {
      setSelectedId(entries[0].id);
    }
    setIsSidebarOpen(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  /**
   * Export the full archive as a JSON file. Everything the app persists ships
   * in one payload — entries, trash, and the Consideration Library.
   */
  const handleBackup = () => {
    entrySaver.current?.flush();
    // Taking a backup retires the reminder permanently.
    const nextNudge = acknowledgeBackup();
    journalStorage.saveBackupNudge(nextNudge);
    setNudgeState(nextNudge);
    const payload = createBackup(entries, trash, consideredCards);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const stamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `sideboard-backup-${stamp}.json`);
  };

  const handleDismissNudge = () => {
    const nextNudge = dismissBackupNudge(entries.length);
    journalStorage.saveBackupNudge(nextNudge);
    setNudgeState(nextNudge);
  };

  /**
   * Replace the archive from a previously exported backup.
   * Validation lives in `parseBackup` so a bad file cannot wipe good data, and
   * the shape is covered by unit tests. Accepts bare-array, v2 and v3 files.
   */
  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      let restored: ReturnType<typeof parseBackup>;
      try {
        restored = parseBackup(JSON.parse(String(reader.result)));
      } catch {
        restored = null;
      }
      if (!restored) {
        setDialog({
          title: 'Could not read that backup',
          body: 'That file does not look like a Reflective Sideboard backup, or it contains no usable entries. Your current library has not been changed.',
        });
        return;
      }

      const { entries: nextEntries, recentlyDeleted, consideredCards: nextConsidered } = restored;
      const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
      setDialog({
        title: 'Restore this backup?',
        body:
          `This backup contains ${plural(nextEntries.length, 'entry', 'entries')}, ` +
          `${plural(recentlyDeleted.length, 'deleted entry', 'deleted entries')}, ` +
          `and ${plural(nextConsidered.length, 'considered card', 'considered cards')}. ` +
          `Restoring replaces your current ${plural(entries.length, 'entry', 'entries')}` +
          (entries.length > 0 ? ', which will be lost unless you export a backup first' : '') +
          '. This cannot be undone.',
        confirmLabel: 'Restore',
        onConfirm: () => {
          entrySaver.current?.cancel();
          journalStorage.saveEntries(nextEntries);
          journalStorage.saveTrash(recentlyDeleted);
          journalStorage.saveConsideredCards(nextConsidered);
          setEntries(nextEntries);
          setTrash(recentlyDeleted);
          setConsideredCards(nextConsidered);
          setLastDeleted(null);
          setSelectedId(null);
          setSearchQuery('');
          setSelectedTags([]);
          setDialog(null);
        },
      });
    };
    reader.onerror = () => setDialog({
      title: 'Could not read that file',
      body: 'The backup could not be opened. Your current library has not been changed.',
    });
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
        consideredCards={consideredCards}
        onSelectCard={handleSelectConsideredCard}
        onRemoveConsideredCard={handleRemoveConsidered}
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
                consideredCards={consideredCards}
                onToggleConsideredCard={handleToggleConsidered}
                activeInspectCard={inspectCard}
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
                  aria-label="Open sidebar"
                  aria-expanded={isSidebarOpen}
                  aria-controls="journal-sidebar"
                  className="p-2 border border-line bg-surface rounded-lg text-faint hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Menu className="w-5 h-5" aria-hidden="true" />
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
              {/* First thing a new visitor needs to know: there is no server holding their notes. */}
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-faint">
                Your journal lives in this browser only — no account, no upload.
                Back it up any time from the sidebar.
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

      {(storageNotice || quotaExceeded) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-line bg-surface px-4 py-3 text-xs text-body shadow-xl flex items-center justify-between gap-3"
        >
          <span>{quotaExceeded ? 'Browser storage is full! Please export a library backup.' : storageNotice}</span>
          {quotaExceeded && (
            <button
              onClick={() => setQuotaExceeded(false)}
              className="text-muted hover:text-ink font-bold text-sm px-1"
              aria-label="Dismiss warning"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Decorative Texture Overlays - offline friendly SVG pattern */}
      <div className="fixed inset-0 pointer-events-none hidden [&:where(:root[data-theme=dark]_*)]:block opacity-[0.03] bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* Undo toast for soft-deleted entries — rendered outside the flex
          layout so it isn't clipped by the overflow-hidden containers. */}
      {/* The undo toast and the backup nudge share the same corner, so stack
          them rather than letting one cover the other. */}
      <AnimatePresence>
        {showBackupNudge && (
          <BackupNudge
            stackedAbove={Boolean(lastDeleted)}
            onBackup={handleBackup}
            onDismiss={handleDismissNudge}
          />
        )}
      </AnimatePresence>

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

      {dialog && (
        <Dialog
          title={dialog.title}
          body={dialog.body}
          confirmLabel={dialog.confirmLabel}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
