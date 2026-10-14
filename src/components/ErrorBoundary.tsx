/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { saveAs } from 'file-saver';
import { CURRENT_ENTRIES_KEY, TRASH_STORAGE_KEY } from '../storage/journalStorage';
import { AlertTriangle, RefreshCw, Download, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleEmergencyBackup = () => {
    try {
      const rawEntries = localStorage.getItem(CURRENT_ENTRIES_KEY);
      const rawTrash = localStorage.getItem(TRASH_STORAGE_KEY);
      const entries = rawEntries ? JSON.parse(rawEntries) : [];
      const trash = rawTrash ? JSON.parse(rawTrash) : [];

      const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        emergencyBackup: true,
        app: 'reflective-sideboard',
        entries,
        recentlyDeleted: trash,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const stamp = new Date().toISOString().slice(0, 10);
      saveAs(blob, `sideboard-emergency-backup-${stamp}.json`);
    } catch (e) {
      alert('Could not export emergency backup: ' + String(e));
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-ink selection:bg-accent/20">
          <div className="max-w-lg w-full bg-surface border border-line rounded-2xl p-8 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-6">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1 className="text-2xl font-bold font-sans tracking-tight mb-2">
              Spell Fizzled (Render Error)
            </h1>

            <p className="text-body text-sm leading-relaxed mb-6">
              Something went wrong while rendering this view. Your journal entries in local storage remain safe and intact.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Reloading View
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyBackup}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface-raised/40 px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink hover:border-line-strong transition-colors"
                title="Download your full journal directly from storage"
              >
                <Download className="w-4 h-4" />
                Emergency Backup
              </button>
            </div>

            {this.state.error && (
              <details className="mt-4 text-xs font-mono bg-paper/50 rounded-lg p-3 border border-line text-muted">
                <summary className="cursor-pointer font-bold text-faint hover:text-ink transition-colors select-none">
                  Technical Details
                </summary>
                <div className="mt-2 whitespace-pre-wrap overflow-x-auto text-[11px] text-red-400">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
