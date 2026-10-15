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

/**
 * A soft-deleted entry awaiting either "Put back" (restore to library)
 * or permanent removal from the trash panel. The embedded `entry` object
 * is kept whole so a put-back is lossless.
 */
export interface TrashItem {
  entry: JournalEntry;
  /** ISO timestamp of when the entry was soft-deleted. */
  deletedAt: string;
}

/**
 * A card sleeved and saved into the user's Consideration Library.
 */
export interface ConsideredCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line?: string;
  image_uri?: string;
  scryfall_uri?: string;
  sleevedAt: string; // ISO string
}
