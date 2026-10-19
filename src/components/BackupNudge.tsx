/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface BackupNudgeProps {
  /** True when the undo toast is also on screen and would otherwise overlap. */
  stackedAbove?: boolean;
  /** Called when the user takes the hint. */
  onBackup: () => void;
  /** Called when the user dismisses it — re-arms after more entries. */
  onDismiss: () => void;
}

/**
 * Gentle reminder that the journal has no server-side copy. Not a modal: it
 * sits beside the save state, where users already look to check their work is
 * safe. Announced politely so it doesn't interrupt a screen-reader user
 * mid-sentence.
 */
export const BackupNudge: React.FC<BackupNudgeProps> = ({ onBackup, onDismiss, stackedAbove }) => (
  <motion.div
    role="status"
    aria-live="polite"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.18 }}
    className={cn(
      'fixed left-4 lg:left-8 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-2xl',
      stackedAbove ? 'bottom-[9.5rem]' : 'bottom-14'
    )}
  >
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink font-medium leading-snug">
          Keep a copy of your journal
        </p>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          Your notes only live in this browser. Export a backup so a cleared cache
          or a new device can't take them.
        </p>
        <button
          type="button"
          onClick={onBackup}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Library Backup
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss backup reminder"
        className="p-1.5 rounded-md text-muted transition-colors hover:bg-surface-raised hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  </motion.div>
);
