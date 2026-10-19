import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKUP_SCHEMA_VERSION, createBackup, parseBackup } from './backup.ts';
import type { JournalEntry, TrashItem, ConsideredCard } from '../types.ts';

const entry: JournalEntry = {
  id: 'e1',
  date: '2026-10-01T00:00:00.000Z',
  title: 'Post-event review',
  content: 'RB midrange felt strong.',
  tags: ['standard'],
  lastModified: '2026-10-02T00:00:00.000Z',
};

const trash: TrashItem[] = [{ entry: { ...entry, id: 'e2' }, deletedAt: '2026-10-03T00:00:00.000Z' }];

const considered: ConsideredCard[] = [{
  id: 'c1',
  name: 'Sunfall',
  mana_cost: '{3}{W}{W}',
  type_line: 'Sorcery',
  image_uri: 'https://example.test/sunfall.jpg',
  scryfall_uri: 'https://scryfall.com/card/sunfall',
  sleevedAt: '2026-10-04T00:00:00.000Z',
}];

test('backup v3 round-trips entries, trash and considered cards', () => {
  const payload = createBackup([entry], trash, considered);
  assert.equal(payload.schemaVersion, BACKUP_SCHEMA_VERSION);
  assert.equal(payload.schemaVersion, 3);

  // Through JSON exactly as a download/upload would.
  const parsed = parseBackup(JSON.parse(JSON.stringify(payload)));
  assert.ok(parsed);
  assert.deepEqual(parsed.entries, [entry]);
  assert.deepEqual(parsed.recentlyDeleted, trash);
  assert.deepEqual(parsed.consideredCards, considered);
});

test('restores considered cards from an older v2 backup that lacks them', () => {
  const parsed = parseBackup({ schemaVersion: 2, entries: [entry], recentlyDeleted: [] });
  assert.ok(parsed);
  assert.deepEqual(parsed.consideredCards, []);
});

test('accepts the legacy bare-array backup shape', () => {
  const parsed = parseBackup([entry]);
  assert.ok(parsed);
  assert.equal(parsed.entries.length, 1);
  assert.deepEqual(parsed.consideredCards, []);
});

test('drops malformed considered cards without losing valid ones', () => {
  const parsed = parseBackup({
    schemaVersion: 3,
    entries: [entry],
    consideredCards: [considered[0], { name: '   ' }, null, { mana_cost: '{U}' }],
  });
  assert.ok(parsed);
  assert.equal(parsed.consideredCards.length, 1);
  assert.equal(parsed.consideredCards[0].name, 'Sunfall');
});

test('rejects a file with no usable entries so it cannot wipe the library', () => {
  assert.equal(parseBackup({ entries: [] }), null);
  assert.equal(parseBackup({ entries: [{ title: 'no content field' }] }), null);
  assert.equal(parseBackup(null), null);
  assert.equal(parseBackup('not json'), null);
});
