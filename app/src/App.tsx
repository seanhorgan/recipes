import { useRoute, href } from './router.ts';
import { recipeBySlug, sauceBySlug, repo, REPO_URL } from './data.ts';
import { Home } from './pages/Home.tsx';
import { Recipes } from './pages/Recipes.tsx';
import { RecipeDetail, SauceDetail } from './pages/RecipeDetail.tsx';
import { PlanList, PlanDetail } from './pages/Plans.tsx';

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
  return (
    <>
      <h1>Not found</h1>
      <p><a href={href()}>Back to this week</a></p>
    </>
  );
}

export function App() {
  const route = useRoute();
  const tab = route[0] === 'sauces' ? 'recipes' : (route[0] ?? '');
  const tabs = [
    ['', 'This week'],
    ['recipes', 'Recipes'],
    ['plans', 'Plans'],
  ];
  return (
    <>
      <header className="topbar">
        <a className="brand" href={href()}>🥗 Family Meals</a>
        <nav aria-label="Main">
          {tabs.map(([key, label]) => (
            <a key={key} href={key ? href(key) : href()} aria-current={tab === key ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
      </header>
      <main>
        <Page route={route} />
      </main>
      <footer>
        Recipes live in <a href={REPO_URL} target="_blank" rel="noreferrer">seanhorgan/recipes</a>; this site updates on every change.
      </footer>
    </>
  );
}
