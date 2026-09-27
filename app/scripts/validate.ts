// Checks every recipe, sauce, weekly plan, and the ingredient catalog against protocols/schema.md.
// Usage: npm run validate [-- --strict]   (--strict also fails on warnings)
import { loadRepo } from '../src/lib/repo.ts';
import { readRepoFiles } from './repoFiles.ts';

const strict = process.argv.includes('--strict');
const repo = loadRepo(readRepoFiles());
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
