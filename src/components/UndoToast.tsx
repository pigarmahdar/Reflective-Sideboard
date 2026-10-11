/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Undo2, X } from 'lucide-react';
import { motion } from 'motion/react';

interface UndoToastProps {
  /** Title of the entry just deleted, shown in the toast body. */
  entryTitle: string;
  /** Called when the user clicks "Put back". */
  onUndo: () => void;
  /** Called when the toast auto-dismisses or is manually closed. */
  onDismiss: () => void;
  /** Milliseconds before auto-dismiss. */
  durationMs?: number;
}

/**
 * Non-blocking confirmation for a soft delete. Announced politely to screen
 * readers and auto-dismissed after a short window so the user can undo
 * without the modal friction of a confirm dialog.
 */
export const UndoToast: React.FC<UndoToastProps> = ({
  entryTitle,
  onUndo,
  onDismiss,
  durationMs = 8000
}) => {
  // Track the callback refs so the timeout effect isn't torn down and
  // restarted whenever the parent re-renders with new closures.
  const onUndoRef = useRef(onUndo);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onUndoRef.current = onUndo;
    onDismissRef.current = onDismiss;
  }, [onUndo, onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDismissRef.current(), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
      className="fixed bottom-14 right-4 lg:right-8 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface shadow-2xl"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink font-medium leading-snug">
            Moved to Recently Deleted
          </p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            <span className="italic truncate">{entryTitle || 'Untitled Entry'}</span> is kept
            until you remove it permanently.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-hover transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            Put back
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface-raised transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
