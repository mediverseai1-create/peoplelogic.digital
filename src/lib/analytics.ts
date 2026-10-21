/**
 * Deterministic, transparent team-level workforce indicators.
 *
 * IMPORTANT: nothing in this file is a trained or validated predictive model.
 * The output is descriptive: observed indicators and potential risk signals with a plain
 * explanation of the evidence behind each. Individual employees are never scored.
 */

export type EvidenceKind = "observed_indicator" | "potential_risk_signal";
export type Level = "no_signal" | "watch" | "elevated" | "insufficient_data";
export type Confidence = "low" | "medium" | "high";

export interface TeamRef {
  id: string;
  name: string;
  department?: string | null;
}
export interface SnapshotRow { team_id: string; period: string; headcount: number }
export interface TurnoverRow { team_id: string; period: string; departures: number; voluntary?: number | null; involuntary?: number | null }
export interface StaffingRow { team_id: string; period: string; approved_positions: number; open_positions: number; hires: number }
export interface WorkloadRow {
  team_id: string; period: string;
  demand_hours: number | null; capacity_hours: number | null; overtime_hours: number | null; backlog: number | null;
}
export interface EngagementRow { team_id: string; period: string; avg_score: number; responses: number }

export interface WorkforceDataset {
  teams: TeamRef[];
  snapshots: SnapshotRow[];
  turnover: TurnoverRow[];
  staffing: StaffingRow[];
  workload: WorkloadRow[];
  engagement: EngagementRow[];
}

export interface Signal {
  id: string;
  kind: EvidenceKind;
  label: string;
  observed: string;
  severity: 1 | 2;
}

export interface TeamAnalysis {
  teamId: string;
  teamName: string;
  department?: string | null;
  headcount: number | null;
  latestPeriod: string | null;
  periodsObserved: number;
  recentTurnoverRate: number | null; // departures / avg headcount over recent window
  priorTurnoverRate: number | null;
  recentDepartures: number | null;
  priorDepartures: number | null;
  utilization: number | null; // demand / capacity, latest period
  overtimeRatio: number | null; // overtime / capacity, latest period
  backlogChangePct: number | null;
  vacancyRate: number | null; // open / approved, latest period
  engagementDelta: number | null;
  engagementSuppressed: boolean;
  signals: Signal[];
  level: Level;
  confidence: Confidence;
  dataGaps: string[];
}

const WINDOW = 3;

const byPeriod = <T extends { period: string }>(rows: T[]) => [...rows].sort((a, b) => a.period.localeCompare(b.period));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);
const pct = (v: number | null, d = 1) => (v === null ? "n/a" : `${(v * 100).toFixed(d)}%`);

export function analyzeTeams(ds: WorkforceDataset, opts: { minGroupSize: number }): TeamAnalysis[] {
  return ds.teams.map((team) => analyzeTeam(team, ds, opts.minGroupSize));
}

export function analyzeTeam(team: TeamRef, ds: WorkforceDataset, minGroupSize: number): TeamAnalysis {
  const snaps = byPeriod(ds.snapshots.filter((r) => r.team_id === team.id));
  const turn = byPeriod(ds.turnover.filter((r) => r.team_id === team.id));
  const staff = byPeriod(ds.staffing.filter((r) => r.team_id === team.id));
  const load = byPeriod(ds.workload.filter((r) => r.team_id === team.id));
  const eng = byPeriod(ds.engagement.filter((r) => r.team_id === team.id));

  const dataGaps: string[] = [];
  if (!snaps.length) dataGaps.push("No headcount history (needed to compute turnover rates).");
  if (!turn.length) dataGaps.push("No departure history.");
  if (!staff.length) dataGaps.push("No staffing/vacancy records.");
  if (!load.length) dataGaps.push("No workload/capacity data.");
  if (!eng.length) dataGaps.push("No survey data for this team (or group below privacy threshold).");

  const latestHeadcount = snaps.length ? snaps[snaps.length - 1].headcount : null;
  const periodSet = new Set<string>([...snaps, ...turn, ...staff, ...load].map((r) => r.period));
  const periodsObserved = periodSet.size;
  const latestPeriod = periodsObserved ? [...periodSet].sort().at(-1)! : null;

  // --- turnover: compare last WINDOW periods with the WINDOW before
  const hcAt = (period: string) => snaps.find((s) => s.period === period)?.headcount ?? latestHeadcount;
  const split = (rows: TurnoverRow[]) => {
    const recent = rows.slice(-WINDOW);
    const prior = rows.slice(-WINDOW * 2, -WINDOW);
    return { recent, prior };
  };
  const { recent, prior } = split(turn);
  const rate = (rows: TurnoverRow[]) => {
    if (!rows.length) return null;
    const hcs = rows.map((r) => hcAt(r.period)).filter((x): x is number => typeof x === "number" && x > 0);
    const hc = avg(hcs);
    return hc ? sum(rows.map((r) => r.departures)) / hc : null;
  };
  const recentRate = rate(recent);
  const priorRate = prior.length === WINDOW ? rate(prior) : null;
  const recentDeps = recent.length ? sum(recent.map((r) => r.departures)) : null;
  const priorDeps = prior.length ? sum(prior.map((r) => r.departures)) : null;
  if (turn.length && turn.length < WINDOW * 2) dataGaps.push(`Only ${turn.length} month(s) of turnover history; period-over-period comparison needs ${WINDOW * 2}.`);

  // --- workload (latest period with data)
  const lastLoad = load.length ? load[load.length - 1] : null;
  const utilization = lastLoad && lastLoad.demand_hours != null && lastLoad.capacity_hours ? lastLoad.demand_hours / lastLoad.capacity_hours : null;
  const overtimeRatio = lastLoad && lastLoad.overtime_hours != null && lastLoad.capacity_hours ? lastLoad.overtime_hours / lastLoad.capacity_hours : null;
  const backlogs = load.filter((r) => r.backlog != null);
  const backlogWin = backlogs.slice(-WINDOW);
  const backlogChangePct =
    backlogWin.length >= 2 && backlogWin[0].backlog! > 0
      ? (backlogWin[backlogWin.length - 1].backlog! - backlogWin[0].backlog!) / backlogWin[0].backlog!
      : null;

  // --- vacancy
  const lastStaff = staff.length ? staff[staff.length - 1] : null;
  const vacancyRate = lastStaff && lastStaff.approved_positions > 0 ? lastStaff.open_positions / lastStaff.approved_positions : null;

  // --- engagement (respects privacy threshold on responses per period)
  const qualifying = eng.filter((e) => e.responses >= minGroupSize);
  const engagementSuppressed = eng.length > 0 && qualifying.length < eng.length;
  let engagementDelta: number | null = null;
  if (qualifying.length >= 2) {
    const recentE = qualifying.slice(-WINDOW);
    const priorE = qualifying.slice(-WINDOW * 2, -WINDOW);
    const base = priorE.length ? avg(priorE.map((e) => e.avg_score)) : recentE[0].avg_score;
    const cur = avg(recentE.map((e) => e.avg_score));
    if (base != null && cur != null) engagementDelta = cur - base;
  }

  // --- signals
  const signals: Signal[] = [];
  if (recentRate != null && priorRate != null && recentDeps != null && recentDeps >= 2 && recentRate > priorRate * 1.25) {
    signals.push({
      id: "turnover_rise", kind: "observed_indicator", severity: recentRate > priorRate * 1.75 ? 2 : 1,
      label: "Departures increased versus the prior window",
      observed: `${recentDeps} departures in the last ${recent.length} month(s) (${pct(recentRate)} of average headcount) vs ${priorDeps} in the prior ${prior.length} (${pct(priorRate)}).`,
    });
  }
  if (utilization != null && utilization > 1.0) {
    signals.push({
      id: "capacity_pressure", kind: "potential_risk_signal", severity: utilization > 1.1 ? 2 : 1,
      label: "Estimated demand exceeds recorded capacity",
      observed: `Demand/capacity ratio of ${utilization.toFixed(2)} in ${lastLoad!.period.slice(0, 7)}.`,
    });
  }
  if (overtimeRatio != null && overtimeRatio > 0.08) {
    signals.push({
      id: "overtime", kind: "potential_risk_signal", severity: overtimeRatio > 0.15 ? 2 : 1,
      label: "Overtime is a notable share of capacity",
      observed: `Overtime equals ${pct(overtimeRatio)} of capacity hours in ${lastLoad!.period.slice(0, 7)}.`,
    });
  }
  if (backlogChangePct != null && backlogChangePct > 0.2) {
    signals.push({
      id: "backlog_growth", kind: "potential_risk_signal", severity: backlogChangePct > 0.5 ? 2 : 1,
      label: "Backlog is growing",
      observed: `Backlog rose ${pct(backlogChangePct, 0)} across the last ${backlogWin.length} recorded months.`,
    });
  }
  if (vacancyRate != null && vacancyRate > 0.1) {
    signals.push({
      id: "vacancy", kind: "observed_indicator", severity: vacancyRate > 0.2 ? 2 : 1,
      label: "Open positions are a notable share of approved headcount",
      observed: `${lastStaff!.open_positions} of ${lastStaff!.approved_positions} approved positions open (${pct(vacancyRate, 0)}).`,
    });
  }
  if (engagementDelta != null && engagementDelta <= -0.3) {
    signals.push({
      id: "engagement_decline", kind: "observed_indicator", severity: engagementDelta <= -0.6 ? 2 : 1,
      label: "Average survey score declined",
      observed: `Average score changed by ${engagementDelta.toFixed(2)} points (1-5 scale) versus the earlier window.`,
    });
  }

  const dimensions = [recentRate != null, utilization != null, vacancyRate != null, engagementDelta != null || qualifying.length > 0].filter(Boolean).length;
  const points = sum(signals.map((s) => s.severity));
  let level: Level;
  if (dimensions === 0) level = "insufficient_data";
  else if (points >= 4 || signals.length >= 3) level = "elevated";
  else if (points >= 1) level = "watch";
  else level = "no_signal";

  let confidence: Confidence = "low";
  if (periodsObserved >= 12 && dimensions >= 3) confidence = "high";
  else if (periodsObserved >= 6 && dimensions >= 2) confidence = "medium";

  return {
    teamId: team.id, teamName: team.name, department: team.department ?? null,
    headcount: latestHeadcount, latestPeriod, periodsObserved,
    recentTurnoverRate: recentRate, priorTurnoverRate: priorRate, recentDepartures: recentDeps, priorDepartures: priorDeps,
    utilization, overtimeRatio, backlogChangePct, vacancyRate, engagementDelta, engagementSuppressed,
    signals, level, confidence, dataGaps,
  };
}

export const LEVEL_LABEL: Record<Level, string> = {
  no_signal: "No signal",
  watch: "Watch",
  elevated: "Elevated",
  insufficient_data: "Insufficient data",
};

export interface OrgTrendPoint { period: string; headcount: number; departures: number; turnoverRate: number | null }

/** Organization-wide monthly series, computed only from teams the caller is allowed to see. */
export function orgTrend(ds: WorkforceDataset): OrgTrendPoint[] {
  const periods = [...new Set([...ds.snapshots.map((s) => s.period), ...ds.turnover.map((t) => t.period)])].sort();
  return periods.map((period) => {
    const headcount = sum(ds.snapshots.filter((s) => s.period === period).map((s) => s.headcount));
    const departures = sum(ds.turnover.filter((t) => t.period === period).map((t) => t.departures));
    return { period, headcount, departures, turnoverRate: headcount > 0 ? departures / headcount : null };
  });
}

/** Trailing-12-month annualized turnover: departures in last 12 periods / average headcount. */
export function annualTurnover(points: OrgTrendPoint[]): { rate: number | null; months: number } {
  const win = points.slice(-12);
  const hc = avg(win.filter((p) => p.headcount > 0).map((p) => p.headcount));
  if (!hc) return { rate: null, months: win.length };
  return { rate: sum(win.map((p) => p.departures)) / hc, months: win.length };
}

// ---------------------------------------------------------------- root cause findings (hypotheses, not conclusions)

export interface Finding {
  teamId: string;
  teamName: string;
  observedPattern: string;
  evidence: string[];
  possibleExplanation: string;
  alternatives: string[];
  confidence: Confidence;
  dataNeeded: string[];
  nextSteps: string[];
}

export function buildFindings(teams: TeamAnalysis[]): Finding[] {
  return teams
    .filter((t) => t.signals.length > 0)
    .map((t) => {
      const ids = new Set(t.signals.map((s) => s.id));
      const turnoverUp = ids.has("turnover_rise");
      const workload = ids.has("capacity_pressure") || ids.has("overtime") || ids.has("backlog_growth");
      const parts: string[] = [];
      if (turnoverUp && workload) parts.push("higher departures coincide with workload pressure indicators");
      else if (turnoverUp) parts.push("departures rose without a recorded workload indicator in the available data");
      else if (workload) parts.push("workload pressure indicators are present without a rise in departures yet");
      if (ids.has("vacancy")) parts.push("open positions may be increasing load on remaining staff");
      if (ids.has("engagement_decline")) parts.push("survey scores moved down");
      const observedPattern = `In ${t.teamName}, ${parts.join("; ")}.`;

      const explanation =
        turnoverUp && workload
          ? "A possible relationship: sustained workload above capacity may be associated with attrition, and attrition may in turn raise the load on remaining staff. The data shows co-movement, not cause."
          : workload
            ? "Sustained demand above capacity can precede retention challenges in some teams, but this dataset does not show that it has here."
            : "The pattern is consistent with several explanations; more data is needed to narrow them.";

      return {
        teamId: t.teamId,
        teamName: t.teamName,
        observedPattern,
        evidence: t.signals.map((s) => `${s.label}: ${s.observed}`),
        possibleExplanation: explanation,
        alternatives: [
          "Seasonal or one-off events (e.g. a project ending, a restructuring, or a planned transition).",
          "Departures concentrated in a single sub-group or a small number of events.",
          "External labor-market conditions or compensation relative to market (not in this dataset).",
          "Changes in management, role scope, or data-recording practices between periods.",
        ],
        confidence: t.confidence,
        dataNeeded: [
          ...t.dataGaps,
          "Exit and stay-interview themes at aggregate level",
          "Compensation band and promotion-timing summaries",
        ].slice(0, 6),
        nextSteps: [
          "Review these indicators with the team's leadership and HR partner before drawing conclusions.",
          "Collect aggregate qualitative input (e.g. facilitated team discussion) to test the hypotheses above.",
          "Record any intervention you choose and review its outcome after a set period.",
        ],
      };
    });
}

// ---------------------------------------------------------------- recommendation templates

export interface RecommendationDraft {
  teamId: string;
  teamName: string;
  recommendation: string;
  evidence: string;
  intendedOutcome: string;
  ownerRole: string;
  priority: "low" | "medium" | "high";
}

export function draftRecommendations(teams: TeamAnalysis[]): RecommendationDraft[] {
  const out: RecommendationDraft[] = [];
  for (const t of teams) {
    for (const s of t.signals) {
      const priority = s.severity === 2 ? "high" : "medium";
      const ev = `${s.label}: ${s.observed}`;
      const mk = (recommendation: string, intendedOutcome: string, ownerRole: string) =>
        out.push({ teamId: t.teamId, teamName: t.teamName, recommendation, evidence: ev, intendedOutcome, ownerRole, priority });
      switch (s.id) {
        case "capacity_pressure":
        case "overtime":
          mk("Review workload distribution and prioritization with the team; consider whether redistribution, process change or added capacity fits.", "Demand and capacity are better matched; reliance on overtime falls.", "Department Manager");
          break;
        case "backlog_growth":
          mk("Investigate the source of backlog growth (inflow, blockers, coverage) before deciding on hiring.", "Backlog trend stabilizes.", "Department Manager");
          break;
        case "vacancy":
          mk("Review staffing coverage and the status of open requisitions.", "Open positions are filled or work is re-planned around them.", "HR Director");
          break;
        case "turnover_rise":
          mk("Hold aggregate stay/exit-theme discussions and review recent organizational changes affecting this team.", "Clearer understanding of contributing factors.", "HR Director");
          break;
        case "engagement_decline":
          mk("Investigate recurring feedback themes and communicate follow-up actions to the team.", "Survey themes are acknowledged and acted on.", "Department Manager");
          break;
      }
    }
  }
  return out;
}
