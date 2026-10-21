import Link from "next/link";
import type { ReactNode } from "react";
import type { Level } from "@/lib/analytics";
import { LEVEL_LABEL } from "@/lib/analytics";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl text-plum-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-charcoal-600">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="card border-dashed text-center">
      <h3 className="text-lg text-plum-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-charcoal-600">{body}</p>
      {href && cta && (
        <Link href={href} className="btn-primary mt-4">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-charcoal-600">{label}</div>
      <div className="mt-1 font-display text-3xl text-plum-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-charcoal-400">{hint}</div>}
    </div>
  );
}

const LEVEL_STYLE: Record<Level, string> = {
  no_signal: "border-signal-ok/40 bg-signal-ok/10 text-signal-ok",
  watch: "border-signal-watch/40 bg-signal-watch/10 text-signal-watch",
  elevated: "border-signal-high/40 bg-signal-high/10 text-signal-high",
  insufficient_data: "border-ivory-300 bg-ivory-100 text-charcoal-600",
};
export function LevelChip({ level }: { level: Level }) {
  return <span className={`chip ${LEVEL_STYLE[level]}`}>{LEVEL_LABEL[level]}</span>;
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "warn" }) {
  const t = {
    neutral: "border-ivory-300 bg-ivory-100 text-charcoal-600",
    info: "border-signal-info/30 bg-signal-info/10 text-signal-info",
    warn: "border-signal-watch/40 bg-signal-watch/10 text-signal-watch",
  }[tone];
  return <span className={`chip ${t}`}>{children}</span>;
}

/** Provenance notice shown on analytic pages: period, coverage, sample and limitations. */
export function DataNotice({
  period,
  coverage,
  updated,
  sample,
  limitations,
}: {
  period?: string | null;
  coverage?: string;
  updated?: string | null;
  sample?: string;
  limitations?: string;
}) {
  return (
    <div className="mb-6 rounded-md border border-ivory-300 bg-ivory-100/70 px-4 py-3 text-xs text-charcoal-600">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span><strong>Data period:</strong> {period ?? "no data"}</span>
        {coverage && <span><strong>Source coverage:</strong> {coverage}</span>}
        {sample && <span><strong>Sample:</strong> {sample}</span>}
        <span><strong>Last updated:</strong> {updated ? new Date(updated).toLocaleString() : "n/a"}</span>
      </div>
      <p className="mt-1">
        <strong>Limitations:</strong>{" "}
        {limitations ??
          "Team-level, descriptive indicators computed from imported data. They are not predictions of any individual's behavior, and correlation is not causation."}
      </p>
    </div>
  );
}

export function Flash({ kind, children }: { kind: "ok" | "error" | "info"; children: ReactNode }) {
  const s = {
    ok: "border-signal-ok/40 bg-signal-ok/10 text-signal-ok",
    error: "border-signal-high/40 bg-signal-high/10 text-signal-high",
    info: "border-signal-info/30 bg-signal-info/10 text-signal-info",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`mb-4 rounded-md border px-3 py-2 text-sm ${s}`}>
      {children}
    </div>
  );
}

export const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
export const num = (v: number | null | undefined, d = 0) => (v == null ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: d }));
export const money = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: 0 }));
export const monthLabel = (p: string | null | undefined) => (p ? p.slice(0, 7) : "—");
