import type { TeamAnalysis } from "./analytics";
import { suppressSmallGroups } from "./privacy";

export interface PrivacyScoped {
  shown: TeamAnalysis[];
  suppressedCount: number;
  combined: { size: number; groups: number } | null;
  threshold: number;
}

/**
 * Teams smaller than the minimum group size (or with unknown headcount) are not shown individually.
 * They are reported only as a combined bucket, and only when that bucket itself meets the threshold.
 */
export function privacyScope(analyses: TeamAnalysis[], threshold: number): PrivacyScoped {
  const sized = analyses.map((a) => ({ teamId: a.teamId, teamName: a.teamName, size: a.headcount ?? 0, a }));
  const r = suppressSmallGroups(sized, threshold);
  return { shown: r.shown.map((x) => x.a), suppressedCount: r.suppressedCount, combined: r.combined, threshold };
}

export function suppressionNotice(p: PrivacyScoped): string | null {
  if (p.suppressedCount === 0) return null;
  const base = `${p.suppressedCount} team${p.suppressedCount === 1 ? "" : "s"} below the minimum group size (${p.threshold}) or without headcount data ${p.suppressedCount === 1 ? "is" : "are"} not shown individually.`;
  return p.combined ? `${base} Combined, they represent ${p.combined.size} people across ${p.combined.groups} teams.` : base;
}
