import { FilterBar } from "@/components/FilterBar";
import { Chart } from "@/components/Charts";
import { Chip, DataNotice, EmptyState, PageHeader, monthLabel, num, pct } from "@/components/ui";
import { getBundle, type Filters } from "@/lib/bundle";
import { requireContext } from "@/lib/context";
import { suppressionNotice } from "@/lib/scope";
import Link from "next/link";

export const metadata = { title: "Workload & Capacity" };

export default async function Workload({ searchParams }: { searchParams: Promise<Filters> }) {
  const ctx = await requireContext();
  const b = await getBundle(ctx, await searchParams);
  const okIds = new Set(b.scoped.shown.map((t) => t.teamId));
  const rows = b.dataset.workload.filter((r) => okIds.has(r.team_id));
  const teamsWith = b.scoped.shown.filter((t) => t.utilization != null);
  const series = [...new Set(rows.map((r) => r.period))].sort().map((p) => {
    const rs = rows.filter((r) => r.period === p);
    const d = rs.reduce((a, r) => a + (r.demand_hours ?? 0), 0);
    const c = rs.reduce((a, r) => a + (r.capacity_hours ?? 0), 0);
    return { period: monthLabel(p), Demand: d, Capacity: c, Overtime: rs.reduce((a, r) => a + (r.overtime_hours ?? 0), 0) };
  });
  const notice = suppressionNotice(b.scoped);

  return (
    <>
      <PageHeader title="Workload & Capacity" subtitle="Where recorded demand may exceed sustainable capacity, and what kind of response might fit. Team-level only; individuals are never ranked." />
      {!b.data.sourceCoverage.workload ? (
        <EmptyState title="No workload data" body="Import demand hours, capacity hours, overtime and backlog per team per month to see staffing pressure." href="/app/data" cta="Import workload data" />
      ) : (
        <>
          <FilterBar teams={b.data.dataset.teams} team={b.filters.teamId} from={b.filters.from} to={b.filters.to} />
          <DataNotice period={`${monthLabel(b.data.periods.first)} to ${monthLabel(b.data.periods.last)}`} updated={b.data.lastUpdated} sample={`${teamsWith.length} teams with workload data`} limitations="Demand figures are as supplied (task counts or hours). Task volume alone does not establish productivity or individual workload. Ratios are estimates." />
          {notice && <p className="mb-4 text-xs text-charcoal-600">{notice}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <Chart title="Demand versus capacity (hours, all reportable teams)" data={series} xKey="period" series={[{ key: "Demand", label: "Demand" }, { key: "Capacity", label: "Capacity" }, { key: "Overtime", label: "Overtime" }]} />
            <Chart title="Demand / capacity by team (latest period)" kind="bar" data={teamsWith.map((t) => ({ team: t.teamName, Ratio: Number(t.utilization!.toFixed(2)) }))} xKey="team" series={[{ key: "Ratio", label: "Demand / capacity" }]} />
          </div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-ivory-300 bg-white/70">
            <table className="min-w-full text-sm">
              <thead className="border-b border-ivory-300"><tr><th className="th">Team</th><th className="th">Demand/capacity</th><th className="th">Overtime share</th><th className="th">Backlog change</th><th className="th">Vacancy</th><th className="th">Where to look</th></tr></thead>
              <tbody className="divide-y divide-ivory-300">
                {teamsWith.map((t) => {
                  const pressure = (t.utilization ?? 0) > 1;
                  const vac = (t.vacancyRate ?? 0) > 0.1;
                  const hint = pressure && vac ? "Open roles may be adding pressure: review requisition status and interim coverage." : pressure && (t.backlogChangePct ?? 0) > 0.2 ? "Persistent demand growth: compare hiring against prioritization and process change." : pressure ? "Demand above capacity: investigate whether redistribution or prioritization could help before adding headcount." : "No pressure indicated by recorded data.";
                  return (
                    <tr key={t.teamId}>
                      <td className="td font-medium">{t.teamName}</td>
                      <td className="td">{t.utilization?.toFixed(2)} {pressure && <Chip tone="warn">above 1.0</Chip>}</td>
                      <td className="td">{pct(t.overtimeRatio)}</td>
                      <td className="td">{pct(t.backlogChangePct, 0)}</td>
                      <td className="td">{pct(t.vacancyRate, 0)}</td>
                      <td className="td text-charcoal-600">{hint}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-charcoal-600">Test the effect of added capacity in the <Link className="underline" href="/app/simulator">Workforce Simulator</Link>, and track chosen actions in <Link className="underline" href="/app/managers">Manager Insights</Link>. Total reportable teams: {num(b.scoped.shown.length)}.</p>
        </>
      )}
    </>
  );
}
