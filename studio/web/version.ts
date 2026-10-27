import type { EditableItem } from './api.js';

/**
 * "New version" (FR-11): a released item that changes needs a higher version and a changelog entry for it
 * (FORMAT.md 7.2). The bump starts from the saved version, so choosing again replaces the draft entry instead of
 * stacking a second one.
 */

export type Bump = 'patch' | 'minor' | 'major';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

export function bumped(version: string, bump: Bump): string | undefined {
  const m = SEMVER.exec(version);
  if (!m) return undefined;
  const [major, minor, patch] = m.slice(1, 4).map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Sets the new version and puts its changelog entry on top; returns the new version, or undefined for a bad one. */
export function applyBump(item: EditableItem, savedVersion: string, bump: Bump): string | undefined {
  const next = bumped(savedVersion, bump);
  if (!next) return undefined;
  const current = String(item.meta.version ?? '');
  const top = /^### (.+)$/m.exec(item.changelog);
  if (current !== savedVersion && top?.[1].trim() === current) item.changelog = item.changelog.replace(top[0], `### ${next}`);
  else item.changelog = `### ${next}\n- \n\n${item.changelog}`.trimEnd();
  item.meta.version = next;
  return next;
}
