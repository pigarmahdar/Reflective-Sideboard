import assert from 'node:assert/strict';
import test from 'node:test';
import { createDebouncedSaver } from './journalStorage.ts';
import type { JournalEntry } from '../types.ts';

const dummyEntry: JournalEntry = {
  id: 'test-1',
  date: '2026-10-15T00:00:00.000Z',
  title: 'Test Entry',
  content: 'Hello world',
  tags: ['test'],
  lastModified: '2026-10-15T00:00:00.000Z',
};

test('debounced saver batches rapid successive calls into a single save', async () => {
  const savedBatches: JournalEntry[][] = [];
  const saver = createDebouncedSaver((entries) => {
    savedBatches.push(entries);
    return true;
  }, 50);

  saver.schedule([{ ...dummyEntry, title: 'Keystroke 1' }]);
  saver.schedule([{ ...dummyEntry, title: 'Keystroke 2' }]);
  saver.schedule([{ ...dummyEntry, title: 'Keystroke 3' }]);

  assert.equal(saver.isPending(), true);
  assert.equal(savedBatches.length, 0);

  // Wait for debounce timeout
  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(savedBatches.length, 1);
  assert.equal(savedBatches[0][0].title, 'Keystroke 3');
  assert.equal(saver.isPending(), false);
});

test('flush immediately writes pending entries without waiting for timeout', () => {
  const savedBatches: JournalEntry[][] = [];
  const saver = createDebouncedSaver((entries) => {
    savedBatches.push(entries);
    return true;
  }, 500);

  saver.schedule([{ ...dummyEntry, title: 'Immediate flush test' }]);
  assert.equal(saver.isPending(), true);
  assert.equal(savedBatches.length, 0);

  const success = saver.flush();
  assert.equal(success, true);
  assert.equal(savedBatches.length, 1);
  assert.equal(savedBatches[0][0].title, 'Immediate flush test');
  assert.equal(saver.isPending(), false);
});

test('cancel clears pending save without writing', async () => {
  const savedBatches: JournalEntry[][] = [];
  const saver = createDebouncedSaver((entries) => {
    savedBatches.push(entries);
    return true;
  }, 50);

  saver.schedule([{ ...dummyEntry, title: 'Cancelled test' }]);
  assert.equal(saver.isPending(), true);

  saver.cancel();
  assert.equal(saver.isPending(), false);

  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(savedBatches.length, 0);
});
