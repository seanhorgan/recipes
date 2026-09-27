import type { ReactNode } from 'react';
import { resolveLink } from './lib/markdown.ts';
import { formatLong, toDate, DAYS, weekdayIndex } from './lib/dates.ts';
import type { Protein, Recipe } from './lib/recipe.ts';
import { currentRating } from './lib/recipe.ts';
import { daysBetween, githubUrl } from './data.ts';
import { href } from './router.ts';

export const PROTEIN_LABEL: Record<Protein, string> = {
  fish: '🐟 Fish',
  shellfish: '🦐 Shellfish',
  poultry: '🍗 Poultry',
  plant: '🌱 Plant',
  egg: '🥚 Egg',
};

/** Route for a repo path like `recipes/x.md` or `sauces/y.md`, or null if the app has no page for it. */
export function routeFor(path: string): string | null {
  const m = /^(recipes|sauces)\/([^/]+)\.md$/.exec(path);
  return m ? href(m[1], m[2]) : null;
}

/** Renders the inline markdown our files use: **bold**, *italic*, and [links](...). */
export function Inline({ text, from }: { text: string; from: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        if (link) {
          const internal = /^https?:/.test(link[2]) ? null : routeFor(resolveLink(from, link[2]));
          return internal ? (
            <a key={i} href={internal}>{link[1]}</a>
          ) : (
            <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
          );
        }
        return p;
      })}
    </>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="stars" aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}
      <span className="stars-off">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export function RecipeRating({ recipe }: { recipe: Recipe }) {
  const r = currentRating(recipe);
  return r ? <Stars n={r.stars} /> : <span className="muted">Not rated</span>;
}

export function shortDate(iso: string): string {
  const d = toDate(iso);
  return `${DAYS[weekdayIndex(iso)].slice(0, 3)} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`;
}

export function ago(iso: string, today: string): string {
  const days = daysBetween(iso, today);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  const months = Math.round(days / 30.4);
  return months < 12 ? `${months} months ago` : formatLong(iso);
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'warn' | 'accent' }) {
  return <span className={`chip${tone ? ' chip-' + tone : ''}`}>{children}</span>;
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section className="section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function GitHubLinks({ path }: { path: string }) {
  return (
    <p className="github-links">
      <a href={githubUrl(path, true)} target="_blank" rel="noreferrer">Edit on GitHub</a>
      <span aria-hidden="true"> · </span>
      <a href={githubUrl(path)} target="_blank" rel="noreferrer">View file</a>
    </p>
  );
}
