/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface DialogProps {
  title: string;
  body: string;
  /** Label of the action that confirms. Omit for a single-button notice. */
  confirmLabel?: string;
  onConfirm?: () => void;
  onCancel: () => void;
}

/**
 * Themed replacement for native `alert`/`confirm`. Native dialogs are blocking,
 * unstyled, and inconsistently announced by screen readers; this keeps focus
 * inside the dialog, closes on Escape, and returns focus to the trigger.
 */
export const Dialog: React.FC<DialogProps> = ({ title, body, confirmLabel, onConfirm, onCancel }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Destructive confirms start on Cancel so Enter can't wipe a library.
    (confirmLabel ? cancelRef : confirmRef).current?.focus();
  }, [confirmLabel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-body"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
        }}
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 id="dialog-title" className="text-lg font-bold text-ink">{title}</h2>
        <p id="dialog-body" className="mt-2 text-sm leading-relaxed text-body">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-body transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {confirmLabel ? 'Cancel' : 'Close'}
          </button>
          {confirmLabel && (
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
