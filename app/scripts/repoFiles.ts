// Reads the repo's markdown (recipes, sauces, plans, ingredient catalog) from disk for the Node scripts.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_PATH } from '../src/lib/repo.ts';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

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

export function readRepoFiles(): Map<string, string> {
  const files = new Map<string, string>();
  const dirs = ['recipes', 'sauces', ...readdirSync(REPO_ROOT).filter((d) => /^\d{4}$/.test(d))];
  for (const full of [join(REPO_ROOT, CATALOG_PATH), ...dirs.flatMap((d) => markdownFiles(join(REPO_ROOT, d)))]) {
    try {
      files.set(relative(REPO_ROOT, full).split(sep).join('/'), readFileSync(full, 'utf8'));
    } catch {
      // A missing catalog is reported by loadRepo.
    }
  }
  return files;
}
