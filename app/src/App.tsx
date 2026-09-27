import { useRoute, href } from './router.ts';
import { recipeBySlug, sauceBySlug, repo, REPO_URL, useDataVersion } from './data.ts';
import { useSync, type SyncStatus } from './sync.ts';
import { Home } from './pages/Home.tsx';
import { Recipes } from './pages/Recipes.tsx';
import { RecipeDetail, SauceDetail } from './pages/RecipeDetail.tsx';
import { PlanList, PlanDetail } from './pages/Plans.tsx';
import { Planner } from './pages/Planner.tsx';
import { Settings } from './pages/Settings.tsx';
import { Tonight } from './pages/Tonight.tsx';
import { AddRecipe } from './pages/AddRecipe.tsx';

function Page({ route }: { route: string[] }) {
  const [section, id] = route;
  if (!section) return <Home />;
  if (section === 'recipes' && !id) return <Recipes />;
  if (section === 'recipes') {
    const r = recipeBySlug(id);
    if (r) return <RecipeDetail recipe={r} />;
  }
  if (section === 'sauces' && id) {
    const s = sauceBySlug(id);
    if (s) return <SauceDetail sauce={s} />;
  }
  if (section === 'plans' && !id) return <PlanList />;
  if (section === 'plans') {
    const p = repo.plans.find((x) => x.monday === id);
    if (p) return <PlanDetail plan={p} />;
  }
  if (section === 'plan') return <Planner monday={id} />;
  if (section === 'settings') return <Settings />;
  if (section === 'tonight') return <Tonight />;
  if (section === 'add-recipe') return <AddRecipe />;
  return (
    <>
      <h1>Not found</h1>
      <p><a href={href()}>Back to this week</a></p>
    </>
  );
}

const SYNC_LABEL: Record<SyncStatus['state'], string> = {
  offline: 'Connect',
  loading: 'Syncing…',
  live: 'Live',
  saving: 'Saving…',
  error: 'Sync problem',
};

function SyncBadge() {
  const sync = useSync();
  const label = sync.state === 'live' && sync.unsaved ? 'Unsaved' : SYNC_LABEL[sync.state];
  return (
    <a className={`sync sync-${sync.state}`} href={href('settings')} title={sync.message ?? undefined}>
      <span className="dot" aria-hidden="true" />
      {label}
    </a>
  );
}

export function App() {
  useDataVersion(); // re-render everything when live data arrives
  const route = useRoute();
  const tab = route[0] === 'sauces' || route[0] === 'add-recipe' ? 'recipes' : route[0] === 'plan' ? 'plans' : (route[0] ?? '');
  const tabs = [
    ['', 'This week'],
    ['tonight', 'Tonight'],
    ['recipes', 'Recipes'],
    ['plans', 'Plans'],
  ];
  return (
    <>
      <header className="topbar">
        <a className="brand" href={href()}>🥗 Family Meals</a>
        <SyncBadge />
        <nav aria-label="Main">
          {tabs.map(([key, label]) => (
            <a key={key} href={key ? href(key) : href()} aria-current={tab === key ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
      </header>
      <SyncProblem />
      <main>
        <Page route={route} />
      </main>
      <footer>
        Recipes live in <a href={REPO_URL} target="_blank" rel="noreferrer">seanhorgan/recipes</a>; this site updates on every change.
        {' '}<a href={href('settings')}>Settings</a>
      </footer>
    </>
  );
}

function SyncProblem() {
  const sync = useSync();
  if (sync.state !== 'error' || !sync.message) return null;
  return (
    <div className="banner" role="alert">
      ⚠ {sync.message} <a href={href('settings')}>Details</a>
    </div>
  );
}
