/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query so layout decisions re-render when the
 * viewport crosses the breakpoint. Reading `window.innerWidth` during render
 * never re-runs, leaving stale layout after a resize or rotation.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

/** Tailwind's `md` breakpoint — below this the sidebar becomes a drawer. */
export const useIsCompact = () => useMediaQuery('(max-width: 767px)');
