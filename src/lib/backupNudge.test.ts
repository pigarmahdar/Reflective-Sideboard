import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIRST_NUDGE_THRESHOLD,
  REARM_INTERVAL,
  DEFAULT_BACKUP_NUDGE_STATE,
  dismissBackupNudge,
  acknowledgeBackup,
  shouldShowBackupNudge,
} from './backupNudge.ts';

test('stays hidden until there is something worth protecting', () => {
  for (let n = 0; n < FIRST_NUDGE_THRESHOLD; n++) {
    assert.equal(shouldShowBackupNudge(DEFAULT_BACKUP_NUDGE_STATE, n), false);
  }
  assert.equal(shouldShowBackupNudge(DEFAULT_BACKUP_NUDGE_STATE, FIRST_NUDGE_THRESHOLD), true);
});

test('never shows again once a backup has been taken', () => {
  const state = acknowledgeBackup();
  assert.equal(shouldShowBackupNudge(state, FIRST_NUDGE_THRESHOLD), false);
  assert.equal(shouldShowBackupNudge(state, 500), false);
});

test('re-arms only after REARM_INTERVAL more entries', () => {
  const dismissed = dismissBackupNudge(5);
  assert.equal(shouldShowBackupNudge(dismissed, 5), false);
  assert.equal(shouldShowBackupNudge(dismissed, 5 + REARM_INTERVAL - 1), false);
  assert.equal(shouldShowBackupNudge(dismissed, 5 + REARM_INTERVAL), true);
  assert.equal(shouldShowBackupNudge(dismissed, 5 + REARM_INTERVAL + 7), true);
});

test('a backup after a dismissal retires the nudge for good', () => {
  const dismissedThenBackedUp = { ...dismissBackupNudge(5), ...acknowledgeBackup() };
  assert.equal(shouldShowBackupNudge(dismissedThenBackedUp, 999), false);
});

test('deleting entries back below the threshold hides the nudge again', () => {
  assert.equal(shouldShowBackupNudge(DEFAULT_BACKUP_NUDGE_STATE, FIRST_NUDGE_THRESHOLD), true);
  assert.equal(shouldShowBackupNudge(DEFAULT_BACKUP_NUDGE_STATE, FIRST_NUDGE_THRESHOLD - 1), false);
});
