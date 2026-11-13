"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/admin/ui/feedback";
import { Button } from "@/components/admin/ui/button";
import { sendJson } from "./api";

type Issue = { line: number; pincode: string; reason: string };
type Result = { created: number; skipped: Issue[]; failed: Issue[] };

/** Bulk add from a CSV: a `pincode` column (state, district, city and remarks optional), or just a list of pincodes. */
export function CsvImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    const csv = await file.text();
    const response = await sendJson<Result>("/api/admin/serviceable-locations/import", "POST", { csv });
    setBusy(false);
    if (!response.ok) return setError(response.data.error ?? "The import failed.");
    setResult(response.data);
    router.refresh();
  }

  const rows = (title: string, items: Issue[]) =>
    items.length > 0 && (
      <details className="rounded-xl border border-line px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-navy-900">{title} ({items.length})</summary>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-slate-600">
          {items.map((item) => (
            <li key={`${item.line}-${item.pincode}`}>Line {item.line}: <span className="tabular-nums">{item.pincode || "(blank)"}</span> — {item.reason}</li>
          ))}
        </ul>
      </details>
    );

  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
      <p className="text-sm text-slate-600">
        Upload a CSV with a <code className="rounded bg-slate-100 px-1">pincode</code> column, or one pincode per line (up to 500). India Post fills in the rest. Existing pincodes are skipped, never overwritten.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          aria-label="CSV file"
          onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); setError(""); }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <Button type="button" variant="primary" disabled={!file || busy} onClick={run}>{busy ? "Importing…" : "Import"}</Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {result && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <Alert tone={result.created > 0 ? "success" : "info"} title={`${result.created} ${result.created === 1 ? "pincode" : "pincodes"} added`}>
            {result.skipped.length} already in the list, {result.failed.length} could not be added.
          </Alert>
          {rows("Skipped", result.skipped)}
          {rows("Not added", result.failed)}
        </div>
      )}
    </div>
  );
}
