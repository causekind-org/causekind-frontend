/**
 * Reads a CSV or XLSX file into a header row plus body rows of strings
 * (Phase 2, inventory AU04/CP18). XLSX goes through read-excel-file, which
 * returns cached cell values — formulas and macros are never executed, and
 * hyperlinks are read as plain text.
 */
import type { McMemberRow } from "@/lib/api";

export type Sheet = { header: string[]; body: string[][]; sheetNames: string[]; sheet: string | null };

export const MAX_ROWS = 50_000;
export const CHUNK = 2000;

/** Small RFC-4180 CSV parser: quoted fields, "" escapes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const cellText = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

/** Throws a plain-language Error for unsupported or empty files. */
export async function readSheet(file: File, sheet?: string): Promise<Sheet> {
  const lower = file.name.toLowerCase();
  let rows: string[][];
  let sheetNames: string[] = [];
  let chosen: string | null = null;
  if (lower.endsWith(".csv")) {
    rows = parseCsv(await file.text());
  } else if (lower.endsWith(".xlsx")) {
    const { default: readXlsxFile, readSheetNames } = await import("read-excel-file");
    sheetNames = await readSheetNames(file);
    chosen = sheet && sheetNames.includes(sheet) ? sheet : sheetNames[0] ?? null;
    const raw = await readXlsxFile(file, chosen ? { sheet: chosen } : undefined);
    rows = raw.map((r) => r.map(cellText)).filter((r) => r.some((c) => c.trim() !== ""));
  } else {
    throw new Error("Choose a .csv or .xlsx file. (Old .xls files: open in Excel and save as .xlsx.)");
  }
  if (rows.length < 2) throw new Error("The sheet has no rows under the header line.");
  if (rows.length - 1 > MAX_ROWS) throw new Error(`This sheet has ${rows.length - 1} rows. A saved list holds at most ${MAX_ROWS.toLocaleString("en-IN")}. Split it into parts.`);
  const width = Math.max(...rows.map((r) => r.length));
  const header = Array.from({ length: width }, (_, i) => (rows[0][i] ?? "").trim());
  return { header, body: rows.slice(1), sheetNames, sheet: chosen };
}

/** Best guess for the email and name columns. */
export function guessColumns(header: string[]): { email: number; name: number } {
  const h = header.map((x) => x.toLowerCase());
  const email = h.findIndex((x) => x.includes("email") || x.includes("e-mail"));
  const name = h.findIndex((x) => x === "name" || x.includes("full name") || x === "first name");
  return { email: email >= 0 ? email : 0, name };
}

/** Lower-case variable key, same rule as the backend's MailMerge.columnKey. */
export const columnKey = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const RESERVED = new Set(["name", "first_name", "email", "unsubscribe", "unsubscribe_url"]);

/**
 * Column problems shown before upload (prompt §4: headings differing only by case
 * or spacing collapse to one variable; built-in names can't be used).
 */
export function headerProblems(header: string[], emailCol: number, nameCol: number): string[] {
  const seen = new Map<string, string>();
  const out: string[] = [];
  header.forEach((h, i) => {
    if (i === emailCol || i === nameCol) return;
    const k = columnKey(h);
    if (!k) { out.push(`Column ${i + 1} has no heading and will be skipped.`); return; }
    if (RESERVED.has(k)) { out.push(`“${h}” clashes with the built-in {{${k}}} and will be skipped. Rename the heading.`); return; }
    const prev = seen.get(k);
    if (prev) out.push(`“${prev}” and “${h}” both become {{${k}}}. Only the first is kept unless you rename one.`);
    else seen.set(k, h);
  });
  return out;
}

export function toMemberRows(sheet: Sheet, emailCol: number, nameCol: number): McMemberRow[] {
  const extra = sheet.header.map((h, i) => ({ h, i })).filter(({ h, i }) => i !== emailCol && i !== nameCol && columnKey(h));
  return sheet.body.map((r) => ({
    email: (r[emailCol] ?? "").trim(),
    name: nameCol >= 0 ? (r[nameCol] ?? "").trim() : undefined,
    extra: Object.fromEntries(extra.map(({ h, i }) => [h, (r[i] ?? "").trim()])),
  }));
}

/** Emails pulled out of pasted text: one per line, or separated by commas/semicolons/spaces. */
export function parsePasted(text: string): { rows: McMemberRow[]; invalid: number } {
  const seen = new Set<string>();
  const rows: McMemberRow[] = [];
  let invalid = 0;
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().replace(/^<|>$/g, "").toLowerCase();
    if (!e) continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { invalid++; continue; }
    if (seen.has(e)) continue;
    seen.add(e);
    rows.push({ email: e });
  }
  return { rows, invalid };
}
