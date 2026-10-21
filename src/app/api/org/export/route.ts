import { NextResponse } from "next/server";
import { audit, getAppContext, requirePermission } from "@/lib/context";

const TABLES = ["departments", "teams", "workforce_snapshots", "turnover_records", "staffing_records", "workload_snapshots", "turnover_cost_models", "workforce_scenarios", "manager_recommendations", "intervention_actions", "intervention_outcomes", "leadership_reports", "report_sections"];

/** Authorized data export of the caller's own organization (aggregate records only; no raw survey comments). */
export async function GET() {
  const ctx = await getAppContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    requirePermission(ctx, "manage_settings");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), organization: { id: ctx.org.id, name: ctx.org.name } };
  for (const t of TABLES) {
    const { data } = await ctx.supabase.from(t).select("*").eq("org_id", ctx.org.id).limit(50000);
    out[t] = data ?? [];
  }
  await audit(ctx, "org.exported", "organizations");
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="peoplelogic-export-${ctx.org.id.slice(0, 8)}.json"`, "Cache-Control": "no-store" },
  });
}
