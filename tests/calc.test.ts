import { describe, expect, it } from "vitest";
import { exposureScenario, simulate, turnoverCost, type SimInputs } from "@/lib/calc";

describe("turnoverCost", () => {
  it("sums components with the documented formula", () => {
    const r = turnoverCost({ departures: 4, recruitment_cost: 1000, onboarding_cost: 500, training_cost: 300, temp_staffing_cost: 200, vacancy_days: 30, daily_lost_capacity_cost: 100, manager_hours: 20, manager_hourly_cost: 50 });
    expect(r.lostCapacity).toBe(12000);
    expect(r.managerTime).toBe(1000);
    expect(r.total).toBe(1000 + 500 + 300 + 200 + 12000 + 1000);
    expect(r.perDeparture).toBe(r.total / 4);
  });
  it("has no per-departure figure without departures", () => {
    expect(turnoverCost({ departures: 0, recruitment_cost: 10, onboarding_cost: 0, training_cost: 0, temp_staffing_cost: 0, vacancy_days: 0, daily_lost_capacity_cost: 0, manager_hours: 0, manager_hourly_cost: 0 }).perDeparture).toBeNull();
  });
});

describe("exposureScenario", () => {
  it("clamps the reduction assumption to 0-100%", () => {
    expect(exposureScenario(1000, 5, 150).assumed).toBe(0);
    expect(exposureScenario(1000, 5, -10).assumed).toBe(5000);
    expect(exposureScenario(1000, 5, 20).illustrativeDifference).toBe(1000);
  });
});

const input: SimInputs = {
  headcount: 10, baseDemandHours: 1800, baseCapacityHours: 1500, baseOvertimeHours: 300, additionalHires: 2, hoursPerHire: 150, startMonth: 1, rampMonths: 2,
  demandChangePct: 0, durationMonths: 6, monthlyCostPerHire: 5000, oneTimeCostPerHire: 2000, overtimeCostPerHour: 40, assumedDepartureReductionPct: 0, baselineMonthlyTurnoverCost: 1000,
};

describe("simulate", () => {
  it("starts adding capacity only after the start delay and ramps linearly", () => {
    const r = simulate(input);
    expect(r.months[0].capacity).toBe(1500); // month 1: before start
    expect(r.months[1].capacity).toBe(1500 + 2 * 150 * 0.5); // month 2: ramp 1/2
    expect(r.months[2].capacity).toBe(1500 + 2 * 150); // month 3: full
  });
  it("base case is unchanged by hires and reduces the gap when hires add capacity", () => {
    const r = simulate(input);
    expect(r.baseMonths.every((m) => m.capacity === 1500)).toBe(true);
    expect(r.estimatedOvertimeReductionHours).toBeGreaterThan(0);
    expect(r.months[5].gapHours).toBe(0);
  });
  it("costs hires for months employed only", () => {
    const r = simulate(input);
    expect(r.hiringCost).toBe(2 * 2000 + 2 * 5000 * 5);
  });
  it("zero hires equals the base case and zero savings", () => {
    const r = simulate({ ...input, additionalHires: 0 });
    expect(r.estimatedOvertimeReductionHours).toBe(0);
    expect(r.avgUtilization).toBe(r.baseAvgUtilization);
  });
  it("turnover exposure reduction is purely the user's assumption", () => {
    const r = simulate({ ...input, assumedDepartureReductionPct: 25 });
    expect(r.turnoverExposureBaseline).toBe(6000);
    expect(r.turnoverExposureAssumed).toBe(4500);
  });
});
