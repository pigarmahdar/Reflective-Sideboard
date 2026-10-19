/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JournalEntry, TrashItem, ConsideredCard } from '../types.ts';
import { BACKUP_NUDGE_STORAGE_KEY, DEFAULT_BACKUP_NUDGE_STATE } from '../lib/backupNudge.ts';
import type { BackupNudgeState } from '../lib/backupNudge.ts';

export const LEGACY_ENTRIES_KEY = 'spellbook_journal_entries';
export const CURRENT_ENTRIES_KEY = 'sideboard:v1:entries';
export const TRASH_STORAGE_KEY = 'sideboard:v1:trash';
export const CONSIDERED_STORAGE_KEY = 'sideboard:v1:considered_cards';

export type JournalMigrationStatus =
  | 'canonical'
  | 'migrated'
  | 'empty'
  | 'legacy-empty'
  | 'legacy-invalid'
  | 'storage-unavailable'
  | 'storage-write-failed';

export interface JournalLoadResult {
  entries: JournalEntry[];
  migrationStatus: JournalMigrationStatus;
}

export interface StorageLoadResult<T> {
  value: T;
  status: 'loaded' | 'missing' | 'invalid' | 'storage-unavailable';
}

export interface JournalStorage {
  loadEntries(): JournalLoadResult;
  saveEntries(entries: JournalEntry[]): boolean;
  loadTrash(): StorageLoadResult<TrashItem[]>;
  saveTrash(trash: TrashItem[]): boolean;
  loadConsideredCards(): StorageLoadResult<ConsideredCard[]>;
  saveConsideredCards(cards: ConsideredCard[]): boolean;
  loadBackupNudge(): BackupNudgeState;
  saveBackupNudge(state: BackupNudgeState): boolean;
}

export interface StorageSaveCoordinator {
  schedule(entries: JournalEntry[], delayMs?: number): void;
  flush(): boolean;
  cancel(): void;
  isPending(): boolean;
}

export function createDebouncedSaver(
  saveFn: (entries: JournalEntry[]) => boolean,
  defaultDelayMs: number = 300
): StorageSaveCoordinator {
  let timer: any = null;
  let pendingEntries: JournalEntry[] | null = null;

  return {
    schedule(entries: JournalEntry[], delayMs: number = defaultDelayMs) {
      pendingEntries = entries;
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        if (pendingEntries !== null) {
          const toSave = pendingEntries;
          pendingEntries = null;
          saveFn(toSave);
        }
      }, delayMs);
    },
    flush(): boolean {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (pendingEntries !== null) {
        const toSave = pendingEntries;
        pendingEntries = null;
        return saveFn(toSave);
      }
      return true;
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      pendingEntries = null;
    },
    isPending(): boolean {
      return pendingEntries !== null;
    },
  };
}

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** JSON.parse that returns undefined for missing or malformed payloads. */
function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEntry(value: unknown): JournalEntry | null {
  if (!isRecord(value) || typeof value.content !== 'string') return null;

  const date = typeof value.date === 'string' && value.date ? value.date : new Date().toISOString();
  return {
    id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    title: typeof value.title === 'string' ? value.title : '',
    content: value.content,
    date,
    lastModified: typeof value.lastModified === 'string' && value.lastModified ? value.lastModified : date,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  };
}

function normalizeEntries(value: unknown): { entries: JournalEntry[]; invalidCount: number; hasUsableEntry: boolean } | null {
  if (!Array.isArray(value)) return null;

  const entries: JournalEntry[] = [];
  let invalidCount = 0;
  let hasUsableEntry = false;

  for (const candidate of value) {
    const entry = normalizeEntry(candidate);
    if (entry) {
      entries.push(entry);
    } else {
      invalidCount += 1;
    }

    // Preserve a legacy blank entry as a record even though it has no
    // searchable content. The app creates empty entries routinely.
    if (isRecord(candidate) && typeof candidate.content === 'string') {
      hasUsableEntry = true;
    }
  }

  return { entries, invalidCount, hasUsableEntry };
}

function normalizeTrash(value: unknown): TrashItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate): TrashItem[] => {
    if (!isRecord(candidate) || !isRecord(candidate.entry)) return [];
    const entry = normalizeEntry(candidate.entry);
    if (!entry) return [];

    return [{
      entry,
      deletedAt: typeof candidate.deletedAt === 'string' && candidate.deletedAt
        ? candidate.deletedAt
        : new Date().toISOString(),
    }];
  });
}

function normalizeConsideredCards(value: unknown): ConsideredCard[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate): ConsideredCard[] => {
    if (!isRecord(candidate) || typeof candidate.name !== 'string' || !candidate.name.trim()) {
      return [];
    }
    return [{
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : String(Date.now()),
      name: candidate.name.trim(),
      mana_cost: typeof candidate.mana_cost === 'string' ? candidate.mana_cost : undefined,
      type_line: typeof candidate.type_line === 'string' ? candidate.type_line : undefined,
      image_uri: typeof candidate.image_uri === 'string' ? candidate.image_uri : undefined,
      scryfall_uri: typeof candidate.scryfall_uri === 'string' ? candidate.scryfall_uri : undefined,
      sleevedAt: typeof candidate.sleevedAt === 'string' && candidate.sleevedAt ? candidate.sleevedAt : new Date().toISOString(),
    }];
  });
}

function writeJson(storage: Storage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser-storage repository for journal entries, trash, and considered cards.
 *
 * The entries key is namespaced and versioned (`sideboard:v1:entries`). On
 * first load, a valid legacy `spellbook_journal_entries` payload is copied to
 * the canonical key. The legacy key is intentionally retained as a recovery
 * copy; it is never removed or overwritten by this module.
 */
export const journalStorage: JournalStorage = {
  loadEntries(): JournalLoadResult {
    const storage = getStorage();
    if (!storage) {
      return { entries: [], migrationStatus: 'storage-unavailable' };
    }

    const canonicalValue = readJson(storage, CURRENT_ENTRIES_KEY);

    if (canonicalValue !== undefined) {
      const canonical = normalizeEntries(canonicalValue);
      if (canonical) {
        return { entries: canonical.entries, migrationStatus: 'canonical' };
      }

      // A malformed canonical payload must never cause a silent library wipe.
      // Fall through to the legacy recovery copy, but do not overwrite either
      // key until the user has a chance to inspect the failure.
      const legacy = readJson(storage, LEGACY_ENTRIES_KEY);
      const legacyResult = legacy === undefined ? null : normalizeEntries(legacy);
      if (legacyResult) {
        return { entries: legacyResult.entries, migrationStatus: 'legacy-invalid' };
      }
      return { entries: [], migrationStatus: 'legacy-invalid' };
    }

    const legacyValue = readJson(storage, LEGACY_ENTRIES_KEY);
    if (legacyValue === undefined) {
      return { entries: [], migrationStatus: 'empty' };
    }

    const legacy = normalizeEntries(legacyValue);
    if (!legacy) {
      return { entries: [], migrationStatus: 'legacy-invalid' };
    }

    if (legacy.entries.length === 0 && !legacy.hasUsableEntry) {
      return { entries: [], migrationStatus: 'legacy-empty' };
    }

    if (!writeJson(storage, CURRENT_ENTRIES_KEY, legacy.entries)) {
      return { entries: legacy.entries, migrationStatus: 'storage-write-failed' };
    }

    return {
      entries: legacy.entries,
      migrationStatus: legacy.invalidCount > 0 ? 'legacy-invalid' : 'migrated',
    };
  },

  saveEntries(entries: JournalEntry[]): boolean {
    const storage = getStorage();
    if (!storage) return false;
    return writeJson(storage, CURRENT_ENTRIES_KEY, entries);
  },

  loadTrash(): StorageLoadResult<TrashItem[]> {
    const storage = getStorage();
    if (!storage) {
      return { value: [], status: 'storage-unavailable' };
    }

    const raw = readJson(storage, TRASH_STORAGE_KEY);
    if (raw === undefined) {
      return { value: [], status: 'missing' };
    }

    const trash = normalizeTrash(raw);
    return { value: trash, status: Array.isArray(raw) && trash.length === 0 && raw.length > 0 ? 'invalid' : 'loaded' };
  },

  saveTrash(trash: TrashItem[]): boolean {
    const storage = getStorage();
    if (!storage) return false;
    return writeJson(storage, TRASH_STORAGE_KEY, trash);
  },

  loadConsideredCards(): StorageLoadResult<ConsideredCard[]> {
    const storage = getStorage();
    if (!storage) {
      return { value: [], status: 'storage-unavailable' };
    }

    const raw = readJson(storage, CONSIDERED_STORAGE_KEY);
    if (raw === undefined) {
      return { value: [], status: 'missing' };
    }

    const cards = normalizeConsideredCards(raw);
    return { value: cards, status: Array.isArray(raw) && cards.length === 0 && raw.length > 0 ? 'invalid' : 'loaded' };
  },

  saveConsideredCards(cards: ConsideredCard[]): boolean {
    const storage = getStorage();
    if (!storage) return false;
    return writeJson(storage, CONSIDERED_STORAGE_KEY, cards);
  },

  /**
   * UI preference rather than user content, so there is no load status to
   * report: a missing or malformed payload just means "never nudged yet".
   */
  loadBackupNudge(): BackupNudgeState {
    const storage = getStorage();
    if (!storage) return DEFAULT_BACKUP_NUDGE_STATE;

    const raw = readJson(storage, BACKUP_NUDGE_STORAGE_KEY);
    if (!isRecord(raw)) return DEFAULT_BACKUP_NUDGE_STATE;

    return {
      hasEverBackedUp: raw.hasEverBackedUp === true,
      dismissedAtEntryCount:
        typeof raw.dismissedAtEntryCount === 'number' && Number.isFinite(raw.dismissedAtEntryCount)
          ? raw.dismissedAtEntryCount
          : null,
    };
  },

  saveBackupNudge(state: BackupNudgeState): boolean {
    const storage = getStorage();
    if (!storage) return false;
    return writeJson(storage, BACKUP_NUDGE_STORAGE_KEY, state);
  },
};
