import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURRENT_ENTRIES_KEY,
  LEGACY_ENTRIES_KEY,
  journalStorage,
} from './journalStorage.ts';
import type { JournalEntry } from '../types.ts';

type MutableStorage = {
  data: Map<string, string>;
  failWrites?: boolean;
};

const legacyEntry = {
  id: 'legacy-entry',
  date: '2026-01-01T00:00:00.000Z',
  title: 'Legacy note',
  content: 'A preserved journal entry.',
  tags: ['commander', 42],
  lastModified: '2026-01-02T00:00:00.000Z',
};

function installStorage({ data = new Map(), failWrites = false }: Partial<MutableStorage> = {}): void {
  const storage = {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (failWrites) throw new Error('quota exceeded');
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  } as unknown as Storage;

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

test('migrates a valid legacy library and retains the recovery key', () => {
  const data = new Map<string, string>([
    [LEGACY_ENTRIES_KEY, JSON.stringify([legacyEntry])],
  ]);
  installStorage({ data });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'migrated');
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].id, 'legacy-entry');
  assert.deepEqual(result.entries[0].tags, ['commander']);
  assert.ok(data.has(LEGACY_ENTRIES_KEY));
  assert.deepEqual(JSON.parse(data.get(CURRENT_ENTRIES_KEY)!), result.entries);
});

test('uses the canonical key without rewriting or migrating it again', () => {
  const canonicalEntry: JournalEntry = {
    id: 'canonical-entry',
    date: '2026-02-01T00:00:00.000Z',
    title: 'Canonical note',
    content: 'Already migrated.',
    tags: ['brew'],
    lastModified: '2026-02-01T00:00:00.000Z',
  };
  const data = new Map<string, string>([
    [CURRENT_ENTRIES_KEY, JSON.stringify([canonicalEntry])],
    [LEGACY_ENTRIES_KEY, JSON.stringify([{ id: 'old', title: 'Old', content: 'Old data' }])],
  ]);
  installStorage({ data });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'canonical');
  assert.deepEqual(result.entries, [canonicalEntry]);
  assert.equal(JSON.parse(data.get(LEGACY_ENTRIES_KEY)!)[0].id, 'old');
});

test('starts empty when neither key exists', () => {
  installStorage({ data: new Map() });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'empty');
  assert.deepEqual(result.entries, []);
});

test('reports an empty legacy library without creating a misleading migration', () => {
  const data = new Map<string, string>([
    [LEGACY_ENTRIES_KEY, JSON.stringify([])],
  ]);
  installStorage({ data });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'legacy-empty');
  assert.deepEqual(result.entries, []);
  assert.equal(data.has(CURRENT_ENTRIES_KEY), false);
});

test('normalizes incomplete legacy entries and drops unusable records', () => {
  const data = new Map<string, string>([
    [LEGACY_ENTRIES_KEY, JSON.stringify([
      { title: 'No ID', content: 'Usable', tags: ['one', false] },
      { id: 'not-a-journal-entry' },
    ])],
  ]);
  installStorage({ data });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'legacy-invalid');
  assert.equal(result.entries.length, 1);
  assert.equal(typeof result.entries[0].id, 'string');
  assert.equal(result.entries[0].title, 'No ID');
  assert.deepEqual(result.entries[0].tags, ['one']);
  assert.equal(typeof result.entries[0].lastModified, 'string');
});

test('preserves the legacy recovery copy when migration write fails', () => {
  const data = new Map<string, string>([
    [LEGACY_ENTRIES_KEY, JSON.stringify([legacyEntry])],
  ]);
  installStorage({ data, failWrites: true });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'storage-write-failed');
  assert.equal(result.entries[0].id, 'legacy-entry');
  assert.equal(data.get(LEGACY_ENTRIES_KEY), JSON.stringify([legacyEntry]));
  assert.equal(data.has(CURRENT_ENTRIES_KEY), false);
});

test('preserves a legacy blank entry as a usable journal record', () => {
  const data = new Map<string, string>([
    [LEGACY_ENTRIES_KEY, JSON.stringify([{ id: 'blank', title: '', content: '', tags: [] }])],
  ]);
  installStorage({ data });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'migrated');
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].id, 'blank');
});

test('loads and saves trash through the storage boundary', () => {
  const data = new Map<string, string>();
  installStorage({ data });

  const trash = [{
    entry: {
      id: 'trash-entry',
      date: '2026-03-01T00:00:00.000Z',
      title: 'Deleted',
      content: 'Deleted content',
      tags: [],
      lastModified: '2026-03-01T00:00:00.000Z',
    },
    deletedAt: '2026-03-02T00:00:00.000Z',
  }];

  journalStorage.saveTrash(trash);

  assert.deepEqual(journalStorage.loadTrash().value, trash);
});

test('loads and saves considered cards through the storage boundary', () => {
  const data = new Map<string, string>();
  installStorage({ data });

  const cards = [{
    id: 'card-1',
    name: 'Counterspell',
    mana_cost: '{U}{U}',
    type_line: 'Instant',
    image_uri: 'https://example.com/counterspell.jpg',
    scryfall_uri: 'https://scryfall.com/card/1',
    sleevedAt: '2026-03-02T00:00:00.000Z',
  }];

  journalStorage.saveConsideredCards(cards);

  const loaded = journalStorage.loadConsideredCards();
  assert.equal(loaded.status, 'loaded');
  assert.deepEqual(loaded.value, cards);
});

test('returns an empty library when browser storage is unavailable', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('access denied');
    },
  });

  const result = journalStorage.loadEntries();

  assert.equal(result.migrationStatus, 'storage-unavailable');
  assert.deepEqual(result.entries, []);
});
