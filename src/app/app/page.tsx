import Link from "next/link";
import { Chart } from "@/components/Charts";
import { FilterBar } from "@/components/FilterBar";
import { DataNotice, EmptyState, LevelChip, PageHeader, Stat, monthLabel, money, num, pct } from "@/components/ui";
import { annualTurnover, draftRecommendations, orgTrend, type Level } from "@/lib/analytics";
import { getBundle, loadCosts, type Filters } from "@/lib/bundle";
import { requireContext } from "@/lib/context";
import { suppressionNotice } from "@/lib/scope";

export const metadata = { title: "Workforce Overview" };

export default async function Overview({ searchParams }: { searchParams: Promise<Filters> }) {
  const ctx = await requireContext();
  const b = await getBundle(ctx, await searchParams);
  const teamsAll = b.data.dataset.teams;

  if (!b.hasData) {
    return (
      <>
        <PageHeader title="Workforce Overview" subtitle="Executive summary of your workforce, built only from the data you import." />
        <EmptyState title="No workforce data yet" body="Upload headcount, departures, staffing or workload data to see headcount, turnover, capacity and risk indicators. Nothing on this page is shown until it can be calculated from your data." href="/app/data" cta="Import data" />
      </>
    );
  }

  const trend = orgTrend(b.dataset);
  const annual = annualTurnover(trend);
  const last = trend.at(-1);
  const prev = trend.at(-2);
  const vol = b.dataset.turnover.reduce((a, r) => a + (r.voluntary ?? 0), 0);
  const invol = b.dataset.turnover.reduce((a, r) => a + (r.involuntary ?? 0), 0);
  const known = b.dataset.turnover.filter((r) => r.voluntary != null || r.involuntary != null).length;
  const levels = b.scoped.shown.reduce<Record<Level, number>>((a, t) => ({ ...a, [t.level]: a[t.level] + 1 }), { no_signal: 0, watch: 0, elevated: 0, insufficient_data: 0 });
  const names = new Map(teamsAll.map((t) => [t.id, t.name]));
  const costs = await loadCosts(ctx, names);
  const shownNames = new Set(b.scoped.shown.map((t) => t.teamName));
  const costTotal = costs.filter((c) => shownNames.has(c.teamName)).reduce((a, c) => a + c.breakdown.total, 0);
  const openPositions = b.scoped.shown.reduce((a, t) => a + (t.vacancyRate != null ? 1 : 0), 0);
  const openTotal = (() => {
    const latest = new Map<string, { period: string; open: number }>();
    for (const r of b.dataset.staffing) { const c = latest.get(r.team_id); if (!c || r.period > c.period) latest.set(r.team_id, { period: r.period, open: r.open_positions }); }
    return [...latest.values()].reduce((a, r) => a + r.open, 0);
  })();
  const loadBars = b.scoped.shown.filter((t) => t.utilization != null).map((t) => ({ team: t.teamName, "Demand / capacity": Number(t.utilization!.toFixed(2)) }));
  const deptMap = new Map<string, { dep: number; hc: number }>();
  for (const t of b.scoped.shown) {
    const k = t.department ?? "Unassigned";
    const c = deptMap.get(k) ?? { dep: 0, hc: 0 };
    c.dep += t.recentDepartures ?? 0; c.hc += t.headcount ?? 0;
    deptMap.set(k, c);
  }
  const deptBars = [...deptMap].filter(([, v]) => v.hc > 0).map(([department, v]) => ({ department, "Recent turnover": v.dep / v.hc }));
  const engByPeriod = new Map<string, { s: number; n: number }>();
  for (const e of b.dataset.engagement) { if (e.responses < b.threshold) continue; const c = engByPeriod.get(e.period) ?? { s: 0, n: 0 }; c.s += e.avg_score * e.responses; c.n += e.responses; engByPeriod.set(e.period, c); }
  const eng = [...engByPeriod].sort().map(([period, v]) => ({ period: monthLabel(period), "Average score": Number((v.s / v.n).toFixed(2)) }));
  const recs = draftRecommendations(b.scoped.shown).filter((r) => r.priority === "high").slice(0, 5);
  const covered = Object.entries(b.data.sourceCoverage).filter(([, v]) => v).map(([k]) => k).join(", ") || "none";
  const notice = suppressionNotice(b.scoped);

  return (
    <>
      <PageHeader title="Workforce Overview" subtitle="Team-level workforce intelligence calculated from your imported data." />
      <FilterBar teams={teamsAll} team={b.filters.teamId} from={b.filters.from} to={b.filters.to} />
      <DataNotice period={`${monthLabel(b.data.periods.first)} to ${monthLabel(b.data.periods.last)}`} coverage={covered} updated={b.data.lastUpdated} sample={`${teamsAll.length} teams, ${trend.length} months`} />
      {notice && <p className="mb-4 text-xs text-charcoal-600">{notice}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Headcount" value={num(last?.headcount)} hint={prev ? `${last!.headcount - prev.headcount >= 0 ? "+" : ""}${last!.headcount - prev.headcount} vs ${monthLabel(prev.period)}` : monthLabel(last?.period)} />
        <Stat label="Turnover (trailing)" value={pct(annual.rate)} hint={`${annual.months} month(s) of data${annual.months < 12 ? " - less than a full year" : ""}`} />
        <Stat label="Voluntary / involuntary" value={known ? `${vol} / ${invol}` : "—"} hint={known ? "Where recorded" : "Not reliably available in imported data"} />
        <Stat label="Open positions" value={b.data.sourceCoverage.staffing ? num(openTotal) : "—"} hint={b.data.sourceCoverage.staffing ? "Latest period per team" : "Import staffing data"} />
        <Stat label="Elevated teams" value={levels.elevated} hint={`${levels.watch} on watch of ${b.scoped.shown.length} reportable`} />
        <Stat label="Est. turnover cost" value={costs.length ? money(costTotal) : "—"} hint={costs.length ? "Sum of entered/imported cost models" : "Add a cost model"} />
        <Stat label="Turnover change" value={last?.turnoverRate != null && prev?.turnoverRate != null ? `${((last.turnoverRate - prev.turnoverRate) * 100).toFixed(1)} pts` : "—"} hint="Latest month vs previous month" />
        <Stat label="Teams with overstretched capacity" value={b.scoped.shown.filter((t) => (t.utilization ?? 0) > 1).length} hint="Demand above capacity (latest period)" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Chart title="Historical turnover rate (monthly)" data={trend.map((p) => ({ period: monthLabel(p.period), "Turnover rate": p.turnoverRate }))} xKey="period" series={[{ key: "Turnover rate", label: "Turnover rate" }]} format="pct" note="Departures divided by headcount for each month." />
        <Chart title="Headcount and departures" kind="bar" data={trend.map((p) => ({ period: monthLabel(p.period), Headcount: p.headcount, Departures: p.departures }))} xKey="period" series={[{ key: "Headcount", label: "Headcount" }, { key: "Departures", label: "Departures" }]} />
        {loadBars.length > 0 ? <Chart title="Workload versus capacity by team (latest period)" kind="bar" data={loadBars} xKey="team" series={[{ key: "Demand / capacity", label: "Demand / capacity" }]} note="Values above 1.0 mean recorded demand exceeds recorded capacity." /> : <EmptyState title="Workload versus capacity" body="Import workload data (demand and capacity hours) to compare them by team." href="/app/data" cta="Import workload data" />}
        {eng.length > 0 ? <Chart title="Engagement trend (survey average, 1-5)" data={eng} xKey="period" series={[{ key: "Average score", label: "Average score" }]} note="Only groups meeting the minimum group size are included." /> : <EmptyState title="Engagement trend" body="Import a survey export to see engagement trends. Small groups are suppressed automatically." href="/app/data" cta="Import survey data" />}
        {deptBars.length > 0 && <Chart title="Department comparison: recent turnover" kind="bar" data={deptBars} xKey="department" series={[{ key: "Recent turnover", label: "Recent turnover" }]} format="pct" note="Departures in the last 3 months divided by headcount, for reportable teams." />}
        <div className="card">
          <h3 className="text-sm font-medium text-plum-900">Team-level risk distribution</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(["elevated", "watch", "no_signal", "insufficient_data"] as Level[]).map((l) => (
              <li key={l} className="flex items-center justify-between"><LevelChip level={l} /><span className="font-display text-xl">{levels[l]}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-charcoal-400">Descriptive indicators, not predicted probabilities. <Link className="underline" href="/app/attrition">See the evidence</Link>.</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xl text-plum-900">Intervention priorities to consider</h2>
        {recs.length ? (
          <ul className="space-y-2">
            {recs.map((r, i) => <li key={i} className="card text-sm"><strong>{r.teamName}:</strong> {r.recommendation}<div className="mt-1 text-xs text-charcoal-400">Evidence: {r.evidence}</div></li>)}
          </ul>
        ) : <p className="text-sm text-charcoal-600">No high-priority indicators in the current data. {openPositions ? "" : "More data sources would allow a fuller view."}</p>}
        <p className="mt-2 text-xs text-charcoal-400">Suggestions are for human review. They are not conclusions about causes or about any individual.</p>
      </section>
    </>
  );
}
