// Free-form markdown pages that aren't part of dinner planning (desserts/*.md). They have a `# Title`, an optional
// italic description, and `##` sections holding `###` subheadings, numbered steps, bullets, or plain paragraphs.
import { parseDocument } from './markdown.ts';

export type Block =
  | { kind: 'subheading'; text: string }
  | { kind: 'steps' | 'bullets'; items: string[] }
  | { kind: 'paragraph'; text: string };

export interface FreeformPage {
  path: string;
  slug: string;
  title: string;
  description: string | null;
  sections: { heading: string; blocks: Block[] }[];
}

export function isDessertPath(path: string): boolean {
  return /^desserts\/[^/]+\.md$/.test(path);
}

function blocks(lines: string[]): Block[] {
  const out: Block[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    const last = out.at(-1);
    if (!t) continue;
    const sub = /^###\s+(.+)$/.exec(t);
    const step = /^\d+[.)]\s+(.*)$/.exec(t);
    const bullet = /^[-*]\s+(.*)$/.exec(t);
    if (sub) out.push({ kind: 'subheading', text: sub[1] });
    else if (step || bullet) {
      const kind = step ? 'steps' : 'bullets';
      const text = (step ?? bullet)![1];
      if (last && last.kind === kind) last.items.push(text);
      else out.push({ kind, items: [text] });
    } else if (last && (last.kind === 'steps' || last.kind === 'bullets')) {
      last.items[last.items.length - 1] += ' ' + t; // a wrapped list item
    } else if (last && last.kind === 'paragraph') last.text += ' ' + t;
    else out.push({ kind: 'paragraph', text: t });
  }
  return out;
}

export function parseFreeform(path: string, text: string): FreeformPage {
  const doc = parseDocument(text);
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  const intro = doc.preamble.map((l) => l.text.trim()).filter(Boolean).join(' ');
  const italic = /^\*([^*].*)\*$/.exec(intro);
  return {
    path,
    slug,
    title: doc.title ?? slug,
    description: italic ? italic[1] : intro || null,
    sections: doc.sections.map((s) => ({ heading: s.heading, blocks: blocks(s.lines.map((l) => l.text)) })),
  };
}
