import { describe, expect, it } from "vitest";
import { DEFAULT_MIN_GROUP_SIZE, effectiveThreshold, meetsThreshold, redactPII, suppressSmallGroups } from "@/lib/privacy";
import { analyzeTeams, type WorkforceDataset } from "@/lib/analytics";
import { privacyScope } from "@/lib/scope";
import { buildAssistantContext } from "@/lib/assistant";
import { buildReportSections } from "@/lib/reports";

describe("thresholds", () => {
  it("never allows a threshold below the hard floor", () => {
    expect(effectiveThreshold(1)).toBe(5);
    expect(effectiveThreshold(undefined)).toBe(DEFAULT_MIN_GROUP_SIZE);
    expect(effectiveThreshold(12)).toBe(12);
  });
  it("meetsThreshold is false for unknown sizes", () => {
    expect(meetsThreshold(null, 8)).toBe(false);
    expect(meetsThreshold(8, 8)).toBe(true);
    expect(meetsThreshold(7, 8)).toBe(false);
  });
});

describe("suppressSmallGroups", () => {
  const g = (name: string, size: number) => ({ teamId: name, teamName: name, size });
  it("combines small groups only when the combined bucket is itself large enough", () => {
    const r = suppressSmallGroups([g("A", 20), g("B", 4), g("C", 5)], 8);
    expect(r.shown.map((x) => x.teamName)).toEqual(["A"]);
    expect(r.suppressedCount).toBe(2);
    expect(r.combined).toEqual({ size: 9, groups: 2 });
  });
  it("drops the residual bucket when it would still identify people", () => {
    const r = suppressSmallGroups([g("A", 20), g("B", 3)], 8);
    expect(r.combined).toBeNull();
  });
});

describe("redactPII", () => {
  it("removes emails, phones, links and employee ids", () => {
    const out = redactPII("Contact bob@x.org, +44 20 7946 0958, https://x.org/p, EMP-12345 please");
    expect(out).not.toMatch(/bob@x\.org|7946|https|12345/);
  });
});

const ds: WorkforceDataset = {
  teams: [{ id: "big", name: "Big Team" }, { id: "tiny", name: "Tiny Team" }],
  snapshots: ["2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01"].flatMap((p) => [
    { team_id: "big", period: p, headcount: 20 },
    { team_id: "tiny", period: p, headcount: 3 },
  ]),
  turnover: ["2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01"].flatMap((p, i) => [
    { team_id: "big", period: p, departures: i < 3 ? 0 : 2 },
    { team_id: "tiny", period: p, departures: 1 },
  ]),
  staffing: [], workload: [], engagement: [],
};

describe("privacy scoping end to end", () => {
  const analyses = analyzeTeams(ds, { minGroupSize: 8 });
  const scoped = privacyScope(analyses, 8);
  it("hides small teams from team-level output", () => {
    expect(scoped.shown.map((t) => t.teamName)).toEqual(["Big Team"]);
    expect(scoped.suppressedCount).toBe(1);
  });
  it("never leaks a suppressed team into the assistant context", () => {
    const ctx = buildAssistantContext({ scoped, costs: [{ team: "Tiny Team", period: "2025-01", total: 1, perDeparture: 1, provenance: "x" }], interventions: [{ title: "t", status: "open", team: "Tiny Team" }], scenarios: [], minGroupSize: 8 });
    expect(JSON.stringify(ctx)).not.toContain("Tiny Team");
  });
  it("never leaks a suppressed team into reports", () => {
    const sections = buildReportSections({ type: "monthly", periodLabel: "x", dataset: ds, scoped, costs: [], scenarios: [], interventions: [], feedbackThemes: [] });
    expect(sections).toHaveLength(11);
    expect(JSON.stringify(sections)).not.toContain("Tiny Team");
  });
});
