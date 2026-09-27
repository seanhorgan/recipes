import { useMemo, useState } from 'react';
import { repo, recipeStats, todayIso } from '../data.ts';
import { PROTEINS, TAGS, currentRating, type Protein } from '../lib/recipe.ts';
import { PROTEIN_LABEL, RecipeRating, ago, routeFor, shortDate } from '../ui.tsx';
import { searchRecipes, searchTerms } from '../lib/search.ts';
import { useSync } from '../sync.ts';
import { href } from '../router.ts';

type Sort = 'stale' | 'recent' | 'most' | 'rating' | 'quick' | 'name';

interface Filters {
  query: string;
  proteins: Protein[];
  tag: string;
  quick: boolean;
  sort: Sort;
}

// Kept at module level so filters survive navigating to a recipe and back.
let saved: Filters = { query: '', proteins: [], tag: '', quick: false, sort: 'stale' };

export function Recipes() {
  const [f, setF] = useState<Filters>(saved);
  const sync = useSync();
  const update = (patch: Partial<Filters>) => setF((prev) => (saved = { ...prev, ...patch }));
  const today = todayIso();

  const rows = useMemo(() => {
    const filtered = [...repo.recipes.values()]
      .filter((r) => !f.proteins.length || (r.protein && f.proteins.includes(r.protein)))
      .filter((r) => !f.tag || r.tags.includes(f.tag))
      .filter((r) => !f.quick || (r.weeknightMinutes ?? 99) <= 20);
    const terms = searchTerms(f.query);
    const list = searchRecipes(filtered, f.query).map(({ recipe: r, matched }) => ({
      recipe: r,
      matched,
      stats: recipeStats(r, today),
      rating: currentRating(r)?.stars ?? 0,
    }));
    type Row = (typeof list)[number];
    const byName = (a: Row, b: Row) => a.recipe.title.localeCompare(b.recipe.title);
    const bySort = (a: Row, b: Row) => {
      if (f.sort === 'rating') return b.rating - a.rating || byName(a, b);
      if (f.sort === 'quick') return (a.recipe.weeknightMinutes ?? 99) - (b.recipe.weeknightMinutes ?? 99) || byName(a, b);
      if (f.sort === 'stale') return (a.stats.last ?? '').localeCompare(b.stats.last ?? '') || byName(a, b);
      if (f.sort === 'recent') return (b.stats.last ?? '').localeCompare(a.stats.last ?? '') || byName(a, b);
      if (f.sort === 'most') return b.stats.count - a.stats.count || byName(a, b);
      return byName(a, b);
    };
    // With several ingredients ("salmon, lemon, asparagus"), recipes using more of them come first.
    list.sort((a, b) => (terms.length > 1 ? b.matched.length - a.matched.length : 0) || bySort(a, b));
    return { list, terms };
  }, [f, today, repo]);

  const toggleProtein = (p: Protein) =>
    update({ proteins: f.proteins.includes(p) ? f.proteins.filter((x) => x !== p) : [...f.proteins, p] });

  return (
    <>
      <div className="title-row">
        <h1>Recipes</h1>
        {sync.connected && <a className="button" href={href('add-recipe')}>Add recipe</a>}
      </div>
      <div className="filters">
        <input
          type="search"
          placeholder="Search, or list what you have: salmon, lemon"
          value={f.query}
          onChange={(e) => update({ query: e.target.value })}
          aria-label="Search recipes or ingredients; separate several with commas"
        />
        <div className="chip-row" role="group" aria-label="Protein">
          {PROTEINS.map((p) => (
            <button key={p} className={`toggle${f.proteins.includes(p) ? ' on' : ''}`} onClick={() => toggleProtein(p)}
              aria-pressed={f.proteins.includes(p)}>
              {PROTEIN_LABEL[p]}
            </button>
          ))}
          <button className={`toggle${f.quick ? ' on' : ''}`} onClick={() => update({ quick: !f.quick })} aria-pressed={f.quick}>
            ⚡ 20 min or less
          </button>
        </div>
        <div className="filter-selects">
          <label>
            Style
            <select value={f.tag} onChange={(e) => update({ tag: e.target.value })}>
              <option value="">Any</option>
              {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Sort
            <select value={f.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
              <option value="stale">Longest since cooked</option>
              <option value="recent">Recently cooked</option>
              <option value="most">Most cooked</option>
              <option value="rating">Top rated</option>
              <option value="quick">Quickest weeknight</option>
              <option value="name">A–Z</option>
            </select>
          </label>
        </div>
      </div>

      <p className="muted count">
        {rows.list.length} of {repo.recipes.size} recipes
        {rows.terms.length > 1 && ', most matching ingredients first'}
      </p>
      <ul className="card-list">
        {rows.list.map(({ recipe: r, stats, matched }) => (
          <li key={r.path}>
            <a className="card recipe-card" href={routeFor(r.path)!}>
              <span className="card-title">{r.title}</span>
              <span className="card-meta">
                {r.protein && <span>{PROTEIN_LABEL[r.protein]}</span>}
                <span>⏱ {r.weeknightMinutes} min</span>
                {r.prepMinutes > 0 && <span>Prep {r.prepMinutes} min</span>}
                <RecipeRating recipe={r} />
              </span>
              <span className="card-sub muted">
                {stats.next ? `Planned for ${shortDate(stats.next)}` : ''}
                {stats.next && stats.last ? ' · ' : ''}
                {stats.last ? `Last cooked ${ago(stats.last, today)}` : stats.next ? '' : 'Never planned'}
                {stats.count > 1 ? ` · ${stats.count}×` : ''}
              </span>
              {rows.terms.length > 1 && (
                <span className="card-sub">Uses {matched.length} of {rows.terms.length}: {matched.join(', ')}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
      {!rows.list.length && <p className="empty">No recipes match these filters.</p>}
    </>
  );
}
