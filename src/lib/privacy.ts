/** Privacy safeguards applied in the analysis layer (in addition to RLS). */

export const DEFAULT_MIN_GROUP_SIZE = 8;
export const HARD_MIN_GROUP_SIZE = 5;

export function effectiveThreshold(configured: number | null | undefined): number {
  const n = Number(configured);
  if (!Number.isFinite(n)) return DEFAULT_MIN_GROUP_SIZE;
  return Math.max(HARD_MIN_GROUP_SIZE, Math.round(n));
}

/** True when a group is large enough for sensitive team-level survey/workforce insights. */
export function meetsThreshold(groupSize: number | null | undefined, threshold: number): boolean {
  return typeof groupSize === "number" && groupSize >= effectiveThreshold(threshold);
}

export interface Suppressible {
  teamId: string;
  teamName: string;
  size: number;
}

/**
 * Partition groups into publishable groups and a combined "small groups" bucket.
 * If the combined bucket would itself fall under the threshold it is dropped entirely, so
 * that no residual bucket can identify a person.
 */
export function suppressSmallGroups<T extends Suppressible>(groups: T[], threshold: number) {
  const t = effectiveThreshold(threshold);
  const shown = groups.filter((g) => g.size >= t);
  const small = groups.filter((g) => g.size < t);
  const combinedSize = small.reduce((a, g) => a + g.size, 0);
  return {
    shown,
    suppressedCount: small.length,
    combined: combinedSize >= t ? { size: combinedSize, groups: small.length } : null,
  };
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /https?:\/\/\S+/gi;
const EMP_ID = /\b(?:EMP|ID|E)[-_ ]?\d{3,}\b/gi;
const PHONE = /(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g;

/** Best-effort minimization before storage or AI processing. Not a guarantee of anonymity. */
export function redactPII(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(URL_RE, "[link]")
    .replace(EMP_ID, "[id]")
    .replace(PHONE, "[phone]")
    .slice(0, 1000);
}

export const PRIVACY_NOTICE =
  "PeopleLogic reports on teams, not individuals. Insights for groups below the minimum group size are suppressed or combined. Redaction of free text is best-effort and does not guarantee anonymity.";
