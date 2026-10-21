import { describe, expect, it } from "vitest";
import { analyzeTeam, annualTurnover, buildFindings, orgTrend, type WorkforceDataset } from "@/lib/analytics";

const months = (n: number) => Array.from({ length: n }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}-01`);
const team = { id: "t1", name: "Support" };
const base = (): WorkforceDataset => ({ teams: [team], snapshots: [], turnover: [], staffing: [], workload: [], engagement: [] });

describe("analyzeTeam", () => {
  it("reports insufficient data when nothing usable exists", () => {
    const a = analyzeTeam(team, base(), 8);
    expect(a.level).toBe("insufficient_data");
    expect(a.confidence).toBe("low");
    expect(a.dataGaps.length).toBeGreaterThan(0);
  });

  it("flags a turnover rise versus the prior window", () => {
    const ds = base();
    ds.snapshots = months(6).map((p) => ({ team_id: "t1", period: p, headcount: 20 }));
    ds.turnover = months(6).map((p, i) => ({ team_id: "t1", period: p, departures: i < 3 ? 0 : 2 }));
    const a = analyzeTeam(team, ds, 8);
    expect(a.signals.map((s) => s.id)).toContain("turnover_rise");
    expect(a.recentDepartures).toBe(6);
    expect(a.priorDepartures).toBe(0);
  });

  it("does not claim a rise from prior=0 with a single departure", () => {
    const ds = base();
    ds.snapshots = months(6).map((p) => ({ team_id: "t1", period: p, headcount: 20 }));
    ds.turnover = months(6).map((p, i) => ({ team_id: "t1", period: p, departures: i === 5 ? 1 : 0 }));
    expect(analyzeTeam(team, ds, 8).signals.map((s) => s.id)).not.toContain("turnover_rise");
  });

  it("flags capacity pressure, overtime, backlog growth and vacancy", () => {
    const ds = base();
    ds.snapshots = months(3).map((p) => ({ team_id: "t1", period: p, headcount: 10 }));
    ds.workload = [100, 120, 160].map((b, i) => ({ team_id: "t1", period: months(3)[i], demand_hours: 1800, capacity_hours: 1500, overtime_hours: 300, backlog: b }));
    ds.staffing = [{ team_id: "t1", period: "2025-03-01", approved_positions: 10, open_positions: 3, hires: 0 }];
    const ids = analyzeTeam(team, ds, 8).signals.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["capacity_pressure", "overtime", "backlog_growth", "vacancy"]));
    expect(analyzeTeam(team, ds, 8).level).toBe("elevated");
  });

  it("ignores survey periods below the minimum group size", () => {
    const ds = base();
    ds.snapshots = months(4).map((p) => ({ team_id: "t1", period: p, headcount: 20 }));
    ds.engagement = [{ team_id: "t1", period: "2025-01-01", avg_score: 4.5, responses: 3 }, { team_id: "t1", period: "2025-02-01", avg_score: 2, responses: 3 }];
    const a = analyzeTeam(team, ds, 8);
    expect(a.engagementDelta).toBeNull();
    expect(a.engagementSuppressed).toBe(true);
  });

  it("confidence grows only with data depth", () => {
    const ds = base();
    ds.snapshots = months(12).map((p) => ({ team_id: "t1", period: p, headcount: 20 }));
    ds.turnover = months(12).map((p) => ({ team_id: "t1", period: p, departures: 1 }));
    ds.workload = months(12).map((p) => ({ team_id: "t1", period: p, demand_hours: 1, capacity_hours: 2, overtime_hours: 0, backlog: 1 }));
    ds.staffing = months(12).map((p) => ({ team_id: "t1", period: p, approved_positions: 10, open_positions: 0, hires: 0 }));
    expect(analyzeTeam(team, ds, 8).confidence).toBe("high");
  });
});

describe("org trend & findings", () => {
  it("computes monthly rates and trailing turnover", () => {
    const ds = base();
    ds.snapshots = months(12).map((p) => ({ team_id: "t1", period: p, headcount: 100 }));
    ds.turnover = months(12).map((p) => ({ team_id: "t1", period: p, departures: 2 }));
    const t = orgTrend(ds);
    expect(t[0].turnoverRate).toBeCloseTo(0.02);
    expect(annualTurnover(t).rate).toBeCloseTo(0.24);
  });
  it("findings carry alternatives and never assert causation", () => {
    const ds = base();
    ds.snapshots = months(6).map((p) => ({ team_id: "t1", period: p, headcount: 20 }));
    ds.turnover = months(6).map((p, i) => ({ team_id: "t1", period: p, departures: i < 3 ? 0 : 2 }));
    ds.workload = months(6).map((p) => ({ team_id: "t1", period: p, demand_hours: 2000, capacity_hours: 1500, overtime_hours: 400, backlog: null }));
    const f = buildFindings([analyzeTeam(team, ds, 8)]);
    expect(f).toHaveLength(1);
    expect(f[0].alternatives.length).toBeGreaterThan(1);
    expect(f[0].possibleExplanation).toMatch(/not cause|co-movement|does not show/i);
    expect(f[0].possibleExplanation).not.toMatch(/\bcaused\b/);
  });
});
