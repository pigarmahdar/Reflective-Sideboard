import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeTabIndentation,
  computeListContinuation,
} from './editorErgonomics.ts';

test('computeTabIndentation - inserts soft 2 spaces on single cursor', () => {
  const content = 'Helloworld';
  const result = computeTabIndentation(content, 5, 5, false);

  assert.equal(result.newContent, 'Hello  world');
  assert.equal(result.newStart, 7);
  assert.equal(result.newEnd, 7);
});

test('computeTabIndentation - indents multiple selected lines', () => {
  const content = 'Line 1\nLine 2\nLine 3';
  // Select from Line 1 to Line 2
  const result = computeTabIndentation(content, 0, 10, false);

  assert.equal(result.newContent, '  Line 1\n  Line 2\nLine 3');
  assert.equal(result.newStart, 2);
  assert.equal(result.newEnd, 14);
});

test('computeTabIndentation - outdents single line on Shift+Tab', () => {
  const content = '  Indented line';
  const result = computeTabIndentation(content, 5, 5, true);

  assert.equal(result.newContent, 'Indented line');
  assert.equal(result.newStart, 3);
  assert.equal(result.newEnd, 3);
});

test('computeTabIndentation - outdents multiple selected lines on Shift+Tab', () => {
  const content = '  Line 1\n  Line 2\nLine 3';
  const result = computeTabIndentation(content, 0, 15, true);

  assert.equal(result.newContent, 'Line 1\nLine 2\nLine 3');
});

test('computeListContinuation - continues unordered bullet lists', () => {
  const content = '- First item';
  const result = computeListContinuation(content, content.length);

  assert.ok(result);
  assert.equal(result.newContent, '- First item\n- ');
  assert.equal(result.newCursorPos, '- First item\n- '.length);
});

test('computeListContinuation - preserves indentation in nested bullet lists', () => {
  const content = '  * Nested item';
  const result = computeListContinuation(content, content.length);

  assert.ok(result);
  assert.equal(result.newContent, '  * Nested item\n  * ');
  assert.equal(result.newCursorPos, '  * Nested item\n  * '.length);
});

test('computeListContinuation - increments ordered list numbers', () => {
  const content = '1. First card\n2. Second card';
  const result = computeListContinuation(content, content.length);

  assert.ok(result);
  assert.equal(result.newContent, '1. First card\n2. Second card\n3. ');
  assert.equal(result.newCursorPos, '1. First card\n2. Second card\n3. '.length);
});

test('computeListContinuation - continues task lists with empty checkbox', () => {
  const content = '- [x] Completed task';
  const result = computeListContinuation(content, content.length);

  assert.ok(result);
  assert.equal(result.newContent, '- [x] Completed task\n- [ ] ');
  assert.equal(result.newCursorPos, '- [x] Completed task\n- [ ] '.length);
});

test('computeListContinuation - clears empty bullet on double Enter', () => {
  const content = '- First item\n- ';
  const result = computeListContinuation(content, content.length);

  assert.ok(result);
  assert.equal(result.newContent, '- First item\n');
  assert.equal(result.newCursorPos, '- First item\n'.length);
});

test('computeListContinuation - returns null for non-list lines', () => {
  const content = 'Just a regular sentence about Magic.';
  const result = computeListContinuation(content, content.length);

  assert.equal(result, null);
});
