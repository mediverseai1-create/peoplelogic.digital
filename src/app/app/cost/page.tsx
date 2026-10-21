import { deleteCostModel, saveCostModel } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/ActionForm";
import { Chart } from "@/components/Charts";
import { Chip, EmptyState, PageHeader, money, monthLabel } from "@/components/ui";
import { getBundle, loadCosts } from "@/lib/bundle";
import { COST_FORMULA, exposureScenario } from "@/lib/calc";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/roles";

export const metadata = { title: "Turnover Cost" };

const FIELDS: [string, string][] = [
  ["departures", "Departures"], ["recruitment_cost", "Recruitment cost (period total)"], ["onboarding_cost", "Onboarding cost (period total)"],
  ["training_cost", "Training cost (period total)"], ["temp_staffing_cost", "Temporary staffing (period total)"], ["vacancy_days", "Avg vacancy days per departure"],
  ["daily_lost_capacity_cost", "Lost-capacity cost per vacant day"], ["manager_hours", "Manager hours (period total)"], ["manager_hourly_cost", "Manager hourly cost"],
];

export default async function Cost({ searchParams }: { searchParams: Promise<{ reduction?: string }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const b = await getBundle(ctx);
  const names = new Map(b.data.dataset.teams.map((t) => [t.id, t.name]));
  const shown = new Set(b.scoped.shown.map((t) => t.teamName));
  const all = await loadCosts(ctx, names);
  const rows = all.filter((c) => c.teamName === "Organization" || shown.has(c.teamName));
  const canEdit = can(ctx.role, "edit_cost_models");
  const reduction = Math.min(100, Math.max(0, Number(sp.reduction ?? 10) || 0));

  const byTeam = new Map<string, { total: number; dep: number }>();
  for (const c of rows) { const x = byTeam.get(c.teamName) ?? { total: 0, dep: 0 }; x.total += c.breakdown.total; x.dep += c.departures; byTeam.set(c.teamName, x); }
  const byPeriod = new Map<string, number>();
  for (const c of rows) byPeriod.set(c.period, (byPeriod.get(c.period) ?? 0) + c.breakdown.total);
  const trend = [...byPeriod].sort().map(([p, v]) => ({ period: monthLabel(p), "Estimated cost": Math.round(v) }));
  const exposureTeams = [...byTeam].filter(([, v]) => v.dep > 0).map(([team, v]) => ({ team, ...exposureScenario(v.total / v.dep, v.dep, reduction) }));

  return (
    <>
      <PageHeader title="Turnover Cost" subtitle="Estimated cost of replacing departures, by team. Every figure is labelled as imported, user-entered or estimated." />
      <div className="mb-5 rounded-md border border-ivory-300 bg-ivory-100/70 p-3 text-xs text-charcoal-600"><strong>Formula:</strong> {COST_FORMULA} Currency is whatever unit you enter consistently.</div>

      {rows.length === 0 ? <EmptyState title="No cost models yet" body="Enter cost assumptions below or import a recruitment and replacement cost file." href="/app/data" cta="Import cost data" /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Chart title="Estimated cost by period" data={trend} xKey="period" series={[{ key: "Estimated cost", label: "Estimated cost" }]} kind="bar" />
            <Chart title="Cost comparison by team (all periods)" data={[...byTeam].map(([team, v]) => ({ team, Total: Math.round(v.total) }))} xKey="team" series={[{ key: "Total", label: "Total" }]} kind="bar" />
          </div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
            <table className="min-w-full text-sm">
              <thead className="border-b border-ivory-300"><tr><th className="th">Team</th><th className="th">Period</th><th className="th">Departures</th><th className="th">Direct costs</th><th className="th">Lost capacity</th><th className="th">Manager time</th><th className="th">Total</th><th className="th">Per departure</th><th className="th">Source</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-ivory-300">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="td">{c.teamName}</td><td className="td">{monthLabel(c.period)}</td><td className="td">{c.departures}</td>
                    <td className="td">{money(c.breakdown.recruitment + c.breakdown.onboarding + c.breakdown.training + c.breakdown.tempStaffing)}</td>
                    <td className="td">{money(c.breakdown.lostCapacity)}</td><td className="td">{money(c.breakdown.managerTime)}</td>
                    <td className="td font-medium">{money(c.breakdown.total)}</td><td className="td">{money(c.breakdown.perDeparture)}</td>
                    <td className="td"><Chip tone={c.provenance === "imported" ? "info" : "neutral"}>{c.provenance.replace("_", "-")}</Chip></td>
                    <td className="td">{canEdit && <ConfirmButton action={deleteCostModel} fields={{ id: c.id }} label="Delete" confirm="Delete this cost model row?" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="mt-8">
            <h2 className="text-2xl text-plum-900">Illustrative savings scenario</h2>
            <form method="get" className="no-print mt-2 flex items-end gap-3">
              <div><label className="label" htmlFor="red">Assumed reduction in departures (%)</label><input id="red" name="reduction" type="number" min={0} max={100} defaultValue={reduction} className="input w-32" /></div>
              <button className="btn-secondary">Recalculate</button>
            </form>
            <p className="mt-2 text-xs text-charcoal-400">Assuming the same number of departures as recorded, cost per departure unchanged, and a {reduction}% reduction (your assumption). This is an illustration, not a forecast or guaranteed saving.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {exposureTeams.map((e) => <li key={e.team}><strong>{e.team}:</strong> exposure {money(e.baseline)} → {money(e.assumed)} (illustrative difference {money(e.illustrativeDifference)})</li>)}
            </ul>
          </section>
        </>
      )}

      {canEdit && (
        <section className="card mt-8">
          <h2 className="text-xl text-plum-900">Add or update a cost model (user-entered)</h2>
          <ActionForm action={saveCostModel} submit="Save cost model" className="mt-3 grid gap-3 md:grid-cols-3">
            <div><label className="label" htmlFor="c-team">Team</label><select id="c-team" name="team_id" className="input"><option value="">Organization-wide</option>{b.data.dataset.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className="label" htmlFor="c-period">Period</label><input id="c-period" name="period" type="month" required className="input" /></div>
            {FIELDS.map(([k, l]) => <div key={k}><label className="label" htmlFor={`c-${k}`}>{l}</label><input id={`c-${k}`} name={k} type="number" min={0} step="any" defaultValue={0} className="input" /></div>)}
          </ActionForm>
        </section>
      )}
    </>
  );
}
