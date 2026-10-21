import { LEVEL_LABEL, annualTurnover, buildFindings, draftRecommendations, orgTrend, type TeamAnalysis, type WorkforceDataset } from "./analytics";
import type { PrivacyScoped } from "./scope";
import { suppressionNotice } from "./scope";

export const REPORT_TYPES = {
  monthly: "Monthly workforce intelligence report",
  quarterly: "Quarterly people and retention review",
  attrition: "Attrition risk briefing",
  workload: "Workload and capacity report",
  feedback: "Employee feedback summary",
  cost: "Turnover cost analysis",
  scenario: "Workforce planning scenario report",
  action_plan: "Executive action plan",
} as const;
export type ReportType = keyof typeof REPORT_TYPES;

export interface Section {
  heading: string;
  body: string;
  provenance: string;
}

export interface ReportInputs {
  type: ReportType;
  periodLabel: string;
  dataset: WorkforceDataset;
  scoped: PrivacyScoped;
  costs: { team: string; period: string; total: number; perDeparture: number | null; provenance: string }[];
  scenarios: { name: string; summary: string }[];
  interventions: { title: string; owner: string | null; due: string | null; status: string; team: string | null }[];
  feedbackThemes: { theme: string; n: number; avgScore: number | null }[];
}

const pct = (v: number | null, d = 1) => (v == null ? "n/a" : `${(v * 100).toFixed(d)}%`);
const none = (what: string) => `No data available for ${what}. This section has not been populated; import the relevant dataset to include it.`;

/** Deterministic report content built only from the organization's own data and analysis results. */
export function buildReportSections(i: ReportInputs): Section[] {
  const { scoped } = i;
  const teams: TeamAnalysis[] = scoped.shown;
  const trend = orgTrend(i.dataset);
  const annual = annualTurnover(trend);
  const sections: Section[] = [];

  // 1. Executive summary
  const flagged = teams.filter((t) => t.level === "elevated" || t.level === "watch");
  const lines = [`${REPORT_TYPES[i.type]} - ${i.periodLabel}.`];
  if (trend.length) {
    const last = trend[trend.length - 1];
    lines.push(`Latest recorded headcount (${last.period.slice(0, 7)}): ${last.headcount}. Trailing turnover (${annual.months} months of data): ${pct(annual.rate)}.`);
  } else lines.push("No headcount or turnover history has been imported yet.");
  lines.push(
    teams.length
      ? `${flagged.length} of ${teams.length} reportable teams show at least one indicator worth reviewing (${teams.filter((t) => t.level === "elevated").length} elevated, ${teams.filter((t) => t.level === "watch").length} watch).`
      : "No teams currently meet the privacy threshold for team-level reporting.",
  );
  lines.push("These are descriptive indicators for decision support, not predictions about any individual.");
  sections.push({ heading: "1. Executive summary", body: lines.join("\n"), provenance: "calculated" });

  // 2. Trends
  sections.push({
    heading: "2. Key workforce trends",
    body: trend.length
      ? trend.slice(-6).map((p) => `${p.period.slice(0, 7)}: headcount ${p.headcount}, departures ${p.departures}, turnover ${pct(p.turnoverRate)}`).join("\n")
      : none("workforce trends"),
    provenance: "observed",
  });

  // 3. Team indicators
  sections.push({
    heading: "3. Team-level risk indicators",
    body:
      (teams.length
        ? teams.map((t) => `${t.teamName}: ${LEVEL_LABEL[t.level]} (confidence: ${t.confidence}; ${t.periodsObserved} months of data)`).join("\n")
        : none("team-level indicators")) + (suppressionNotice(scoped) ? `\n\n${suppressionNotice(scoped)}` : ""),
    provenance: "potential risk signals (descriptive)",
  });

  // 4. Evidence
  const evidence = teams.flatMap((t) => t.signals.map((s) => `${t.teamName} - ${s.label}: ${s.observed}`));
  sections.push({ heading: "4. Supporting evidence", body: evidence.length ? evidence.join("\n") : "No indicators met the thresholds in the available data.", provenance: "observed" });

  // 5. Root causes
  const findings = buildFindings(teams);
  sections.push({
    heading: "5. Potential root causes (hypotheses)",
    body: findings.length
      ? findings.map((f) => `${f.observedPattern}\nPossible explanation: ${f.possibleExplanation}\nAlternatives: ${f.alternatives.slice(0, 2).join(" ")}\nConfidence: ${f.confidence}.`).join("\n\n")
      : "No hypotheses generated: no indicators met the thresholds. Absence of a signal is not evidence that no issue exists.",
    provenance: "hypothesis - not verified",
  });

  // 6. Workload
  const wl = teams.filter((t) => t.utilization != null || t.overtimeRatio != null);
  sections.push({
    heading: "6. Workload and capacity concerns",
    body: wl.length
      ? wl.map((t) => `${t.teamName}: demand/capacity ${t.utilization?.toFixed(2) ?? "n/a"}, overtime ${pct(t.overtimeRatio)} of capacity, backlog change ${pct(t.backlogChangePct, 0)}, vacancy ${pct(t.vacancyRate, 0)}`).join("\n")
      : none("workload and capacity"),
    provenance: "observed / estimated from imported hours",
  });

  // 7. Feedback
  sections.push({
    heading: "7. Relevant feedback themes",
    body: i.feedbackThemes.length
      ? i.feedbackThemes.map((t) => `${t.theme}: ${t.n} responses, average score ${t.avgScore?.toFixed(2) ?? "n/a"} (1-5)`).join("\n") + "\nOnly themes from groups meeting the minimum group size are included. AI/automated interpretation of language may be imperfect."
      : none("feedback themes (or all groups were below the privacy threshold)"),
    provenance: "observed (aggregate)",
  });

  // 8. Financial
  sections.push({
    heading: "8. Financial implications",
    body: i.costs.length
      ? i.costs.map((c) => `${c.team} (${c.period.slice(0, 7)}): total ${Math.round(c.total).toLocaleString()}${c.perDeparture != null ? `, ${Math.round(c.perDeparture).toLocaleString()} per departure` : ""} [${c.provenance}]`).join("\n") + "\nCost figures are estimates from the entered or imported assumptions; they are not guaranteed savings or losses."
      : none("turnover cost"),
    provenance: "user-entered / imported / estimated",
  });

  // 9. Recommended interventions
  const recs = draftRecommendations(teams);
  sections.push({
    heading: "9. Recommended interventions",
    body: recs.length
      ? recs.map((r) => `[${r.priority}] ${r.teamName}: ${r.recommendation} (Owner: ${r.ownerRole}). Evidence: ${r.evidence}`).join("\n")
      : "No interventions suggested from the current indicators.",
    provenance: "recommendation - for human review",
  });

  // 10. Limitations
  sections.push({
    heading: "10. Data limitations and uncertainty",
    body: [
      "Indicators are descriptive and computed from imported data; no predictive model has been trained or validated.",
      "Correlations are not causes. Hypotheses require validation by leaders with organizational context.",
      ...teams.flatMap((t) => t.dataGaps.map((g) => `${t.teamName}: ${g}`)).slice(0, 12),
    ].join("\n"),
    provenance: "system",
  });

  // 11. Actions
  sections.push({
    heading: "11. Action owners and follow-up dates",
    body: i.interventions.length
      ? i.interventions.map((a) => `${a.title}${a.team ? ` (${a.team})` : ""} - owner: ${a.owner ?? "unassigned"}, due: ${a.due ?? "unset"}, status: ${a.status}`).join("\n")
      : "No interventions have been recorded yet. Create interventions from the Manager Insights page.",
    provenance: "user-entered",
  });

  if (i.type === "scenario" && i.scenarios.length) {
    sections.splice(8, 0, { heading: "8b. Workforce planning scenarios", body: i.scenarios.map((s) => `${s.name}: ${s.summary}`).join("\n") + "\nScenario results depend on the stated assumptions and are not forecasts.", provenance: "assumption-based" });
  }
  return sections;
}

export function sectionsToCsv(title: string, sections: Section[]): string {
  // Neutralize spreadsheet formula injection by prefixing risky leading characters.
  const esc = (s: string) => `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  return [`report,heading,body,provenance`, ...sections.map((s) => [title, s.heading, s.body, s.provenance].map(esc).join(","))].join("\n");
}
