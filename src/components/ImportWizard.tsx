"use client";

import { useActionState, useMemo, useState } from "react";
import { commitImport, type State } from "@/app/actions";
import { DATASET_TYPES, DATASETS, MAX_FILE_BYTES, autoMap, parseCsv, sensitiveHeaders, validateRows, type DatasetType } from "@/lib/csv";
import { Chip, Flash } from "./ui";

export function ImportWizard({ initialType }: { initialType?: DatasetType }) {
  const [type, setType] = useState<DatasetType>(initialType ?? "headcount");
  const [filename, setFilename] = useState("");
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState(commitImport as (p: State, f: FormData) => Promise<State>, {} as State);

  const spec = DATASETS[type];
  const parsed = useMemo(() => (text ? parseCsv(text) : null), [text]);
  const validation = useMemo(() => (parsed && !parsed.error ? validateRows(type, parsed.rows, mapping) : null), [parsed, type, mapping]);
  const sensitive = parsed ? sensitiveHeaders(parsed.headers) : [];
  const stillMapped = sensitive.filter((h) => Object.values(mapping).includes(h));

  async function onFile(f: File | null) {
    setFileError(null);
    setText("");
    setMapping({});
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") return setFileError("Please choose a .csv file.");
    if (f.size > MAX_FILE_BYTES) return setFileError("File is larger than the 5 MB limit.");
    const t = await f.text();
    const p = parseCsv(t);
    setFilename(f.name);
    setText(t);
    if (!p.error) setMapping(autoMap(DATASETS[type], p.headers));
  }

  const hardIssues = validation?.issues.filter((i) => i.row === 0) ?? [];
  const canCommit = !!validation && hardIssues.length === 0 && validation.valid.length > 0 && !pending;
  const result = state.data as { imported: number; rejected: number; duplicates: number; total: number } | undefined;

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2 text-xs text-charcoal-600" aria-label="Import steps">
        {["Dataset", "Upload", "Validate", "Preview", "Map columns", "Review issues", "Privacy check", "Confirm"].map((s, i) => <li key={s} className="chip border-ivory-300 bg-white">{i + 1}. {s}</li>)}
      </ol>

      <div className="card grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="ds-type">1. Dataset type</label>
          <select id="ds-type" className="input" value={type} onChange={(e) => { setType(e.target.value as DatasetType); setMapping(parsed && !parsed.error ? autoMap(DATASETS[e.target.value as DatasetType], parsed.headers) : {}); }}>
            {DATASET_TYPES.map((t) => <option key={t} value={t}>{DATASETS[t].label}</option>)}
          </select>
          <p className="mt-1 text-xs text-charcoal-600">{spec.description}</p>
          <p className="mt-1 text-xs text-signal-watch">Privacy: {spec.privacy}</p>
          <a className="mt-2 inline-block text-xs underline" href={`/api/templates/${type}`}>Download sample template (template only, not real data)</a>
        </div>
        <div>
          <label className="label" htmlFor="ds-file">2. Upload CSV (max 5 MB)</label>
          <input id="ds-file" type="file" accept=".csv,text/csv" className="input" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          {fileError && <p role="alert" className="mt-1 text-sm text-signal-high">{fileError}</p>}
          {parsed?.error && <p role="alert" className="mt-1 text-sm text-signal-high">{parsed.error}</p>}
          {filename && !parsed?.error && <p className="mt-1 text-xs text-charcoal-600">{filename}: {parsed?.rows.length ?? 0} rows, {parsed?.headers.length ?? 0} columns</p>}
        </div>
      </div>

      {parsed && !parsed.error && (
        <>
          {sensitive.length > 0 && (
            <Flash kind="error">
              Possible personal-identifier columns detected: <strong>{sensitive.join(", ")}</strong>. PeopleLogic analyzes teams, not individuals. These columns are not stored unless you map them{stillMapped.length ? ` (mapped: ${stillMapped.join(", ")} — please unmap)` : ""}. Remove them from the file if they are not needed.
            </Flash>
          )}

          <div className="card">
            <h3 className="text-lg text-plum-900">5. Map columns</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {spec.fields.map((f) => (
                <div key={f.key}>
                  <label className="label" htmlFor={`map-${f.key}`}>{f.label}{f.required && " *"}</label>
                  <select id={`map-${f.key}`} className="input" value={mapping[f.key] ?? ""} onChange={(e) => setMapping((m) => { const n = { ...m }; if (e.target.value) n[f.key] = e.target.value; else delete n[f.key]; return n; })}>
                    <option value="">{f.required ? "— select column —" : "— not provided —"}</option>
                    {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="mt-0.5 text-xs text-charcoal-400">{f.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-x-auto">
            <h3 className="text-lg text-plum-900">4. Preview (first 8 rows)</h3>
            <table className="mt-2 min-w-full text-xs"><thead><tr>{parsed.headers.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-ivory-300">{parsed.rows.slice(0, 8).map((r, i) => <tr key={i}>{parsed.headers.map((h) => <td key={h} className="td">{sensitive.includes(h) ? "•••" : r[h]}</td>)}</tr>)}</tbody></table>
          </div>

          {validation && (
            <div className="card">
              <h3 className="text-lg text-plum-900">3 & 6. Validation</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-sm"><Chip tone="info">{validation.valid.length} valid rows</Chip><Chip tone={validation.issues.length ? "warn" : "neutral"}>{validation.issues.length} issues</Chip><Chip>{validation.duplicates} duplicates in file</Chip><Chip>{validation.total} total rows</Chip></div>
              {validation.issues.length > 0 && (
                <ul className="mt-3 max-h-48 list-disc space-y-0.5 overflow-auto pl-5 text-xs text-charcoal-600">
                  {validation.issues.slice(0, 40).map((i, k) => <li key={k}>{i.row ? `Row ${i.row}` : "Mapping"} · {i.field}: {i.message}</li>)}
                  {validation.issues.length > 40 && <li>…and {validation.issues.length - 40} more.</li>}
                </ul>
              )}
              <p className="mt-3 text-xs text-charcoal-600">Invalid rows are skipped and recorded; valid rows are imported. Existing team+period records are updated with the new values.</p>
            </div>
          )}

          <form action={action} className="card space-y-3">
            <h3 className="text-lg text-plum-900">7 & 8. Privacy check and confirm</h3>
            <ul className="list-disc pl-5 text-sm text-charcoal-600">
              <li>Only mapped columns are imported; unmapped columns (including any identifiers) are discarded.</li>
              <li>Survey comments are redacted for emails, phone numbers and IDs on a best-effort basis.</li>
              <li>Results are shown at team level; groups below the minimum group size are suppressed.</li>
            </ul>
            <input type="hidden" name="dataset_type" value={type} />
            <input type="hidden" name="filename" value={filename} />
            <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
            <input type="hidden" name="csv" value={text} />
            {state.error && <Flash kind="error">{state.error}</Flash>}
            {state.ok && <Flash kind="ok">{state.ok}{result ? ` ${result.rejected} rejected, ${result.duplicates} duplicates.` : ""}</Flash>}
            <button className="btn-primary" disabled={!canCommit}>{pending ? "Importing…" : `Import ${validation?.valid.length ?? 0} rows`}</button>
          </form>
        </>
      )}
    </div>
  );
}
