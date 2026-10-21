import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkforceDataset } from "./analytics";
import type { Role } from "./roles";
import { can } from "./roles";

const PAGE = 1000;

/** Paginate past PostgREST's default row cap. Queries run as the user, so RLS still applies. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 200000; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export interface FeedbackAgg {
  teamId: string;
  period: string;
  responses: number;
  avgScore: number | null;
  themes: Record<string, { n: number; avgScore: number | null }>;
}

export interface LoadedData {
  dataset: WorkforceDataset;
  feedback: FeedbackAgg[];
  sourceCoverage: { headcount: boolean; turnover: boolean; staffing: boolean; workload: boolean; survey: boolean };
  periods: { first: string | null; last: string | null };
  lastUpdated: string | null;
}

export async function loadWorkforceData(supabase: SupabaseClient, orgId: string, role: Role): Promise<LoadedData> {
  const [teamsRes, depsRes] = await Promise.all([
    supabase.from("teams").select("id,name,department_id").eq("org_id", orgId).order("name"),
    supabase.from("departments").select("id,name").eq("org_id", orgId),
  ]);
  const deps = new Map((depsRes.data ?? []).map((d: any) => [d.id, d.name as string]));
  const teams = (teamsRes.data ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string, department: t.department_id ? deps.get(t.department_id) ?? null : null }));

  const q = (table: string, cols: string) =>
    fetchAll<any>((f, t) => supabase.from(table).select(cols).eq("org_id", orgId).order("period").range(f, t));

  const [snapshots, turnover, staffing, workload] = await Promise.all([
    q("workforce_snapshots", "team_id,period,headcount,created_at"),
    q("turnover_records", "team_id,period,departures,voluntary,involuntary,created_at"),
    q("staffing_records", "team_id,period,approved_positions,open_positions,hires,created_at"),
    q("workload_snapshots", "team_id,period,demand_hours,capacity_hours,overtime_hours,backlog,created_at"),
  ]);

  // Survey aggregation (only roles allowed to read responses; RLS also enforces this).
  const feedback: FeedbackAgg[] = [];
  if (can(role, "view_feedback")) {
    const surveys = await fetchAll<any>((f, t) => supabase.from("feedback_surveys").select("id,period").eq("org_id", orgId).range(f, t));
    const periodOf = new Map(surveys.map((s: any) => [s.id, s.period as string]));
    const resp = await fetchAll<any>((f, t) => supabase.from("feedback_responses").select("survey_id,team_id,theme,score").eq("org_id", orgId).range(f, t));
    const groups = new Map<string, { teamId: string; period: string; scores: number[]; n: number; themes: Map<string, number[]> }>();
    for (const r of resp) {
      const period = periodOf.get(r.survey_id);
      if (!period || !r.team_id) continue;
      const key = `${r.team_id}|${period}`;
      const g = groups.get(key) ?? { teamId: r.team_id, period, scores: [] as number[], n: 0, themes: new Map<string, number[]>() };
      g.n++;
      if (typeof r.score === "number") g.scores.push(r.score);
      const th = r.theme || "unspecified";
      const arr = g.themes.get(th) ?? [];
      if (typeof r.score === "number") arr.push(r.score);
      else arr.push(NaN);
      g.themes.set(th, arr);
      groups.set(key, g);
    }
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    for (const g of groups.values()) {
      const themes: FeedbackAgg["themes"] = {};
      for (const [k, v] of g.themes) themes[k] = { n: v.length, avgScore: mean(v.filter((x) => !Number.isNaN(x))) };
      feedback.push({ teamId: g.teamId, period: g.period, responses: g.n, avgScore: mean(g.scores), themes });
    }
  }

  const engagement = feedback.filter((f) => f.avgScore != null).map((f) => ({ team_id: f.teamId, period: f.period, avg_score: f.avgScore as number, responses: f.responses }));

  const allPeriods = [...snapshots, ...turnover, ...staffing, ...workload].map((r) => r.period as string).sort();
  const created = [...snapshots, ...turnover, ...staffing, ...workload].map((r) => r.created_at as string).sort();

  return {
    dataset: { teams, snapshots, turnover, staffing, workload, engagement },
    feedback,
    sourceCoverage: {
      headcount: snapshots.length > 0,
      turnover: turnover.length > 0,
      staffing: staffing.length > 0,
      workload: workload.length > 0,
      survey: feedback.length > 0,
    },
    periods: { first: allPeriods[0] ?? null, last: allPeriods.at(-1) ?? null },
    lastUpdated: created.at(-1) ?? null,
  };
}

/** Filter a dataset to a team subset and/or a period range (inclusive, YYYY-MM-DD). */
export function filterDataset(ds: WorkforceDataset, f: { teamId?: string | null; from?: string | null; to?: string | null }): WorkforceDataset {
  const inRange = (p: string) => (!f.from || p >= f.from) && (!f.to || p <= f.to);
  const teamOk = (id: string) => !f.teamId || id === f.teamId;
  return {
    teams: ds.teams.filter((t) => teamOk(t.id)),
    snapshots: ds.snapshots.filter((r) => teamOk(r.team_id) && inRange(r.period)),
    turnover: ds.turnover.filter((r) => teamOk(r.team_id) && inRange(r.period)),
    staffing: ds.staffing.filter((r) => teamOk(r.team_id) && inRange(r.period)),
    workload: ds.workload.filter((r) => teamOk(r.team_id) && inRange(r.period)),
    engagement: ds.engagement.filter((r) => teamOk(r.team_id) && inRange(r.period)),
  };
}
