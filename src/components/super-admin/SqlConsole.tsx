"use client";

import { useState } from "react";
import { superAdminRunSql, type SqlResult } from "@/lib/api";
import { Play, Loader2, Terminal, AlertTriangle, Database, History } from "lucide-react";

const SAMPLES = [
  "SELECT id, full_name, email, role, active FROM users ORDER BY id DESC LIMIT 20;",
  "SELECT status, COUNT(*) FROM campaigns GROUP BY status;",
  "SELECT COUNT(*) AS total_donations, SUM(amount) AS raised FROM donations WHERE status = 'COMPLETED';",
];

export function SqlConsole({ isDark = true }: { isDark?: boolean }) {
  const [query, setQuery] = useState(SAMPLES[0]);
  const [result, setResult] = useState<SqlResult | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  async function run() {
    if (!query.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await superAdminRunSql(query);
      setResult(res);
      if (!res.error) setHistory(prev => [query.trim(), ...prev.filter(q => q !== query.trim())].slice(0, 8));
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setRunning(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
  }

  // ── Theme tokens ──
  const t = isDark ? {
    heading:      "text-white",
    icon:         "text-[#f0b97a]",
    editor:       "border-white/10 bg-[#0b0f1a]",
    editorHeader: "border-b border-white/10 bg-white/[0.02]",
    filenameText: "text-stone-500",
    shortcutText: "text-stone-600",
    textarea:     "text-emerald-300 placeholder:text-stone-700",
    editorFooter: "border-t border-white/10",
    sampleBtn:    "border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/20",
    resultBox:    "border-white/10 bg-[#0b0f1a]",
    resultCount:  "border-b border-white/10 text-stone-500",
    tableHead:    "bg-white/[0.03]",
    theadTh:      "text-stone-500",
    cell:         "text-stone-300",
    cellNull:     "text-stone-600",
    rowHover:     "hover:bg-white/[0.03]",
    rowDivide:    "divide-y divide-white/5",
    writeRow:     "text-emerald-400",
    histTitle:    "text-stone-500",
    histBtn:      "text-stone-500 hover:text-stone-300 border-white/5 hover:border-white/15",
  } : {
    heading:      "text-stone-900",
    icon:         "text-[#b04a15]",
    editor:       "border-stone-200 bg-white",
    editorHeader: "border-b border-stone-200 bg-stone-50",
    filenameText: "text-stone-500",
    shortcutText: "text-stone-400",
    textarea:     "text-stone-800 placeholder:text-stone-400",
    editorFooter: "border-t border-stone-200",
    sampleBtn:    "border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300",
    resultBox:    "border-stone-200 bg-white",
    resultCount:  "border-b border-stone-200 text-stone-500",
    tableHead:    "bg-stone-50",
    theadTh:      "text-stone-500",
    cell:         "text-stone-700",
    cellNull:     "text-stone-400",
    rowHover:     "hover:bg-stone-50",
    rowDivide:    "divide-y divide-stone-100",
    writeRow:     "text-emerald-600",
    histTitle:    "text-stone-500",
    histBtn:      "text-stone-500 hover:text-stone-800 border-stone-200 hover:border-stone-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal className={`w-5 h-5 ${t.icon}`} />
        <h2 className={`text-lg font-black tracking-tight ${t.heading}`}>SQL Console</h2>
      </div>

      {/* Danger banner — always red regardless of theme */}
      <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <p className="text-xs text-red-400/90 leading-relaxed">
          <span className="font-bold">Danger zone.</span> Queries run directly against the production database with no undo. Writes (UPDATE/DELETE/DROP) are irreversible — double-check before running.
        </p>
      </div>

      {/* Editor */}
      <div className={`rounded-2xl border overflow-hidden ${t.editor}`}>
        <div className={`flex items-center justify-between px-4 py-2 ${t.editorHeader}`}>
          <span className={`text-[11px] font-mono ${t.filenameText}`}>query.sql</span>
          <span className={`text-[10px] font-mono ${t.shortcutText}`}>⌘/Ctrl + Enter to run</span>
        </div>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          rows={6}
          className={`w-full bg-transparent px-4 py-3 font-mono text-sm focus:outline-none resize-y ${t.textarea}`}
          placeholder="SELECT * FROM users;"
        />
        <div className={`flex items-center gap-2 px-4 py-3 ${t.editorFooter}`}>
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 bg-[#f0b97a] hover:bg-[#e0a96a] disabled:opacity-50 text-stone-950 font-bold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run query
          </button>
          <div className="flex flex-wrap gap-1.5 ml-2">
            {SAMPLES.map((s, i) => (
              <button
                key={i}
                onClick={() => setQuery(s)}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${t.sampleBtn}`}
              >
                sample {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border overflow-hidden ${t.resultBox}`}>
          {result.error ? (
            <div className="flex items-start gap-2.5 px-4 py-4">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap leading-relaxed">{result.error}</pre>
            </div>
          ) : result.type === "write" ? (
            <div className={`flex items-center gap-2.5 px-4 py-4 ${t.writeRow}`}>
              <Database className="w-4 h-4" />
              <span className="text-sm font-mono">{result.affectedRows} row(s) affected.</span>
            </div>
          ) : (
            <>
              <div className={`px-4 py-2.5 text-[11px] font-mono ${t.resultCount}`}>
                {result.rowCount} row(s)
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-xs">
                  <thead className={`sticky top-0 ${t.tableHead}`}>
                    <tr>
                      {(result.columns ?? []).map(c => (
                        <th key={c} className={`px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider whitespace-nowrap ${t.theadTh}`}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={t.rowDivide}>
                    {(result.rows ?? []).map((row, i) => (
                      <tr key={i} className={t.rowHover}>
                        {(result.columns ?? []).map(c => (
                          <td key={c} className={`px-3 py-2 font-mono whitespace-nowrap ${t.cell}`}>
                            {row[c] === null || row[c] === undefined
                              ? <span className={t.cellNull}>null</span>
                              : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${t.histTitle}`}>
            <History className="w-3.5 h-3.5" /> Recent queries
          </div>
          <div className="space-y-1">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setQuery(h)}
                className={`block w-full text-left truncate font-mono text-[11px] px-3 py-1.5 rounded border transition-colors ${t.histBtn}`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
