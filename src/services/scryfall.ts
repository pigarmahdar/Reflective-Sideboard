/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MTGCard } from '../types';

const SCRYFALL_API = 'https://api.scryfall.com';

export const ScryfallService = {
  /**
   * Search for cards by name (autocomplete)
   */
  async autocomplete(query: string, options?: { signal?: AbortSignal }): Promise<string[]> {
    if (!query || query.length < 3) return [];
    try {
      const response = await fetch(
        `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`,
        { signal: options?.signal }
      );
      if (!response.ok) throw new Error('Failed to fetch autocomplete');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      // Silently ignore aborts — they're expected when a new query cancels an in-flight one
      if (error instanceof DOMException && error.name === 'AbortError') return [];
      console.error('Scryfall Autocomplete Error:', error);
      return [];
    }
  },

  /**
   * Get exact card details by name
   */
  async getCardByName(name: string): Promise<MTGCard | null> {
    try {
      const response = await fetch(`${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Scryfall GetCard Error:', error);
      return null;
    }
  }
};
