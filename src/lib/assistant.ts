import type { PrivacyScoped } from "./scope";

export interface AssistantContext {
  organization: { minGroupSize: number; notes: string[] };
  teams: {
    team: string;
    department: string | null;
    headcount: number | null;
    level: string;
    confidence: string;
    latestPeriod: string | null;
    recentTurnoverRate: number | null;
    priorTurnoverRate: number | null;
    utilization: number | null;
    overtimeRatio: number | null;
    vacancyRate: number | null;
    backlogChangePct: number | null;
    engagementDelta: number | null;
    signals: string[];
    dataGaps: string[];
  }[];
  suppressed: { teams: number; note: string };
  costs: { team: string; period: string; total: number; perDeparture: number | null; provenance: string }[];
  interventions: { title: string; status: string; team: string | null }[];
  scenarios: { name: string; summary: string }[];
}

/** Build the ONLY data the assistant may see: aggregated, privacy-scoped, organization-scoped. */
export function buildAssistantContext(args: {
  scoped: PrivacyScoped;
  costs: AssistantContext["costs"];
  interventions: AssistantContext["interventions"];
  scenarios: AssistantContext["scenarios"];
  minGroupSize: number;
}): AssistantContext {
  const r = (n: number | null) => (n == null ? null : Math.round(n * 1000) / 1000);
  const shownNames = new Set(args.scoped.shown.map((t) => t.teamName));
  return {
    organization: {
      minGroupSize: args.minGroupSize,
      notes: [
        "All figures are team-level aggregates computed from imported data.",
        "Indicators are descriptive; no predictive model has been trained or validated.",
      ],
    },
    teams: args.scoped.shown.map((t) => ({
      team: t.teamName,
      department: t.department ?? null,
      headcount: t.headcount,
      level: t.level,
      confidence: t.confidence,
      latestPeriod: t.latestPeriod,
      recentTurnoverRate: r(t.recentTurnoverRate),
      priorTurnoverRate: r(t.priorTurnoverRate),
      utilization: r(t.utilization),
      overtimeRatio: r(t.overtimeRatio),
      vacancyRate: r(t.vacancyRate),
      backlogChangePct: r(t.backlogChangePct),
      engagementDelta: r(t.engagementDelta),
      signals: t.signals.map((s) => `${s.label}: ${s.observed}`),
      dataGaps: t.dataGaps,
    })),
    suppressed: {
      teams: args.scoped.suppressedCount,
      note: "Teams below the minimum group size are withheld to protect privacy.",
    },
    costs: args.costs.filter((c) => shownNames.has(c.team)),
    interventions: args.interventions.filter((i) => !i.team || shownNames.has(i.team)),
    scenarios: args.scenarios,
  };
}
