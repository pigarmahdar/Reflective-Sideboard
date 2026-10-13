/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IndentationResult {
  newContent: string;
  newStart: number;
  newEnd: number;
}

export interface ListContinuationResult {
  newContent: string;
  newCursorPos: number;
}

const TAB_SPACES = '  '; // 2-space soft tab

/**
 * Handles Tab and Shift+Tab key events inside a Markdown textarea.
 * - Single cursor: inserts 2 spaces, or removes up to 2 leading spaces of current line on Shift+Tab.
 * - Multi-line selection: indents or outdents each line spanned by the selection.
 */
export function computeTabIndentation(
  content: string,
  start: number,
  end: number,
  isShift: boolean
): IndentationResult {
  // Case 1: Single cursor without selection
  if (start === end) {
    if (!isShift) {
      const before = content.slice(0, start);
      const after = content.slice(start);
      return {
        newContent: before + TAB_SPACES + after,
        newStart: start + TAB_SPACES.length,
        newEnd: start + TAB_SPACES.length,
      };
    } else {
      // Shift+Tab: outdent current line
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const line = content.slice(lineStart);
      const leadingSpacesMatch = line.match(/^( {1,2})/);
      if (leadingSpacesMatch) {
        const removedCount = leadingSpacesMatch[1].length;
        const newContent =
          content.slice(0, lineStart) + content.slice(lineStart + removedCount);
        const newPos = Math.max(lineStart, start - removedCount);
        return {
          newContent,
          newStart: newPos,
          newEnd: newPos,
        };
      }
      return { newContent: content, newStart: start, newEnd: end };
    }
  }

  // Case 2: Range selection across one or multiple lines
  const firstLineStart = content.lastIndexOf('\n', start - 1) + 1;
  const lastLineEnd = content.indexOf('\n', end);
  const blockEnd = lastLineEnd === -1 ? content.length : lastLineEnd;

  const targetBlock = content.slice(firstLineStart, blockEnd);
  const lines = targetBlock.split('\n');

  if (!isShift) {
    // Indent all lines
    const modifiedLines = lines.map((line) => TAB_SPACES + line);
    const newBlock = modifiedLines.join('\n');
    const newContent =
      content.slice(0, firstLineStart) + newBlock + content.slice(blockEnd);

    // Expansion: first line moved forward by TAB_SPACES.length, total block grew by count * 2
    return {
      newContent,
      newStart: start + TAB_SPACES.length,
      newEnd: end + lines.length * TAB_SPACES.length,
    };
  } else {
    // Outdent all lines (remove up to 2 leading spaces per line)
    let totalRemoved = 0;
    let firstLineRemoved = 0;

    const modifiedLines = lines.map((line, idx) => {
      const match = line.match(/^( {1,2})/);
      if (match) {
        const removed = match[1].length;
        totalRemoved += removed;
        if (idx === 0) firstLineRemoved = removed;
        return line.slice(removed);
      }
      return line;
    });

    const newBlock = modifiedLines.join('\n');
    const newContent =
      content.slice(0, firstLineStart) + newBlock + content.slice(blockEnd);

    return {
      newContent,
      newStart: Math.max(firstLineStart, start - firstLineRemoved),
      newEnd: Math.max(firstLineStart, end - totalRemoved),
    };
  }
}

/**
 * Handles Enter key events inside Markdown text to automatically continue
 * or terminate bulleted, numbered, or task lists.
 * Returns null if the cursor is not currently on a list item line.
 */
export function computeListContinuation(
  content: string,
  cursorPos: number
): ListContinuationResult | null {
  const lineStart = content.lastIndexOf('\n', cursorPos - 1) + 1;
  const lineEndIdx = content.indexOf('\n', cursorPos);
  const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;

  const fullLine = content.slice(lineStart, lineEnd);
  const textBeforeCursorInLine = content.slice(lineStart, cursorPos);

  // Match list patterns:
  // 1. Task lists: e.g. "  - [ ] ", "  * [x] "
  const taskMatch = fullLine.match(/^(\s*)([-*+]\s+\[[ xX]\]\s+)(.*)$/);
  // 2. Ordered lists: e.g. "  1. ", "12. "
  const orderedMatch = fullLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
  // 3. Unordered lists: e.g. "  - ", "* ", "+ "
  const unorderedMatch = fullLine.match(/^(\s*)([-*+]\s+)(.*)$/);

  let indent = '';
  let prefix = '';
  let itemText = '';
  let isOrdered = false;
  let orderNumber = 0;

  if (taskMatch) {
    indent = taskMatch[1];
    prefix = taskMatch[2];
    itemText = taskMatch[3];
  } else if (orderedMatch) {
    isOrdered = true;
    indent = orderedMatch[1];
    orderNumber = parseInt(orderedMatch[2], 10);
    prefix = `${orderedMatch[2]}. `;
    itemText = orderedMatch[3];
  } else if (unorderedMatch) {
    indent = unorderedMatch[1];
    prefix = unorderedMatch[2];
    itemText = unorderedMatch[3];
  } else {
    // Not a list item
    return null;
  }

  // Case A: The list item is empty (user hit Enter on a blank bullet to end the list)
  if (itemText.trim() === '') {
    // Clear the empty bullet from current line
    const beforeLine = content.slice(0, lineStart);
    const afterLine = content.slice(lineEnd);
    return {
      newContent: beforeLine + afterLine,
      newCursorPos: lineStart,
    };
  }

  // Case B: Cursor is in the middle of or at the end of a non-empty list item
  // Split at cursor position
  const beforeCursor = content.slice(0, cursorPos);
  const afterCursor = content.slice(cursorPos);

  let nextPrefix = '';
  if (taskMatch) {
    nextPrefix = `${indent}- [ ] `;
  } else if (isOrdered) {
    nextPrefix = `${indent}${orderNumber + 1}. `;
  } else {
    nextPrefix = `${indent}${prefix}`;
  }

  const newContent = beforeCursor + '\n' + nextPrefix + afterCursor;
  const newCursorPos = cursorPos + 1 + nextPrefix.length;

  return {
    newContent,
    newCursorPos,
  };
}
