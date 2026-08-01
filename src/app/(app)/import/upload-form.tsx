"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { previewImport, commitImport, type ImportMapping, type PreviewRow } from "./actions";
import ReviewTable from "./review-table";

type Account = { id: string; name: string };
type SavedMapping = Record<string, ImportMapping>;
type Category = { id: string; group_name: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

type Props = {
  accounts: Account[];
  savedMappings: SavedMapping;
  categories: Category[];
  subcategories: Subcategory[];
};

const FIELD_LABELS: { key: keyof ImportMapping; label: string }[] = [
  { key: "date", label: "Date column" },
  { key: "narration", label: "Narration / Description column" },
  { key: "debit", label: "Debit / Withdrawal column (optional)" },
  { key: "credit", label: "Credit / Deposit column (optional)" },
  { key: "amount", label: "Signed amount column (use instead of debit/credit)" },
  { key: "reference", label: "Reference column (optional)" },
];

function guessMapping(headers: string[]): ImportMapping {
  const find = (candidates: string[]) =>
    headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c))) || "";
  return {
    date: find(["date"]),
    narration: find(["narration", "description", "particulars"]),
    debit: find(["debit", "withdrawal"]),
    credit: find(["credit", "deposit"]),
    amount: find(["amount"]),
    reference: find(["reference", "ref no", "ref"]),
  };
}

export default function UploadForm({ accounts, savedMappings, categories, subcategories }: Props) {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({ date: "", narration: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview step state
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof commitImport>> | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreviewRows(null);
    setResult(null);
    setError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields || [];
        setHeaders(fields);
        setRows(results.data);
        setMapping(savedMappings[accountId] || guessMapping(fields));
      },
    });
  }

  async function handlePreview() {
    if (!accountId || !mapping.date || !mapping.narration || rows.length === 0) {
      setError("Select an account, upload a file, and map at least Date + Narration.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const preview = await previewImport(accountId, mapping, rows);
      setPreviewRows(preview);
    } catch (err: any) {
      setError(err.message || "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit(confirmedRows: PreviewRow[]) {
    setBusy(true);
    setError(null);
    try {
      const summary = await commitImport(accountId, mapping, confirmedRows, fileName);
      setResult(summary);
      setPreviewRows(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }

  // Step 3: done — show result tiles
  if (result) {
    return (
      <div className="grid gap-4">
        <p className="text-sm font-semibold text-navy">Import complete</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {([
            ["Total rows", result.total],
            ["Accepted", result.accepted],
            ["Duplicates", result.duplicates],
            ["Transfers", result.transfers],
            ["Matched", result.matched],
            ["Needs review", result.unknown],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label} className="bg-white border border-[#e3ddd7] rounded-xl p-3 text-center">
              <div className="text-lg font-extrabold text-navy">{value}</div>
              <div className="text-[10px] text-muted mt-1">{label}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setResult(null); setRows([]); setHeaders([]); setFileName(""); }}
          className="text-xs text-navy underline underline-offset-2 text-left"
        >
          Import another file
        </button>
      </div>
    );
  }

  // Step 2: review table
  if (previewRows) {
    return (
      <div className="grid gap-4">
        <p className="text-sm font-semibold text-navy">Review before importing</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ReviewTable
          rows={previewRows}
          categories={categories}
          subcategories={subcategories}
          onConfirm={handleCommit}
          onBack={() => setPreviewRows(null)}
          busy={busy}
        />
      </div>
    );
  }

  // Step 1: upload + mapping
  return (
    <div className="grid gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Account</label>
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              if (headers.length) setMapping(savedMappings[e.target.value] || guessMapping(headers));
            }}
            className="w-full border border-[#e3ddd7] rounded-xl p-2.5"
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-muted">Statement file (CSV)</label>
            <a
              href="/sample_statement.xlsx"
              download
              className="text-[11px] text-navy underline underline-offset-2 hover:opacity-70"
            >
              ↓ Download sample Excel
            </a>
          </div>
          <input type="file" accept=".csv" onChange={handleFile} className="w-full text-xs" />
        </div>
      </div>

      {headers.length > 0 && (
        <div className="border border-[#e3ddd7] rounded-xl p-4 bg-[#faf9f7]">
          <div className="text-xs font-bold text-navy mb-3">Column mapping ({rows.length} rows detected)</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELD_LABELS.map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] text-muted mb-1">{f.label}</label>
                <select
                  value={mapping[f.key] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                  className="w-full border border-[#e3ddd7] rounded-lg p-2 text-xs bg-white"
                >
                  <option value="">-</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handlePreview}
        disabled={busy || rows.length === 0}
        className="bg-navy text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
      >
        {busy ? "Analysing…" : "Preview import"}
      </button>
    </div>
  );
}
