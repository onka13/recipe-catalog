import YAML from 'yaml';
import type { ChangelogEntry, Convention, Instruction, Section } from './model.js';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const FENCE = /^\s*(```|~~~)/;

export class FormatError extends Error {}

/** Splits `---` YAML front matter from the Markdown body. */
export function splitFrontMatter(text: string): { front: unknown; body: string } {
  const match = FRONT_MATTER.exec(text);
  if (!match) throw new FormatError('The file must start with YAML front matter between two "---" lines.');
  try {
    return { front: YAML.parse(match[1]), body: match[2] };
  } catch (error) {
    throw new FormatError(`The front matter is not valid YAML: ${(error as Error).message}`);
  }
}

export function joinFrontMatter(front: object, body: string): string {
  return `---\n${YAML.stringify(front, { lineWidth: 0 })}---\n${body}`;
}

/** Headings of exactly `level` hashes, outside fenced code blocks, with the text up to the next such heading. */
export function sections(text: string, level: number): { lead: string; sections: Section[] } {
  const marker = `${'#'.repeat(level)} `;
  const lead: string[] = [];
  const found: Array<{ title: string; lines: string[] }> = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && line.startsWith(marker)) found.push({ title: line.slice(marker.length).trim(), lines: [] });
    else (found.length ? found[found.length - 1].lines : lead).push(line);
  }
  return { lead: lead.join('\n').trim(), sections: found.map((s) => ({ title: s.title, text: s.lines.join('\n').trim() })) };
}

export interface ParsedBody {
  title: string;
  description: string;
  sections: Section[];
}

/** `# Title`, the description up to the first `## ` heading, then the level-2 sections. */
export function parseBody(body: string): ParsedBody {
  const lines = body.split(/\r?\n/);
  const titleAt = lines.findIndex((line) => line.startsWith('# '));
  const title = titleAt >= 0 ? lines[titleAt].slice(2).trim() : '';
  const { lead, sections: level2 } = sections(lines.slice(titleAt + 1).join('\n'), 2);
  return { title, description: lead, sections: level2 };
}

export function parseInstructions(text: string): Instruction[] {
  return sections(text, 3).sections.map((s) => ({ target: s.title, instruction: s.text }));
}

export function parseConventions(text: string): Convention[] {
  return sections(text, 3).sections.map((s) => ({ pattern: s.title, rule: s.text }));
}

export function renderConventions(conventions: Convention[]): string {
  return conventions.map((c) => `### ${c.pattern}\n${c.rule}`).join('\n\n');
}

/** `### <version>` entries with `- ` notes; a line that is not a list item continues the note before it. */
export function parseChangelog(text: string): ChangelogEntry[] {
  return sections(text, 3).sections.map((s) => {
    const notes: string[] = [];
    for (const line of s.text.split('\n')) {
      const item = /^[-*]\s+(.*)$/.exec(line.trim());
      if (item) notes.push(item[1]);
      else if (line.trim() && notes.length) notes[notes.length - 1] += ` ${line.trim()}`;
    }
    return { version: s.title, notes };
  });
}

export function renderChangelog(entries: ChangelogEntry[]): string {
  return entries.map((e) => `### ${e.version}\n${e.notes.map((n) => `- ${n}`).join('\n')}`).join('\n\n');
}

export function renderInstructions(instructions: Instruction[]): string {
  return instructions.map((i) => `### ${i.target}\n${i.instruction}`).join('\n\n');
}

export function renderBody(title: string, description: string, level2: Section[]): string {
  const parts = [`# ${title}`];
  if (description) parts.push(description);
  for (const s of level2) parts.push(s.text ? `## ${s.title}\n\n${s.text}` : `## ${s.title}`);
  return `${parts.join('\n\n')}\n`;
}
