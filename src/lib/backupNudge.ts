/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Backup nudge state. The journal exists only in this browser, so a user with
 * real entries and no exported backup is one cleared cache away from losing
 * everything. The nudge is a gentle reminder, not a modal.
 */
export interface BackupNudgeState {
  /** True once the user has ever exported a backup — the nudge never returns. */
  hasEverBackedUp: boolean;
  /** Entry count at which the user dismissed the last nudge; null if never. */
  dismissedAtEntryCount: number | null;
}

export const BACKUP_NUDGE_STORAGE_KEY = 'sideboard:v1:backup_nudge';

/** Entries written before the first hint. Small, so a new user isn't ambushed. */
export const FIRST_NUDGE_THRESHOLD = 3;

/** After a dismissal, stay quiet until this many MORE entries arrive. */
export const REARM_INTERVAL = 10;

export const DEFAULT_BACKUP_NUDGE_STATE: BackupNudgeState = {
  hasEverBackedUp: false,
  dismissedAtEntryCount: null,
};

/**
 * Whether the reminder should be showing right now.
 *
 * Three gates, in order: never after a backup, only once there is something worth
 * protecting, and silent again until enough new work has accumulated since the
 * last dismissal. Re-arming on entry count (not time) means someone who writes
 * steadily is reminded at ~3, ~13, ~23 entries, while someone who stopped
 * writing is never nagged about a decision they already made.
 */
export function shouldShowBackupNudge(state: BackupNudgeState, entryCount: number): boolean {
  if (state.hasEverBackedUp) return false;
  if (entryCount < FIRST_NUDGE_THRESHOLD) return false;
  if (state.dismissedAtEntryCount === null) return true;
  return entryCount >= state.dismissedAtEntryCount + REARM_INTERVAL;
}

/** Dismissing pins the current count so the next hint needs REARM_INTERVAL more. */
export function dismissBackupNudge(entryCount: number): BackupNudgeState {
  return { hasEverBackedUp: false, dismissedAtEntryCount: entryCount };
}

/** A single export retires the nudge permanently. */
export function acknowledgeBackup(): BackupNudgeState {
  return { hasEverBackedUp: true, dismissedAtEntryCount: null };
}
