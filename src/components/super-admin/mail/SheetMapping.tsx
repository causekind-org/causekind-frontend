"use client";

/** File picker + sheet/column mapping for CSV/XLSX (Phase 2). Used to create and to append. */
import { useEffect, useState } from "react";
import { mcAddMembers, type McMemberRow, type McUpsertResult } from "@/lib/api";
import { CHUNK, columnKey, guessColumns, headerProblems, readSheet, toMemberRows, type Sheet } from "./sheetImport";

export type MappedSheet = { rows: McMemberRow[]; columns: string[]; fileName: string };

export function SheetMapping({ onChange, fieldClass, labelClass, mutedClass, id = "mc-sheet" }: {
  onChange: (m: MappedSheet | null) => void;
  fieldClass: string; labelClass: string; mutedClass: string; id?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [emailCol, setEmailCol] = useState(0);
  const [nameCol, setNameCol] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const load = async (f: File, sheetName?: string) => {
    setError(null); setReading(true);
    try {
      const s = await readSheet(f, sheetName);
      const g = guessColumns(s.header);
      setSheet(s); setEmailCol(g.email); setNameCol(g.name);
    } catch (e) {
      setSheet(null); setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally { setReading(false); }
  };

  useEffect(() => {
    if (!sheet || !file) { onChange(null); return; }
    const columns = sheet.header.filter((h, i) => i !== emailCol && i !== nameCol && columnKey(h));
    onChange({ rows: toMemberRows(sheet, emailCol, nameCol), columns, fileName: file.name });
  }, [sheet, file, emailCol, nameCol, onChange]);

  const problems = sheet ? headerProblems(sheet.header, emailCol, nameCol) : [];
  const firstEmail = sheet?.body[0]?.[emailCol] ?? "";

  return (
    <div className="space-y-3">
      <input id={id} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Choose a CSV or Excel file" className={`block w-full text-xs ${mutedClass}`}
        onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) load(f); else setSheet(null); }} />
      {reading && <p className={`text-xs ${mutedClass}`}>Reading…</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      {sheet && (
        <>
          {sheet.sheetNames.length > 1 && (
            <div>
              <label className={labelClass} htmlFor={`${id}-tab`}>Sheet</label>
              <select id={`${id}-tab`} className={fieldClass} value={sheet.sheet ?? ""} onChange={(e) => file && load(file, e.target.value)}>
                {sheet.sheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <p className={`text-xs ${mutedClass}`}>{file?.name}: {sheet.body.length.toLocaleString("en-IN")} rows.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`${id}-email`}>Email column</label>
              <select id={`${id}-email`} className={fieldClass} value={emailCol} onChange={(e) => setEmailCol(Number(e.target.value))}>
                {sheet.header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={`${id}-name`}>Name column (optional)</label>
              <select id={`${id}-name`} className={fieldClass} value={nameCol} onChange={(e) => setNameCol(Number(e.target.value))}>
                <option value={-1}>— none —</option>
                {sheet.header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </select>
            </div>
          </div>
          {!firstEmail.includes("@") && (
            <p className="text-xs text-amber-500">The first row&apos;s “email” is “{firstEmail || "empty"}”. Check the email column.</p>
          )}
          <p className={`text-xs ${mutedClass}`}>
            Other columns become variables:{" "}
            {sheet.header.filter((h, i) => i !== emailCol && i !== nameCol && columnKey(h)).map((h) => `{{${columnKey(h)}}}`).join(", ") || "none"}
          </p>
          {problems.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-amber-500">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
        </>
      )}
    </div>
  );
}

/** Uploads in chunks; the server upserts, so re-running after a failure is safe. */
export async function uploadInChunks(audienceId: number, rows: McMemberRow[], onProgress: (msg: string) => void) {
  const sum = { added: 0, updated: 0, unchanged: 0, invalid: 0, repeatedInFile: 0, total: 0 };
  for (let start = 0; start < rows.length; start += CHUNK) {
    const r: McUpsertResult = await mcAddMembers(audienceId, rows.slice(start, start + CHUNK));
    sum.added += r.added; sum.updated += r.updated; sum.unchanged += r.unchanged;
    sum.invalid += r.invalid; sum.repeatedInFile += r.repeatedInFile; sum.total = r.total;
    onProgress(`Uploading… ${Math.min(start + CHUNK, rows.length).toLocaleString("en-IN")} of ${rows.length.toLocaleString("en-IN")}`);
  }
  return sum;
}

export const resultText = (s: { added: number; updated: number; unchanged: number; invalid: number; repeatedInFile: number; total: number }) =>
  `${s.added} added, ${s.updated} updated, ${s.unchanged} unchanged, ${s.invalid} invalid addresses skipped` +
  (s.repeatedInFile ? `, ${s.repeatedInFile} repeated rows merged` : "") + `. The list now has ${s.total} people.`;
