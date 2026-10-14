import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { ScryfallService } from './scryfall.ts';
import type { MTGCard } from '../types.ts';

const mockCard: MTGCard = {
  id: 'card-123',
  name: 'Black Lotus',
  mana_cost: '{0}',
  type_line: 'Artifact',
  oracle_text: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
  image_uris: {
    small: 'https://cards.scryfall.io/small.jpg',
    normal: 'https://cards.scryfall.io/normal.jpg',
    art_crop: 'https://cards.scryfall.io/art_crop.jpg',
  },
  scryfall_uri: 'https://scryfall.com/card/lea/232/black-lotus',
};

beforeEach(() => {
  ScryfallService.clearCache();
});

test('getCardByName caches results and normalizes casing/whitespace', async () => {
  let fetchCount = 0;
  globalThis.fetch = (async (url: string | URL | Request) => {
    fetchCount += 1;
    assert.ok(String(url).includes('exact=Black%20Lotus'));
    return {
      ok: true,
      json: async () => mockCard,
    } as Response;
  }) as typeof fetch;

  // First request: hits fetch
  const card1 = await ScryfallService.getCardByName('  Black Lotus  ');
  assert.equal(fetchCount, 1);
  assert.deepEqual(card1, mockCard);

  // Synchronous peek hit
  const peeked = ScryfallService.getCachedCard('black lotus');
  assert.deepEqual(peeked, mockCard);

  // Second request with different casing: should hit cache without calling fetch
  const card2 = await ScryfallService.getCardByName('black lotus');
  assert.equal(fetchCount, 1);
  assert.deepEqual(card2, mockCard);
});

test('autocomplete caches query results', async () => {
  let fetchCount = 0;
  globalThis.fetch = (async (url: string | URL | Request) => {
    fetchCount += 1;
    return {
      ok: true,
      json: async () => ({ data: ['Lightning Bolt', 'Lightning Helix'] }),
    } as Response;
  }) as typeof fetch;

  const res1 = await ScryfallService.autocomplete('light');
  assert.equal(fetchCount, 1);
  assert.deepEqual(res1, ['Lightning Bolt', 'Lightning Helix']);

  // Second request: hits cache
  const res2 = await ScryfallService.autocomplete('  LIGHT  ');
  assert.equal(fetchCount, 1);
  assert.deepEqual(res2, ['Lightning Bolt', 'Lightning Helix']);
});

test('autocomplete rejects queries shorter than 3 characters without fetching', async () => {
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return { ok: true, json: async () => ({ data: [] }) } as Response;
  }) as typeof fetch;

  const res = await ScryfallService.autocomplete('ab');
  assert.equal(fetchCount, 0);
  assert.deepEqual(res, []);
});
