import { useEffect, useState } from 'react';

// Hash routes (#/recipes/slug) work on GitHub Pages without any server rewrites. A route can carry a query after
// "?", e.g. #/plan/2026-10-05?mon=lemon-dill-salmon-asparagus (see lib/planLink.ts).
export function useRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
}

/** The query part of the current hash route. */
export function hashQuery(): string {
  const hash = window.location.hash;
  const i = hash.indexOf('?');
  return i === -1 ? '' : hash.slice(i + 1);
}

export function href(...parts: string[]): string {
  return '#/' + parts.map(encodeURIComponent).join('/');
}
