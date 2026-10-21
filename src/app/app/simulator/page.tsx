import { deleteScenario, explainScenario } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/ActionForm";
import { SimulatorClient } from "@/components/SimulatorClient";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { getBundle, loadCosts } from "@/lib/bundle";
import type { SimInputs } from "@/lib/calc";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Workforce Simulator" };

export default async function Simulator({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const b = await getBundle(ctx);
  const canSave = can(ctx.role, "save_scenarios");
  const shown = b.scoped.shown;
  const teamId = shown.find((t) => t.teamId === sp.team)?.teamId ?? null;
  const team = shown.find((t) => t.teamId === teamId);

  const observed: (keyof SimInputs)[] = [];
  const d: SimInputs = {
    headcount: 10, baseDemandHours: 1600, baseCapacityHours: 1500, baseOvertimeHours: 0, additionalHires: 2, hoursPerHire: 150, startMonth: 1, rampMonths: 3,
    demandChangePct: 0, durationMonths: 12, monthlyCostPerHire: 0, oneTimeCostPerHire: 0, overtimeCostPerHour: 0, assumedDepartureReductionPct: 0, baselineMonthlyTurnoverCost: 0,
  };
  if (team) {
    const w = b.dataset.workload.filter((r) => r.team_id === team.teamId).sort((x, y) => y.period.localeCompare(x.period))[0];
    if (team.headcount) { d.headcount = team.headcount; observed.push("headcount"); }
    if (w?.demand_hours != null) { d.baseDemandHours = w.demand_hours; observed.push("baseDemandHours"); }
    if (w?.capacity_hours != null) { d.baseCapacityHours = w.capacity_hours; observed.push("baseCapacityHours"); }
    if (w?.overtime_hours != null) { d.baseOvertimeHours = w.overtime_hours; observed.push("baseOvertimeHours"); }
    if (w?.capacity_hours && team.headcount) { d.hoursPerHire = Math.round(w.capacity_hours / team.headcount); observed.push("hoursPerHire"); }
    const names = new Map(b.data.dataset.teams.map((t) => [t.id, t.name]));
    const c = (await loadCosts(ctx, names)).find((x) => x.team_id === team.teamId);
    if (c) { d.baselineMonthlyTurnoverCost = Math.round(c.breakdown.total); observed.push("baselineMonthlyTurnoverCost"); }
  }

  const { data: scs } = await ctx.supabase.from("workforce_scenarios").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).limit(30);
  const tn = new Map(b.data.dataset.teams.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader title="Workforce Simulator" subtitle="Explore staffing what-ifs with transparent, deterministic calculations. Assumptions are separated from observed data." />
      <form method="get" className="no-print mb-5 flex flex-wrap items-end gap-3">
        <div><label className="label" htmlFor="sim-team">Start from a team&apos;s observed data</label>
          <select id="sim-team" name="team" defaultValue={teamId ?? ""} className="input min-w-[12rem]"><option value="">Illustrative defaults (no team)</option>{shown.map((t) => <option key={t.teamId} value={t.teamId}>{t.teamName}</option>)}</select></div>
        <button className="btn-secondary">Load</button>
      </form>
      {!team && <p className="mb-4 rounded-md border border-signal-watch/40 bg-signal-watch/10 p-3 text-sm text-signal-watch">No team selected: the starting values are illustrative placeholders, not your data. Select a team to prefill observed values, then adjust the assumptions.</p>}
      <SimulatorClient key={teamId ?? "none"} defaults={d} observed={observed} teams={shown.map((t) => ({ id: t.teamId, name: t.teamName }))} teamId={teamId} />

      <section className="mt-10">
        <h2 className="mb-2 text-2xl text-plum-900">Saved scenarios</h2>
        {(scs ?? []).length === 0 ? <EmptyState title="No saved scenarios" body="Save a base case and one or more alternatives to compare them here." /> : (
          <div className="overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
            <table className="min-w-full text-sm">
              <thead className="border-b border-ivory-300"><tr><th className="th">Scenario</th><th className="th">Team</th><th className="th">Hires</th><th className="th">Avg demand/capacity</th><th className="th">Overtime reduction (h)</th><th className="th">Hiring cost</th><th className="th">Actions</th></tr></thead>
              <tbody className="divide-y divide-ivory-300">
                {(scs ?? []).map((s: any) => (
                  <tr key={s.id}>
                    <td className="td"><strong>{s.name}</strong> {s.is_base && <Chip tone="info">base case</Chip>}{s.explanation && <details className="mt-1 text-xs text-charcoal-600"><summary className="cursor-pointer">AI explanation</summary><pre className="whitespace-pre-wrap font-sans">{s.explanation}</pre></details>}</td>
                    <td className="td">{tn.get(s.team_id) ?? "—"}</td>
                    <td className="td">{s.result?.inputs?.additionalHires ?? "—"}</td>
                    <td className="td">{s.result?.avgUtilization?.toFixed?.(2) ?? "—"} <span className="text-xs text-charcoal-400">(base {s.result?.baseAvgUtilization?.toFixed?.(2) ?? "—"})</span></td>
                    <td className="td">{Math.round(s.result?.estimatedOvertimeReductionHours ?? 0).toLocaleString()}</td>
                    <td className="td">{Math.round(s.result?.hiringCost ?? 0).toLocaleString()}</td>
                    <td className="td">
                      {canSave && (
                        <div className="flex flex-col gap-2">
                          <ActionForm action={explainScenario} submit="Explain with AI" variant="secondary" className="space-y-1"><input type="hidden" name="id" value={s.id} /></ActionForm>
                          <ConfirmButton action={deleteScenario} fields={{ id: s.id }} label="Delete" confirm="Delete this scenario?" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
