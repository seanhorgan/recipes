import { desserts } from '../data.ts';
import type { FreeformPage } from '../lib/freeform.ts';
import { GitHubLinks, Inline, Section, routeFor } from '../ui.tsx';
import { href } from '../router.ts';

export function Desserts() {
  const list = [...desserts.values()].sort((a, b) => a.title.localeCompare(b.title));
  return (
    <>
      <p className="back"><a href={href('recipes')}>← Recipes</a></p>
      <h1>Desserts</h1>
      <p className="muted count">Treats and baking. These aren't part of dinner planning.</p>
      <ul className="card-list">
        {list.map((d) => (
          <li key={d.path}>
            <a className="card recipe-card" href={routeFor(d.path)!}>
              <span className="card-title">{d.title}</span>
              {d.description && <span className="card-sub muted">{d.description}</span>}
            </a>
          </li>
        ))}
      </ul>
      {!list.length && <p className="empty">No desserts yet.</p>}
    </>
  );
}

export function DessertDetail({ page }: { page: FreeformPage }) {
  return (
    <article>
      <p className="back"><a href={href('desserts')}>← Desserts</a></p>
      <h1>{page.title}</h1>
      {page.description && <p className="lede"><Inline text={page.description} from={page.path} /></p>}
      {page.sections.map((s) => (
        <Section key={s.heading} title={s.heading}>
          {s.blocks.map((b, i) => {
            if (b.kind === 'subheading') return <h3 key={i}><Inline text={b.text} from={page.path} /></h3>;
            if (b.kind === 'paragraph') return <p key={i}><Inline text={b.text} from={page.path} /></p>;
            const items = b.items.map((t, j) => <li key={j}><Inline text={t} from={page.path} /></li>);
            return b.kind === 'steps' ? <ol key={i} className="steps">{items}</ol> : <ul key={i} className="bullets">{items}</ul>;
          })}
        </Section>
      ))}
      <GitHubLinks path={page.path} />
    </article>
  );
}
