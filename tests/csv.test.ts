import { describe, expect, it } from "vitest";
import { autoMap, DATASETS, normalizePeriod, parseCsv, sensitiveHeaders, templateCsv, validateRows } from "@/lib/csv";

describe("normalizePeriod", () => {
  it("normalizes common formats to first-of-month ISO dates", () => {
    expect(normalizePeriod("2025-03-17")).toBe("2025-03-01");
    expect(normalizePeriod("2025-3")).toBe("2025-03-01");
    expect(normalizePeriod("03/15/2025")).toBe("2025-03-01");
    expect(normalizePeriod("3/2025")).toBe("2025-03-01");
  });
  it("rejects invalid dates", () => {
    expect(normalizePeriod("2025-13-01")).toBeNull();
    expect(normalizePeriod("yesterday")).toBeNull();
    expect(normalizePeriod("")).toBeNull();
    expect(normalizePeriod("1850-01-01")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("parses headers and rows and strips a BOM", () => {
    const r = parseCsv("﻿team,period,headcount\nSupport,2025-01-01,12\n");
    expect(r.error).toBeUndefined();
    expect(r.headers).toEqual(["team", "period", "headcount"]);
    expect(r.rows).toHaveLength(1);
  });
  it("rejects duplicate headers and oversized files", () => {
    expect(parseCsv("a,a\n1,2").error).toMatch(/Duplicate/);
    expect(parseCsv("x".repeat(5 * 1024 * 1024 + 1)).error).toMatch(/5 MB/);
  });
});

describe("validateRows", () => {
  const mapping = { team: "team", period: "period", headcount: "headcount" };
  it("requires mapped required fields", () => {
    const r = validateRows("headcount", [], { team: "team" });
    expect(r.issues.some((i) => i.field === "period")).toBe(true);
    expect(r.valid).toHaveLength(0);
  });
  it("accepts valid rows and reports invalid ones with row numbers", () => {
    const rows = [
      { team: "Support", period: "2025-01-01", headcount: "12" },
      { team: "Support", period: "not-a-date", headcount: "12" },
      { team: "Sales", period: "2025-01-01", headcount: "-4" },
      { team: "Ops", period: "2025-01-01", headcount: "abc" },
      { team: "", period: "2025-01-01", headcount: "3" },
    ];
    const r = validateRows("headcount", rows, mapping);
    expect(r.valid).toHaveLength(1);
    const badRows = new Set(r.issues.map((i) => i.row));
    expect([...badRows].sort()).toEqual([2, 3, 4, 5]);
  });
  it("detects duplicate team+period and keeps the first", () => {
    const rows = [
      { team: "Support", period: "2025-01-01", headcount: "12" },
      { team: "support", period: "2025-01-15", headcount: "99" },
    ];
    const r = validateRows("headcount", rows, mapping);
    expect(r.duplicates).toBe(1);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].values.headcount).toBe(12);
  });
  it("rejects inconsistent voluntary/involuntary totals", () => {
    const r = validateRows("turnover", [{ team: "A", period: "2025-01-01", departures: "2", voluntary: "2", involuntary: "1" }], { team: "team", period: "period", departures: "departures", voluntary: "voluntary", involuntary: "involuntary" });
    expect(r.valid).toHaveLength(0);
    expect(r.issues[0].message).toMatch(/exceeds/);
  });
  it("validates survey scores and redacts PII in comments", () => {
    const m = { team: "team", period: "period", score: "score", comment: "comment", theme: "theme" };
    const r = validateRows("survey", [
      { team: "A", period: "2025-01-01", score: "4", comment: "Email me at jane@corp.com or call +1 555 123 4567", theme: "Workload" },
      { team: "A", period: "2025-01-01", score: "9", comment: "", theme: "" },
    ], m);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].values.comment).not.toMatch(/jane@corp\.com/);
    expect(r.valid[0].values.comment).toContain("[email]");
    expect(r.valid[0].values.theme).toBe("workload");
    expect(r.issues).toHaveLength(1);
  });
});

describe("sensitive headers and templates", () => {
  it("flags personal identifier columns but not team name", () => {
    expect(sensitiveHeaders(["team", "Employee ID", "email", "Team Name", "phone number"]).sort()).toEqual(["Employee ID", "email", "phone number"].sort());
  });
  it("every template parses and auto-maps all fields", () => {
    for (const t of Object.keys(DATASETS) as (keyof typeof DATASETS)[]) {
      const p = parseCsv(templateCsv(t));
      expect(p.error).toBeUndefined();
      const m = autoMap(DATASETS[t], p.headers);
      expect(Object.keys(m).length).toBe(DATASETS[t].fields.length);
      expect(validateRows(t, p.rows, m).issues).toEqual([]);
    }
  });
});
