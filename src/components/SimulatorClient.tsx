"use client";

import { useActionState, useMemo, useState } from "react";
import { saveScenario, type State } from "@/app/actions";
import { SIM_FORMULAS, simulate, type SimInputs } from "@/lib/calc";
import { Chart } from "./Charts";
import { Chip, Flash } from "./ui";

type Field = { key: keyof SimInputs; label: string; hint?: string; step?: number };

const OBSERVABLE: (keyof SimInputs)[] = ["headcount", "baseDemandHours", "baseCapacityHours", "baseOvertimeHours", "hoursPerHire", "baselineMonthlyTurnoverCost"];

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Baseline (from your data where available)", fields: [
    { key: "headcount", label: "Headcount" },
    { key: "baseDemandHours", label: "Monthly demand (hours)" },
    { key: "baseCapacityHours", label: "Monthly capacity (hours)" },
    { key: "baseOvertimeHours", label: "Monthly overtime (hours)" },
    { key: "baselineMonthlyTurnoverCost", label: "Baseline monthly turnover cost", hint: "From the Turnover Cost module or your estimate" },
  ] },
  { title: "Hiring assumptions", fields: [
    { key: "additionalHires", label: "Additional hires" },
    { key: "hoursPerHire", label: "Productive hours per hire / month", hint: "Defaults to capacity ÷ headcount" },
    { key: "startMonth", label: "Start delay (months)", hint: "0 = starts in month 1" },
    { key: "rampMonths", label: "Ramp-up (months to full productivity)" },
    { key: "monthlyCostPerHire", label: "Monthly cost per hire", hint: "Fully loaded compensation assumption" },
    { key: "oneTimeCostPerHire", label: "One-time hiring cost per hire" },
  ] },
  { title: "Scenario assumptions", fields: [
    { key: "demandChangePct", label: "Expected demand change (%)" },
    { key: "durationMonths", label: "Scenario duration (months)" },
    { key: "overtimeCostPerHour", label: "Overtime cost per hour" },
    { key: "assumedDepartureReductionPct", label: "Assumed reduction in departures (%)", hint: "A user assumption only, not a forecast" },
  ] },
];

export function SimulatorClient({ defaults, observed, teams, teamId }: { defaults: SimInputs; observed: (keyof SimInputs)[]; teams: { id: string; name: string }[]; teamId: string | null }) {
  const [v, setV] = useState<SimInputs>(defaults);
  const [name, setName] = useState("");
  const [isBase, setIsBase] = useState(false);
  const [state, action, pending] = useActionState(saveScenario as (p: State, f: FormData) => Promise<State>, {} as State);
  const r = useMemo(() => simulate(v), [v]);
  const provenance: Record<string, string> = {};
  for (const k of OBSERVABLE) provenance[k] = observed.includes(k) ? "observed" : "user_entered";

  const chart = r.months.map((m, i) => ({ month: `M${m.month}`, "Base case": r.baseMonths[i].utilization == null ? null : Number(r.baseMonths[i].utilization!.toFixed(3)), Scenario: m.utilization == null ? null : Number(m.utilization.toFixed(3)) }));
  const f2 = (x: number | null) => (x == null ? "—" : x.toFixed(2));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-2">
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="card">
            <legend className="px-1 text-sm font-medium text-plum-900">{g.title}</legend>
            <div className="mt-2 space-y-3">
              {g.fields.map((f) => (
                <div key={f.key}>
                  <label className="label flex items-center justify-between" htmlFor={`sim-${f.key}`}>
                    <span>{f.label}</span>
                    {OBSERVABLE.includes(f.key) && <Chip tone={observed.includes(f.key) ? "info" : "neutral"}>{observed.includes(f.key) ? "observed" : "assumption"}</Chip>}
                  </label>
                  <input id={`sim-${f.key}`} type="number" min={0} step="any" className="input" value={Number.isFinite(v[f.key]) ? v[f.key] : 0} onChange={(e) => setV({ ...v, [f.key]: e.target.value === "" ? 0 : Number(e.target.value) })} />
                  {f.hint && <p className="mt-0.5 text-xs text-charcoal-400">{f.hint}</p>}
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="space-y-5 lg:col-span-3">
        <div className="card">
          <h3 className="text-lg text-plum-900">Results (base case vs scenario)</h3>
          <table className="mt-2 w-full text-sm">
            <thead><tr><th className="th">Measure</th><th className="th">Base case</th><th className="th">Scenario</th></tr></thead>
            <tbody className="divide-y divide-ivory-300">
              <tr><td className="td">Average demand / capacity</td><td className="td">{f2(r.baseAvgUtilization)}</td><td className="td">{f2(r.avgUtilization)}</td></tr>
              <tr><td className="td">Total gap absorbed as overtime (hours)</td><td className="td">{Math.round(r.baseMonths.reduce((a, m) => a + m.gapHours, 0)).toLocaleString()}</td><td className="td">{Math.round(r.months.reduce((a, m) => a + m.gapHours, 0)).toLocaleString()}</td></tr>
              <tr><td className="td">Estimated overtime reduction (hours)</td><td className="td">—</td><td className="td">{Math.round(r.estimatedOvertimeReductionHours).toLocaleString()}</td></tr>
              <tr><td className="td">Estimated hiring cost</td><td className="td">—</td><td className="td">{Math.round(r.hiringCost).toLocaleString()}</td></tr>
              <tr><td className="td">Overtime cost avoided (estimate)</td><td className="td">—</td><td className="td">{Math.round(r.overtimeCostAvoided).toLocaleString()}</td></tr>
              <tr><td className="td">Turnover-cost exposure over duration</td><td className="td">{Math.round(r.turnoverExposureBaseline).toLocaleString()}</td><td className="td">{Math.round(r.turnoverExposureAssumed).toLocaleString()} <span className="text-xs text-charcoal-400">(assumption-driven)</span></td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-charcoal-400">Scenarios are illustrations based on the assumptions shown. They are not forecasts or guaranteed outcomes.</p>
        </div>

        <Chart title="Demand / capacity by month" data={chart} xKey="month" series={[{ key: "Base case", label: "Base case" }, { key: "Scenario", label: "Scenario" }]} note="Above 1.0 means demand exceeds capacity." />

        <details className="card text-sm">
          <summary className="cursor-pointer font-medium text-plum-900">Model logic and formulas</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-charcoal-600">{SIM_FORMULAS.map((f) => <li key={f}>{f}</li>)}</ul>
          <p className="mt-2 text-xs text-charcoal-400">Limitations: capacity is a simple hours model; it ignores skills mix, attrition during the scenario, hiring lead-time variance and demand seasonality.</p>
        </details>

        <form action={action} className="card space-y-3">
          <h3 className="text-lg text-plum-900">Save this scenario</h3>
          {Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={Number.isFinite(val) ? val : 0} />)}
          <input type="hidden" name="team_id" value={teamId ?? ""} />
          <input type="hidden" name="provenance" value={JSON.stringify(provenance)} />
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label" htmlFor="sc-name">Scenario name</label><input id="sc-name" name="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Hire two for Support" /></div>
            <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_base" checked={isBase} onChange={(e) => setIsBase(e.target.checked)} /> Mark as base case</label>
          </div>
          <p className="text-xs text-charcoal-400">Scope: {teamId ? teams.find((t) => t.id === teamId)?.name : "no specific team"}.</p>
          {state.error && <Flash kind="error">{state.error}</Flash>}
          {state.ok && <Flash kind="ok">{state.ok}</Flash>}
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save scenario"}</button>
        </form>
      </div>
    </div>
  );
}
