/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MTGCard {
  id: string;
  name: string;
  image_uris?: {
    normal: string;
    small: string;
    art_crop: string;
  };
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  scryfall_uri: string;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  title: string;
  content: string;
  tags: string[];
  lastModified: string;
}

export interface JournalState {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  searchQuery: string;
  selectedTags: string[];
}
