/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JournalEntry, TrashItem, ConsideredCard } from '../types.ts';

/** v3 adds `consideredCards`; v2 readers simply ignore unknown keys. */
export const BACKUP_SCHEMA_VERSION = 3;

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  app: 'reflective-sideboard';
  entries: JournalEntry[];
  recentlyDeleted: TrashItem[];
  consideredCards: ConsideredCard[];
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

function normalizeTrash(value: unknown): TrashItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): TrashItem[] => {
    if (!isRecord(candidate)) return [];
    const entry = normalizeEntry(candidate.entry);
    if (!entry) return [];
    return [{
      entry,
      deletedAt: typeof candidate.deletedAt === 'string' ? candidate.deletedAt : new Date().toISOString(),
    }];
  });
}

function normalizeConsidered(value: unknown): ConsideredCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): ConsideredCard[] => {
    if (!isRecord(candidate) || typeof candidate.name !== 'string' || !candidate.name.trim()) return [];
    return [{
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : String(Date.now()),
      name: candidate.name.trim(),
      mana_cost: typeof candidate.mana_cost === 'string' ? candidate.mana_cost : undefined,
      type_line: typeof candidate.type_line === 'string' ? candidate.type_line : undefined,
      image_uri: typeof candidate.image_uri === 'string' ? candidate.image_uri : undefined,
      scryfall_uri: typeof candidate.scryfall_uri === 'string' ? candidate.scryfall_uri : undefined,
      sleevedAt: typeof candidate.sleevedAt === 'string' ? candidate.sleevedAt : new Date().toISOString(),
    }];
  });
}

export function createBackup(
  entries: JournalEntry[],
  recentlyDeleted: TrashItem[],
  consideredCards: ConsideredCard[],
): BackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'reflective-sideboard',
    entries,
    recentlyDeleted,
    consideredCards,
  };
}

/**
 * Validate a parsed backup before it can replace live state. Accepts the
 * legacy bare-array shape, v2 (no considered cards) and v3. Returns null
 * when the file has no usable entries, so a bad file cannot wipe good data.
 */
export function parseBackup(parsed: unknown): Omit<BackupPayload, 'schemaVersion' | 'exportedAt' | 'app'> | null {
  const candidate = Array.isArray(parsed) ? parsed : (parsed as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(candidate)) return null;

  const entries = candidate.flatMap((e) => {
    const entry = normalizeEntry(e);
    return entry ? [entry] : [];
  });
  if (entries.length === 0) return null;

  const source = Array.isArray(parsed) ? null : (parsed as Record<string, unknown> | null);
  return {
    entries,
    recentlyDeleted: normalizeTrash(source?.recentlyDeleted),
    consideredCards: normalizeConsidered(source?.consideredCards),
  };
}
