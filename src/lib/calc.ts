/** Transparent, deterministic calculations for turnover cost and the workforce simulator. */

// ---------------------------------------------------------------- turnover cost

export interface CostInputs {
  departures: number;
  recruitment_cost: number; // period total
  onboarding_cost: number; // period total
  training_cost: number; // period total
  temp_staffing_cost: number; // period total
  vacancy_days: number; // average days a role stayed open, per departure
  daily_lost_capacity_cost: number; // cost per vacant day
  manager_hours: number; // period total
  manager_hourly_cost: number;
}

export interface CostBreakdown {
  recruitment: number;
  onboarding: number;
  training: number;
  tempStaffing: number;
  lostCapacity: number;
  managerTime: number;
  total: number;
  perDeparture: number | null;
}

export const COST_FORMULA =
  "total = recruitment + onboarding + training + temporary staffing + (departures x vacancy days x daily lost-capacity cost) + (manager hours x manager hourly cost). Cost per departure = total / departures.";

export function turnoverCost(i: CostInputs): CostBreakdown {
  const lostCapacity = i.departures * i.vacancy_days * i.daily_lost_capacity_cost;
  const managerTime = i.manager_hours * i.manager_hourly_cost;
  const total = i.recruitment_cost + i.onboarding_cost + i.training_cost + i.temp_staffing_cost + lostCapacity + managerTime;
  return {
    recruitment: i.recruitment_cost,
    onboarding: i.onboarding_cost,
    training: i.training_cost,
    tempStaffing: i.temp_staffing_cost,
    lostCapacity,
    managerTime,
    total,
    perDeparture: i.departures > 0 ? total / i.departures : null,
  };
}

/**
 * Illustrative exposure: expected departures x cost per departure.
 * `reductionPct` is a user assumption (0-100), NOT a forecast or guaranteed saving.
 */
export function exposureScenario(costPerDeparture: number, expectedDepartures: number, reductionPct: number) {
  const r = Math.min(100, Math.max(0, reductionPct)) / 100;
  const baseline = costPerDeparture * expectedDepartures;
  const assumed = costPerDeparture * expectedDepartures * (1 - r);
  return { baseline, assumed, illustrativeDifference: baseline - assumed };
}

// ---------------------------------------------------------------- simulator

export interface SimInputs {
  headcount: number;
  baseDemandHours: number; // per month
  baseCapacityHours: number; // per month
  baseOvertimeHours: number; // per month (observed or assumed)
  additionalHires: number;
  hoursPerHire: number; // monthly productive hours per new hire when fully ramped
  startMonth: number; // months from now until new hires start (0 = month 1)
  rampMonths: number; // months to reach full productivity (linear)
  demandChangePct: number; // applied from month 1
  durationMonths: number;
  monthlyCostPerHire: number; // fully-loaded monthly compensation assumption
  oneTimeCostPerHire: number; // recruiting/onboarding assumption
  overtimeCostPerHour: number;
  assumedDepartureReductionPct: number; // user assumption only
  baselineMonthlyTurnoverCost: number; // from turnover cost model or entered
}

export interface SimMonth {
  month: number;
  demand: number;
  capacity: number;
  utilization: number | null;
  gapHours: number;
}

export interface SimResult {
  months: SimMonth[];
  baseMonths: SimMonth[];
  avgUtilization: number | null;
  baseAvgUtilization: number | null;
  estimatedOvertimeReductionHours: number;
  hiringCost: number;
  overtimeCostAvoided: number;
  turnoverExposureBaseline: number;
  turnoverExposureAssumed: number;
}

export const SIM_FORMULAS = [
  "demand(m) = base demand x (1 + demand change %)",
  "capacity(m) = base capacity + hires x hours per hire x ramp(m); ramp(m) = 0 before the start month, then rises linearly to 1 over the ramp months",
  "gap(m) = max(0, demand(m) - capacity(m)); the gap is assumed to be absorbed as overtime",
  "overtime reduction = sum over months of (base gap - scenario gap)",
  "hiring cost = hires x one-time cost + hires x monthly cost x months employed",
  "overtime cost avoided = overtime reduction x overtime cost per hour (an estimate, not a saving guarantee)",
  "turnover exposure (assumed) = baseline monthly turnover cost x duration x (1 - assumed departure reduction %) - the reduction is a user assumption",
];

export function simulate(i: SimInputs): SimResult {
  const demand = i.baseDemandHours * (1 + i.demandChangePct / 100);
  const months: SimMonth[] = [];
  const baseMonths: SimMonth[] = [];
  const dur = Math.max(1, Math.round(i.durationMonths));
  for (let m = 1; m <= dur; m++) {
    const sinceStart = m - 1 - i.startMonth; // months elapsed since start
    const ramp = sinceStart < 0 ? 0 : i.rampMonths <= 0 ? 1 : Math.min(1, (sinceStart + 1) / i.rampMonths);
    const cap = i.baseCapacityHours + i.additionalHires * i.hoursPerHire * ramp;
    months.push({ month: m, demand, capacity: cap, utilization: cap > 0 ? demand / cap : null, gapHours: Math.max(0, demand - cap) });
    baseMonths.push({
      month: m, demand, capacity: i.baseCapacityHours,
      utilization: i.baseCapacityHours > 0 ? demand / i.baseCapacityHours : null,
      gapHours: Math.max(0, demand - i.baseCapacityHours),
    });
  }
  const mean = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const reduction = baseMonths.reduce((a, b, idx) => a + (b.gapHours - months[idx].gapHours), 0);
  const monthsEmployed = months.filter((_, idx) => idx >= i.startMonth).length;
  const hiringCost = i.additionalHires * i.oneTimeCostPerHire + i.additionalHires * i.monthlyCostPerHire * monthsEmployed;
  const exposureBase = i.baselineMonthlyTurnoverCost * dur;
  return {
    months,
    baseMonths,
    avgUtilization: mean(months.map((x) => x.utilization)),
    baseAvgUtilization: mean(baseMonths.map((x) => x.utilization)),
    estimatedOvertimeReductionHours: reduction,
    hiringCost,
    overtimeCostAvoided: reduction * i.overtimeCostPerHour,
    turnoverExposureBaseline: exposureBase,
    turnoverExposureAssumed: exposureBase * (1 - Math.min(100, Math.max(0, i.assumedDepartureReductionPct)) / 100),
  };
}
