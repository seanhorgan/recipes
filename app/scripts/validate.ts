// Checks every recipe, sauce, weekly plan, and the ingredient catalog against protocols/schema.md.
// Usage: npm run validate [-- --strict]   (--strict also fails on warnings)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepo, CATALOG_PATH } from '../src/lib/repo.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const strict = process.argv.includes('--strict');

function markdownFiles(dir: string): string[] {
  let out: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(markdownFiles(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = new Map<string, string>();
const dirs = ['recipes', 'sauces', ...readdirSync(root).filter((d) => /^\d{4}$/.test(d))];
for (const full of [join(root, CATALOG_PATH), ...dirs.flatMap((d) => markdownFiles(join(root, d)))]) {
  try {
    files.set(relative(root, full).split(sep).join('/'), readFileSync(full, 'utf8'));
  } catch {
    // A missing catalog is reported by loadRepo.
  }
}

const repo = loadRepo(files);
const errors = repo.issues.filter((i) => i.level === 'error');
const warnings = repo.issues.filter((i) => i.level === 'warning');

for (const i of [...errors, ...warnings]) {
  const where = i.line ? `${i.file}:${i.line}` : i.file;
  console.log(`${i.level === 'error' ? 'ERROR  ' : 'warning'} ${where}  ${i.message}`);
}
console.log(
  `\nChecked ${repo.recipes.size} recipes, ${repo.sauces.size} sauces, ${repo.plans.length} plans, ` +
    `${repo.catalog.entries.length} catalog ingredients: ${errors.length} errors, ${warnings.length} warnings.`,
);
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
