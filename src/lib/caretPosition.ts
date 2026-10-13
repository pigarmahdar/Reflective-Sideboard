/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Properties to copy from the textarea to the mirror div to ensure identical line wrapping
const PROPERTIES_TO_COPY = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
  'whiteSpace',
  'wordBreak',
  'overflowWrap',
] as const;

export interface CaretCoordinates {
  top: number;
  left: number;
  lineHeight: number;
}

/**
 * Returns the pixel coordinates of the caret (or a specific character index)
 * relative to the textarea's top-left corner (accounting for scroll offsets).
 */
export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): CaretCoordinates {
  // If running in SSR or element not in DOM, return fallback
  if (typeof window === 'undefined' || !element.ownerDocument) {
    return { top: 0, left: 0, lineHeight: 20 };
  }

  const doc = element.ownerDocument;
  const isInput = element.nodeName === 'INPUT';

  // Create off-screen mirror element
  const mirror = doc.createElement('div');
  mirror.id = 'input-textarea-caret-position-mirror-div';
  doc.body.appendChild(mirror);

  const style = mirror.style;
  const computed = window.getComputedStyle(element);

  // Default positioning
  style.whiteSpace = isInput ? 'nowrap' : 'pre-wrap';
  if (!isInput) {
    style.wordWrap = 'break-word';
  }
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.top = '-9999px';
  style.left = '-9999px';

  // Transfer essential styles
  PROPERTIES_TO_COPY.forEach((prop) => {
    style[prop] = computed[prop];
  });

  // Firefox fix for overflow styling
  style.overflow = 'hidden';

  const text = element.value.substring(0, position);
  mirror.textContent = text;

  if (isInput) {
    mirror.textContent = mirror.textContent.replace(/\s/g, '\u00a0');
  }

  const span = doc.createElement('span');
  // Character to accurately measure line height
  span.textContent = element.value.substring(position) || '.';
  mirror.appendChild(span);

  const parsedLineHeight = parseInt(computed.lineHeight, 10);
  const parsedFontSize = parseInt(computed.fontSize, 10);
  const lineHeight = !isNaN(parsedLineHeight)
    ? parsedLineHeight
    : !isNaN(parsedFontSize)
      ? Math.round(parsedFontSize * 1.5)
      : 20;

  const coordinates: CaretCoordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10) - element.scrollTop,
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10) - element.scrollLeft,
    lineHeight,
  };

  doc.body.removeChild(mirror);

  return coordinates;
}
