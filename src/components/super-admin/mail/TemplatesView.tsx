"use client";

import { useRef, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcDeleteTemplate,
  mcSaveTemplate,
  type McTemplate,
} from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { EMPTY, errText } from "./shared";
import { RichEmailEditor, type RichEmailEditorHandle } from "./RichEmailEditor";

/** Mail Center: templates. */

// ------------------------------------------------------------------ templates

export function TemplatesView({ isDark, templates, variables, onChanged }: {
  isDark: boolean; templates: McTemplate[]; variables: string[]; onChanged: () => void;
}) {
  const t = saTheme(isDark);
  const [edit, setEdit] = useState<{ id: number | null; name: string; subject: string; preheader: string; html: string; text: string } | null>(null);
  const tplEditorRef = useRef<RichEmailEditorHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${t.input}`;

  const save = async () => {
    if (!edit) return;
    setError(null);
    try {
      await mcSaveTemplate(edit.id, { name: edit.name, subject: edit.subject, preheader: edit.preheader, html: edit.html, text: edit.text });
      setEdit(null);
      onChanged();
    } catch (e) { setError(errText(e)); }
  };

  if (edit) {
    return (
      <div className="max-w-2xl space-y-3">
        <input className={field} placeholder="Template name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <input className={field} placeholder="Subject" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
        <input className={field} placeholder="Preview line (optional)" value={edit.preheader} onChange={(e) => setEdit({ ...edit, preheader: e.target.value })} />
        <RichEmailEditor ref={tplEditorRef} value={edit.html} isDark={isDark} inputClass={t.input} btnClass={t.btn}
          onChange={(html) => setEdit((p) => (p ? { ...p, html } : p))} />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs ${t.muted}`}>Insert:</span>
          {variables.map((v) => (
            <button key={v} type="button" onClick={() => tplEditorRef.current?.insertText(`{{${v}}}`)}
              className={`rounded-full border px-2.5 py-1 font-mono text-3xs ${t.badgeAccent}`}>{`{{${v}}}`}</button>
          ))}
        </div>
        <textarea rows={5} className={`${field} font-mono text-xs`} placeholder="Plain-text version (optional — made automatically if empty)"
          value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>Save template</button>
          <button type="button" onClick={() => setEdit(null)} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setEdit({ id: null, name: "", subject: "", preheader: "", html: EMPTY.html, text: "" })}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>
        <Plus className="h-4 w-4" aria-hidden /> New template
      </button>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {templates.length === 0 && <p className={`py-8 text-center text-sm ${t.muted}`}>No templates yet.</p>}
      {templates.map((tp) => (
        <div key={tp.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${t.card}`}>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-bold ${t.heading}`}>{tp.name}</p>
            <p className={`truncate text-xs ${t.muted}`}>{tp.subject}</p>
          </div>
          <button type="button" onClick={() => setEdit({ id: tp.id, name: tp.name, subject: tp.subject, preheader: tp.preheader ?? "", html: tp.html, text: tp.text ?? "" })}
            className={`min-h-8 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>Edit</button>
          <button type="button" aria-label="Delete template"
            onClick={async () => {
              if (!window.confirm("Delete this template?")) return;
              try { await mcDeleteTemplate(tp.id); onChanged(); } catch (e) { setError(errText(e)); }
            }}
            className={`min-h-8 rounded-lg border px-2.5 ${t.btn}`}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
        </div>
      ))}
    </div>
  );
}
