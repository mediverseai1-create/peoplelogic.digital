"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Series {
  key: string;
  label: string;
  color?: string;
}
const PALETTE = ["#27503b", "#9cc24a", "#4b5d8f", "#b8654a", "#b7791f"];

export function Chart({
  title,
  data,
  xKey,
  series,
  kind = "line",
  format = "num",
  height = 240,
  note,
}: {
  title: string;
  data: Record<string, string | number | null>[];
  xKey: string;
  series: Series[];
  kind?: "line" | "bar";
  format?: "num" | "pct";
  height?: number;
  note?: string;
}) {
  const fmt = (v: number) => (format === "pct" ? `${(v * 100).toFixed(1)}%` : v.toLocaleString(undefined, { maximumFractionDigits: 1 }));
  const Common = (
    <>
      <CartesianGrid stroke="#e4e0d0" strokeDasharray="3 3" />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#4a4650" }} />
      <YAxis tick={{ fontSize: 11, fill: "#4a4650" }} tickFormatter={fmt} width={48} />
      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );
  return (
    <figure className="card" aria-label={title}>
      <figcaption className="mb-2 text-sm font-medium text-plum-900">{title}</figcaption>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === "line" ? (
            <LineChart data={data}>
              {Common}
              {series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data}>
              {Common}
              {series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {note && <p className="mt-2 text-xs text-charcoal-400">{note}</p>}
    </figure>
  );
}
