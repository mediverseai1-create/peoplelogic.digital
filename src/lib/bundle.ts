import { analyzeTeams, type TeamAnalysis } from "./analytics";
import type { AppContext } from "./context";
import { filterDataset, loadWorkforceData, type LoadedData } from "./data";
import { effectiveThreshold } from "./privacy";
import { privacyScope, type PrivacyScoped } from "./scope";
import { turnoverCost } from "./calc";

export interface Bundle {
  data: LoadedData;
  dataset: LoadedData["dataset"];
  analyses: TeamAnalysis[];
  scoped: PrivacyScoped;
  threshold: number;
  hasData: boolean;
  filters: { teamId: string | null; from: string | null; to: string | null };
}

export interface Filters {
  team?: string | string[];
  from?: string | string[];
  to?: string | string[];
}
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
const isMonth = (v: string | null) => (v && /^\d{4}-\d{2}(-\d{2})?$/.test(v) ? (v.length === 7 ? `${v}-01` : v) : null);

export async function getBundle(ctx: AppContext, f: Filters = {}): Promise<Bundle> {
  const data = await loadWorkforceData(ctx.supabase, ctx.org.id, ctx.role);
  const filters = { teamId: one(f.team), from: isMonth(one(f.from)), to: isMonth(one(f.to)) };
  const dataset = filterDataset(data.dataset, filters);
  const threshold = effectiveThreshold(ctx.org.min_group_size);
  const analyses = analyzeTeams(dataset, { minGroupSize: threshold });
  const scoped = privacyScope(analyses, threshold);
  const hasData = data.sourceCoverage.headcount || data.sourceCoverage.turnover || data.sourceCoverage.staffing || data.sourceCoverage.workload;
  return { data, dataset, analyses, scoped, threshold, hasData, filters };
}

export interface CostRow {
  id: string;
  team_id: string | null;
  period: string;
  departures: number;
  recruitment_cost: number;
  onboarding_cost: number;
  training_cost: number;
  temp_staffing_cost: number;
  vacancy_days: number;
  daily_lost_capacity_cost: number;
  manager_hours: number;
  manager_hourly_cost: number;
  provenance: string;
}

export async function loadCosts(ctx: AppContext, teamNames: Map<string, string>) {
  const { data } = await ctx.supabase.from("turnover_cost_models").select("*").eq("org_id", ctx.org.id).order("period", { ascending: false }).limit(500);
  const rows = (data ?? []) as CostRow[];
  return rows.map((r) => {
    const b = turnoverCost(r);
    return { ...r, teamName: r.team_id ? teamNames.get(r.team_id) ?? "Unknown team" : "Organization", breakdown: b };
  });
}

/** Names of teams the privacy scope allows to be shown individually. */
export const shownTeamNames = (b: Bundle) => new Set(b.scoped.shown.map((t) => t.teamName));
