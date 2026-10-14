/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MTGCard } from '../types.ts';

const SCRYFALL_API = 'https://api.scryfall.com';

// In-memory caches for static card details and autocomplete queries
const cardCache = new Map<string, MTGCard>();
const autocompleteCache = new Map<string, string[]>();

function normalizeKey(str: string): string {
  return str.trim().toLowerCase();
}

function combineSignals(callerSignal?: AbortSignal, timeoutMs: number = 5000): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeoutId);
          controller.abort(callerSignal.reason);
        },
        { once: true }
      );
    }
  }

  return controller.signal;
}

export const ScryfallService = {
  /**
   * Synchronously peek at the in-memory cache
   */
  getCachedCard(name: string): MTGCard | null {
    if (!name) return null;
    return cardCache.get(normalizeKey(name)) ?? null;
  },

  /**
   * Search for cards by name (autocomplete) with cache and timeout
   */
  async autocomplete(query: string, options?: { signal?: AbortSignal }): Promise<string[]> {
    if (!query) return [];
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];
    const key = normalizeKey(trimmed);

    if (autocompleteCache.has(key)) {
      return autocompleteCache.get(key)!;
    }

    try {
      const signal = combineSignals(options?.signal, 5000);
      const response = await fetch(
        `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(trimmed)}`,
        { signal }
      );
      if (!response.ok) throw new Error('Failed to fetch autocomplete');
      const data = await response.json();
      const results: string[] = data.data || [];
      autocompleteCache.set(key, results);
      return results;
    } catch (error) {
      // Silently ignore aborts — they're expected when a new query cancels an in-flight one
      if (error instanceof DOMException && error.name === 'AbortError') return [];
      console.error('Scryfall Autocomplete Error:', error);
      return [];
    }
  },

  /**
   * Get exact card details by name with cache and timeout
   */
  async getCardByName(name: string, options?: { signal?: AbortSignal }): Promise<MTGCard | null> {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const key = normalizeKey(trimmed);

    if (cardCache.has(key)) {
      return cardCache.get(key)!;
    }

    try {
      const signal = combineSignals(options?.signal, 5000);
      const response = await fetch(
        `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(trimmed)}`,
        { signal }
      );
      if (!response.ok) return null;
      const card: MTGCard = await response.json();
      cardCache.set(key, card);
      return card;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      console.error('Scryfall GetCard Error:', error);
      return null;
    }
  },

  /**
   * Testing / diagnostic helpers
   */
  clearCache(): void {
    cardCache.clear();
    autocompleteCache.clear();
  },

  getCacheStats(): { cards: number; autocomplete: number } {
    return {
      cards: cardCache.size,
      autocomplete: autocompleteCache.size,
    };
  },
};
