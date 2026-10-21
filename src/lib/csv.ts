import Papa from "papaparse";
import { z } from "zod";
import { redactPII } from "./privacy";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 20000;

export const DATASET_TYPES = ["headcount", "turnover", "staffing", "workload", "survey", "replacement_costs"] as const;
export type DatasetType = (typeof DATASET_TYPES)[number];

export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  hint: string;
}
export interface DatasetSpec {
  type: DatasetType;
  label: string;
  description: string;
  privacy: string;
  fields: FieldSpec[];
}

const base: FieldSpec[] = [
  { key: "team", label: "Team", required: true, hint: "Team name (created automatically if new)" },
  { key: "department", label: "Department", required: false, hint: "Optional parent department" },
  { key: "period", label: "Period", required: true, hint: "Month, e.g. 2025-03-01 (also accepts MM/DD/YYYY or MM/YYYY)" },
];

export const DATASETS: Record<DatasetType, DatasetSpec> = {
  headcount: {
    type: "headcount",
    label: "Aggregated headcount history",
    description: "Headcount per team per month.",
    privacy: "Aggregate counts only. Do not include employee names or IDs.",
    fields: [...base, { key: "headcount", label: "Headcount", required: true, hint: "Whole number" }],
  },
  turnover: {
    type: "turnover",
    label: "Historical departures",
    description: "Number of departures per team per month.",
    privacy: "Aggregate counts only. Do not include names, IDs, or reasons tied to a person.",
    fields: [
      ...base,
      { key: "departures", label: "Departures", required: true, hint: "Whole number" },
      { key: "voluntary", label: "Voluntary", required: false, hint: "Only if reliably recorded" },
      { key: "involuntary", label: "Involuntary", required: false, hint: "Only if reliably recorded" },
    ],
  },
  staffing: {
    type: "staffing",
    label: "Hiring and staffing records",
    description: "Approved vs open positions and hires per team per month.",
    privacy: "Aggregate counts only.",
    fields: [
      ...base,
      { key: "approved_positions", label: "Approved positions", required: true, hint: "Whole number" },
      { key: "open_positions", label: "Open positions", required: false, hint: "Whole number" },
      { key: "hires", label: "Hires", required: false, hint: "Whole number" },
    ],
  },
  workload: {
    type: "workload",
    label: "Workload, overtime and capacity",
    description: "Demand, capacity, overtime hours and backlog per team per month.",
    privacy: "Team-level totals only. Never upload per-employee workload or productivity.",
    fields: [
      ...base,
      { key: "demand_hours", label: "Demand hours", required: false, hint: "Estimated hours of work demand" },
      { key: "capacity_hours", label: "Capacity hours", required: false, hint: "Available working hours" },
      { key: "overtime_hours", label: "Overtime hours", required: false, hint: "Team total" },
      { key: "backlog", label: "Backlog items", required: false, hint: "Open tickets/tasks at period end" },
    ],
  },
  survey: {
    type: "survey",
    label: "Employee survey export",
    description: "Survey responses with team, theme, score and optional comment.",
    privacy:
      "Do NOT include names, emails or respondent IDs. Such columns are never stored and comments are redacted. Small groups are suppressed in outputs.",
    fields: [
      ...base,
      { key: "survey", label: "Survey name", required: false, hint: "Defaults to the file name" },
      { key: "theme", label: "Theme", required: false, hint: "e.g. workload, management, career, compensation, recognition" },
      { key: "score", label: "Score (1-5)", required: false, hint: "Numeric rating 1 to 5" },
      { key: "comment", label: "Comment", required: false, hint: "Free text; PII is redacted on import" },
    ],
  },
  replacement_costs: {
    type: "replacement_costs",
    label: "Recruitment and replacement costs",
    description: "Documented replacement cost components per team per period.",
    privacy: "Aggregate financial figures only.",
    fields: [
      ...base,
      { key: "departures", label: "Departures", required: true, hint: "Whole number" },
      { key: "recruitment_cost", label: "Recruitment cost", required: false, hint: "Currency amount" },
      { key: "onboarding_cost", label: "Onboarding cost", required: false, hint: "Currency amount" },
      { key: "training_cost", label: "Training cost", required: false, hint: "Currency amount" },
      { key: "temp_staffing_cost", label: "Temporary staffing cost", required: false, hint: "Currency amount" },
      { key: "vacancy_days", label: "Vacancy days", required: false, hint: "Average days a role stayed open" },
      { key: "daily_lost_capacity_cost", label: "Daily lost-capacity cost", required: false, hint: "Cost per vacant day" },
      { key: "manager_hours", label: "Manager hours", required: false, hint: "Hours spent recruiting/onboarding" },
      { key: "manager_hourly_cost", label: "Manager hourly cost", required: false, hint: "Currency amount" },
    ],
  },
};

export const SENSITIVE_HEADER_PATTERN =
  /(^|[^a-z])(name|email|e-mail|phone|mobile|ssn|passport|employee[_ ]?id|emp[_ ]?id|respondent|user[_ ]?id|address|dob|birth)([^a-z]|$)/i;

/** Headers that look like personal identifiers. Note "team name"/"department name"/"survey name" style headers are exempted by the caller via mapping. */
export function sensitiveHeaders(headers: string[]): string[] {
  return headers.filter((h) => SENSITIVE_HEADER_PATTERN.test(h) && !/^(team|department|survey|dept)[ _-]?name$/i.test(h.trim()));
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  error?: string;
}

export function parseCsv(text: string): ParsedCsv {
  if (text.length > MAX_FILE_BYTES) return { headers: [], rows: [], error: "File exceeds the 5 MB limit." };
  const clean = text.replace(/^﻿/, "");
  const res = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const fatal = res.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (fatal) return { headers: [], rows: [], error: `Could not parse CSV: ${fatal.message}` };
  // PapaParse silently renames duplicate headers, so inspect the raw header row.
  const rawHeader = (Papa.parse<string[]>(clean, { preview: 1 }).data[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
  const headers = (res.meta.fields ?? []).filter(Boolean);
  if (headers.length === 0) return { headers: [], rows: [], error: "No header row found." };
  if (new Set(rawHeader.map((h) => h.toLowerCase())).size !== rawHeader.length) {
    return { headers, rows: [], error: "Duplicate column headers detected." };
  }
  if (res.data.length > MAX_ROWS) return { headers, rows: [], error: `File exceeds ${MAX_ROWS} rows.` };
  return { headers, rows: res.data };
}

/** Suggest a mapping from CSV headers to dataset fields by normalized name. */
export function autoMap(spec: DatasetSpec, headers: string[]): Record<string, string> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const out: Record<string, string> = {};
  for (const f of spec.fields) {
    const hit = headers.find((h) => norm(h) === norm(f.key) || norm(h) === norm(f.label));
    if (hit) out[f.key] = hit;
  }
  return out;
}

/** Normalize dates to the first day of the month (ISO). Returns null if invalid. */
export function normalizePeriod(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let y: number;
  let m: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s))) {
    y = +match[1];
    m = +match[2];
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
    y = +match[3];
    m = +match[1];
  } else if ((match = /^(\d{1,2})\/(\d{4})$/.exec(s))) {
    y = +match[2];
    m = +match[1];
  } else return null;
  if (m < 1 || m > 12 || y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

const num = (raw: string | undefined) => {
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export interface RowIssue {
  row: number;
  field: string;
  message: string;
}
export interface NormalizedRow {
  team: string;
  department?: string;
  period: string;
  values: Record<string, number | string | null>;
}
export interface ValidationResult {
  valid: NormalizedRow[];
  issues: RowIssue[];
  duplicates: number;
  total: number;
}

const intField = z.number().int().nonnegative();
const nonNeg = z.number().nonnegative();
const INT_KEYS = ["headcount", "departures", "voluntary", "involuntary", "approved_positions", "open_positions", "hires", "backlog"];
const TEXT_KEYS = ["team", "department", "period", "survey", "theme", "comment"];

/** Validate and normalize rows according to the mapping. Row numbers are 1-based data rows (header excluded). */
export function validateRows(type: DatasetType, rows: Record<string, string>[], mapping: Record<string, string>): ValidationResult {
  const spec = DATASETS[type];
  const issues: RowIssue[] = [];
  const valid: NormalizedRow[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const f of spec.fields) {
    if (f.required && !mapping[f.key]) {
      issues.push({ row: 0, field: f.key, message: `Required field "${f.label}" is not mapped to a column.` });
    }
  }
  if (issues.length) return { valid, issues, duplicates, total: rows.length };

  const get = (r: Record<string, string>, key: string) => (mapping[key] ? r[mapping[key]] : undefined);

  rows.forEach((r, i) => {
    const rowNo = i + 1;
    const before = issues.length;
    const team = (get(r, "team") ?? "").trim();
    if (!team) issues.push({ row: rowNo, field: "team", message: "Team is empty." });
    const period = normalizePeriod(get(r, "period"));
    if (!period) issues.push({ row: rowNo, field: "period", message: `Unrecognized date "${get(r, "period") ?? ""}".` });

    const values: Record<string, number | string | null> = {};
    for (const f of spec.fields) {
      if (TEXT_KEYS.includes(f.key)) continue;
      const parsed = num(get(r, f.key));
      if (parsed === undefined) {
        if (f.required) issues.push({ row: rowNo, field: f.key, message: `${f.label} is required.` });
        values[f.key] = null;
        continue;
      }
      if (Number.isNaN(parsed)) {
        issues.push({ row: rowNo, field: f.key, message: `${f.label} is not a number.` });
        continue;
      }
      if (f.key === "score") {
        if (parsed < 1 || parsed > 5) issues.push({ row: rowNo, field: f.key, message: "Score must be between 1 and 5." });
      } else if (INT_KEYS.includes(f.key)) {
        if (!intField.safeParse(parsed).success) {
          issues.push({ row: rowNo, field: f.key, message: `${f.label} must be a non-negative whole number.` });
        }
      } else if (!nonNeg.safeParse(parsed).success) {
        issues.push({ row: rowNo, field: f.key, message: `${f.label} must be zero or greater.` });
      }
      values[f.key] = parsed;
    }
    if (
      type === "turnover" &&
      typeof values.voluntary === "number" &&
      typeof values.involuntary === "number" &&
      typeof values.departures === "number" &&
      values.voluntary + values.involuntary > values.departures
    ) {
      issues.push({ row: rowNo, field: "voluntary", message: "Voluntary + involuntary exceeds total departures." });
    }
    if (type === "survey") {
      values.theme = (get(r, "theme") ?? "").trim().toLowerCase().slice(0, 60) || null;
      values.survey = (get(r, "survey") ?? "").trim().slice(0, 120) || null;
      const c = (get(r, "comment") ?? "").trim();
      values.comment = c ? redactPII(c) : null;
    }

    if (issues.length > before || !period) return;

    // Survey rows are individual responses and are not de-duplicated; aggregate datasets are keyed by team+period.
    if (type !== "survey") {
      const key = `${team.toLowerCase()}|${period}`;
      if (seen.has(key)) {
        duplicates++;
        issues.push({ row: rowNo, field: "team", message: "Duplicate team and period in file; the earlier row was kept." });
        return;
      }
      seen.add(key);
    }
    valid.push({ team, department: (get(r, "department") ?? "").trim() || undefined, period, values });
  });

  return { valid, issues, duplicates, total: rows.length };
}

export function templateCsv(type: DatasetType): string {
  const spec = DATASETS[type];
  const header = spec.fields.map((f) => f.key).join(",");
  const sample: Record<string, string> = {
    team: "Example Team", department: "Example Department", period: "2025-01-01", headcount: "0", departures: "0",
    voluntary: "", involuntary: "", approved_positions: "0", open_positions: "0", hires: "0", demand_hours: "0",
    capacity_hours: "0", overtime_hours: "0", backlog: "0", survey: "Example Survey", theme: "workload", score: "3",
    comment: "", recruitment_cost: "0", onboarding_cost: "0", training_cost: "0", temp_staffing_cost: "0",
    vacancy_days: "0", daily_lost_capacity_cost: "0", manager_hours: "0", manager_hourly_cost: "0",
  };
  return `${header}\n${spec.fields.map((f) => sample[f.key] ?? "").join(",")}\n`;
}
