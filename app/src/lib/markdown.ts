// Low-level helpers for the repo's markdown conventions (see protocols/schema.md).
import { parse as parseYaml } from 'yaml';

export interface Line {
  text: string;
  /** 1-based line number in the original file. */
  line: number;
}

export interface Section {
  heading: string;
  line: number;
  lines: Line[];
}

export interface Document {
  frontmatter: Record<string, unknown> | null;
  frontmatterError?: string;
  title: string | null;
  titleLine: number;
  /** Lines between the title and the first `##` section. */
  preamble: Line[];
  sections: Section[];
}

export function parseDocument(text: string): Document {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  let start = 0;
  let frontmatter: Record<string, unknown> | null = null;
  let frontmatterError: string | undefined;

  if (raw[0]?.trim() === '---') {
    const end = raw.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (end === -1) {
      frontmatterError = 'Header starts with --- but never closes with ---';
    } else {
      try {
        const data: unknown = parseYaml(raw.slice(1, end).join('\n'));
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          frontmatter = data as Record<string, unknown>;
        } else {
          frontmatterError = 'Header must be a list of "key: value" lines';
        }
      } catch (e) {
        frontmatterError = `Header is not valid YAML: ${(e as Error).message.split('\n')[0]}`;
      }
      start = end + 1;
    }
  }

  const doc: Document = { frontmatter, frontmatterError, title: null, titleLine: 0, preamble: [], sections: [] };
  let current: Section | null = null;
  for (let i = start; i < raw.length; i++) {
    const line: Line = { text: raw[i], line: i + 1 };
    const h1 = /^#\s+(.+?)\s*$/.exec(line.text);
    const h2 = /^##\s+(.+?)\s*$/.exec(line.text);
    if (h1 && doc.title === null && !current) {
      doc.title = h1[1];
      doc.titleLine = line.line;
    } else if (h2) {
      current = { heading: h2[1], line: line.line, lines: [] };
      doc.sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else if (doc.title !== null) {
      doc.preamble.push(line);
    }
  }
  return doc;
}

/** Non-blank lines with list markers (`-`, `*`, `1.`) removed. Unmarked lines continue the previous item. */
export function listItems(lines: Line[]): Line[] {
  const items: Line[] = [];
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    const m = /^(?:[-*]|\d+[.)])\s+(.*)$/.exec(t);
    if (m) items.push({ text: m[1].trim(), line: l.line });
    else if (items.length && !t.startsWith('#')) items[items.length - 1].text += ' ' + t;
    else items.push({ text: t, line: l.line });
  }
  return items;
}

export function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Resolve a relative link from one repo file to a repo-relative path. */
export function resolveLink(fromFile: string, href: string): string {
  const parts = fromFile.split('/').slice(0, -1);
  for (const seg of href.split('#')[0].split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

export function relativeLink(fromFile: string, toFile: string): string {
  const from = fromFile.split('/').slice(0, -1);
  const to = toFile.split('/');
  let i = 0;
  while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
  return [...Array(from.length - i).fill('..'), ...to.slice(i)].join('/');
}
