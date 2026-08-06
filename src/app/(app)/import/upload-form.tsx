"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { previewImport, commitImport, type ImportMapping, type PreviewRow } from "./actions";
import ReviewTable from "./review-table";

type Account = { id: string; name: string };
type SavedMapping = Record<string, ImportMapping>;
type Category = { id: string; group_name: string; name: string; default_personal_or_office: string | null };
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
  { key: "category", label: "Category column (optional)" },
  { key: "subcategory", label: "Subcategory column (optional)" },
];

// Reads the first sheet of a real .xlsx/.xls workbook into the same shape
// Papa.parse gives us for CSV: an array of header names and an array of
// plain-string row objects. `cellDates: true` on read + explicit DD/MM/YYYY
// formatting here (rather than trusting XLSX's locale-dependent formatted
// string) keeps dates in the exact format `parseDate` in actions.ts expects
// — leaving it to XLSX's own text formatting risks MM/DD/YYYY vs DD/MM/YYYY
// ambiguity for any day <= 12.
function parseExcelFile(file: File): Promise<{ fields: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
        if (!grid.length) throw new Error("The first sheet is empty.");

        const fields = (grid[0] as unknown[]).map((h) => String(h ?? "").trim());
        const data = grid.slice(1).map((row) => {
          const obj: Record<string, string> = {};
          fields.forEach((field, i) => {
            const cell = (row as unknown[])[i];
            if (cell instanceof Date) {
              const dd = String(cell.getDate()).padStart(2, "0");
              const mm = String(cell.getMonth() + 1).padStart(2, "0");
              obj[field] = `${dd}/${mm}/${cell.getFullYear()}`;
            } else {
              obj[field] = cell === undefined || cell === null ? "" : String(cell);
            }
          });
          return obj;
        });
        resolve({ fields, data });
      } catch (err: any) {
        reject(new Error(err?.message || "Could not parse this Excel file."));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

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
    category: find(["category"]),
    subcategory: find(["subcategory"]),
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreviewRows(null);
    setResult(null);
    setError(null);

    const ext = file.name.toLowerCase().split(".").pop();

    if (ext === "xlsx" || ext === "xls") {
      try {
        const { fields, data } = await parseExcelFile(file);
        setHeaders(fields);
        setRows(data);
        setMapping(savedMappings[accountId] || guessMapping(fields));
      } catch (err: any) {
        setError(err?.message || "Could not read this Excel file.");
      }
      return;
    }

    if (ext !== "csv") {
      setError("Unsupported file type — please upload a .csv, .xlsx, or .xls file.");
      return;
    }

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
    if (!accountId) { setError("Please select an account first."); return; }
    if (rows.length === 0) { setError("Please upload a CSV file."); return; }
    if (!mapping.date) { setError("Please map the Date column."); return; }
    if (!mapping.narration) { setError("Please map the Narration / Description column."); return; }
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
            <label className="block text-xs text-muted">Statement file (CSV or Excel)</label>
            <a
              href="/sample_statement.xlsx"
              download
              className="text-[11px] text-navy underline underline-offset-2 hover:opacity-70"
            >
              ↓ Download sample Excel
            </a>
          </div>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="w-full text-xs" />
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
        disabled={busy}
        className="bg-navy text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
      >
        {busy ? "Analysing…" : "Preview import"}
      </button>
    </div>
  );
}
