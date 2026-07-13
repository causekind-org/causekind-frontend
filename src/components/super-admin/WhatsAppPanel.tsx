"use client";

import { useEffect, useState } from "react";
import {
  getWhatsAppTemplates, createWhatsAppTemplate, deleteWhatsAppTemplate, type WhatsAppTemplate,
  getWhatsAppFlows, createWhatsAppFlow, updateWhatsAppFlowJson, publishWhatsAppFlow, deleteWhatsAppFlow, type WhatsAppFlow,
  sendWhatsAppTemplateMessage, getWhatsAppMessages, type WhatsAppMessageLog,
} from "@/lib/api";
import {
  MessageCircle, Send, Plus, Trash2, Upload, Rocket, Loader2, CheckCircle2, XCircle,
} from "lucide-react";

const TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const FLOW_CATEGORIES = [
  "SIGN_UP", "SIGN_IN", "APPOINTMENT_BOOKING", "LEAD_GENERATION",
  "CONTACT_US", "CUSTOMER_SUPPORT", "SURVEY", "OTHER",
];
const SUB_TABS = [
  { key: "send", label: "Send Message" },
  { key: "templates", label: "Templates" },
  { key: "flows", label: "Flows" },
  { key: "log", label: "Message Log" },
] as const;
type SubTab = (typeof SUB_TABS)[number]["key"];

function useTheme(isDark: boolean) {
  return isDark ? {
    heading: "text-white",
    icon: "text-[#f0b97a]",
    dim: "text-stone-500",
    muted: "text-stone-400",
    card: "border-white/10 bg-white/[0.03]",
    inputWrap: "border-white/10 bg-[#0b0f1a]",
    input: "text-stone-200 placeholder:text-stone-600",
    subTabActive: "bg-[#f0b97a]/10 text-[#f0b97a] border-[#f0b97a]/20",
    subTabInactive: "text-stone-400 hover:text-white border-transparent",
    primaryBtn: "bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950",
    secondaryBtn: "border-white/10 text-stone-300 hover:bg-white/5",
    chipActive: "bg-[#f0b97a] text-stone-950 border-[#f0b97a]",
    chipInactive: "border-white/10 text-stone-400 hover:border-white/20",
    tableHead: "bg-white/[0.03] text-stone-500",
    rowDivide: "divide-y divide-white/5",
    cell: "text-stone-300",
    ok: "text-emerald-400",
    bad: "text-red-400",
    warn: "text-amber-400",
  } : {
    heading: "text-stone-900",
    icon: "text-[#b04a15]",
    dim: "text-stone-500",
    muted: "text-stone-500",
    card: "border-stone-200 bg-white",
    inputWrap: "border-stone-200 bg-white",
    input: "text-stone-800 placeholder:text-stone-400",
    subTabActive: "bg-[#b04a15]/10 text-[#b04a15] border-[#b04a15]/20",
    subTabInactive: "text-stone-500 hover:text-stone-900 border-transparent",
    primaryBtn: "bg-[#b04a15] hover:bg-[#963e11] text-white",
    secondaryBtn: "border-stone-200 text-stone-600 hover:bg-stone-50",
    chipActive: "bg-[#b04a15] text-white border-[#b04a15]",
    chipInactive: "border-stone-200 text-stone-500 hover:border-stone-300",
    tableHead: "bg-stone-50 text-stone-500",
    rowDivide: "divide-y divide-stone-100",
    cell: "text-stone-700",
    ok: "text-emerald-600",
    bad: "text-red-600",
    warn: "text-amber-600",
  };
}
type Theme = ReturnType<typeof useTheme>;

function statusTone(t: Theme, status: string) {
  const s = status.toUpperCase();
  if (["APPROVED", "PUBLISHED", "DELIVERED", "READ"].includes(s)) return t.ok;
  if (["REJECTED", "FAILED"].includes(s)) return t.bad;
  return t.warn;
}

function inputCls(t: Theme) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${t.inputWrap} ${t.input}`;
}

export function WhatsAppPanel({ isDark = true }: { isDark?: boolean }) {
  const t = useTheme(isDark);
  const [tab, setTab] = useState<SubTab>("send");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageCircle className={`w-5 h-5 ${t.icon}`} />
        <h2 className={`text-lg font-black tracking-tight ${t.heading}`}>WhatsApp</h2>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${tab === key ? t.subTabActive : t.subTabInactive}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "send" && <SendTab t={t} />}
      {tab === "templates" && <TemplatesTab t={t} />}
      {tab === "flows" && <FlowsTab t={t} />}
      {tab === "log" && <LogTab t={t} />}
    </div>
  );
}

function SendTab({ t }: { t: Theme }) {
  const [to, setTo] = useState("");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateName, setTemplateName] = useState("");
  const [customTemplate, setCustomTemplate] = useState(false);
  const [languageCode, setLanguageCode] = useState("en_US");
  const [params, setParams] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    getWhatsAppTemplates()
      .then(res => setTemplates(res.data ?? []))
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  function handleTemplatePick(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "__custom__") {
      setCustomTemplate(true);
      setTemplateName("");
      return;
    }
    setCustomTemplate(false);
    const picked = templates.find(t => t.name === value);
    setTemplateName(value);
    if (picked?.language) setLanguageCode(picked.language);
  }

  async function handleSend() {
    if (!to.trim() || !templateName.trim()) {
      setResult({ ok: false, message: "Recipient phone number and template name are required." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      await sendWhatsAppTemplateMessage({
        to: to.trim(),
        templateName: templateName.trim(),
        languageCode: languageCode.trim() || "en_US",
        bodyParameters: params.map(p => p.trim()).filter(Boolean),
      });
      setResult({ ok: true, message: "Message sent." });
      setTo(""); setParams([""]);
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Failed to send message." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${t.card}`}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Recipient phone</label>
          <input className={inputCls(t)} value={to} onChange={e => setTo(e.target.value)} placeholder="919812345678" />
        </div>
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Language code</label>
          <input className={inputCls(t)} value={languageCode} onChange={e => setLanguageCode(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Template</label>
        {!customTemplate ? (
          <select className={inputCls(t)} value={templateName} onChange={handleTemplatePick} disabled={templatesLoading}>
            <option value="" disabled>{templatesLoading ? "Loading templates…" : "Choose a template"}</option>
            {templates.map(tpl => (
              <option key={tpl.id} value={tpl.name}>{tpl.name} · {tpl.language} · {tpl.status}</option>
            ))}
            <option value="__custom__">Custom (type manually)…</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              className={inputCls(t)}
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="template_name"
            />
            <button
              type="button"
              onClick={() => setCustomTemplate(false)}
              className={`px-3 rounded-lg border text-xs font-bold whitespace-nowrap ${t.secondaryBtn}`}
            >
              Choose from list
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Body variables</label>
        {params.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputCls(t)}
              value={p}
              onChange={e => setParams(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
              placeholder={`Variable ${i + 1}`}
            />
            <button
              onClick={() => setParams(prev => prev.filter((_, idx) => idx !== i))}
              disabled={params.length === 1}
              className={`px-2.5 rounded-lg border disabled:opacity-40 ${t.secondaryBtn}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setParams(prev => [...prev, ""])} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${t.secondaryBtn}`}>
          <Plus className="w-3.5 h-3.5" /> Add variable
        </button>
      </div>
      {result && (
        <p className={`text-xs font-semibold flex items-center gap-1.5 ${result.ok ? t.ok : t.bad}`}>
          {result.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {result.message}
        </p>
      )}
      <button
        onClick={handleSend}
        disabled={sending}
        className={`flex items-center gap-2 font-bold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${t.primaryBtn}`}
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
      </button>
    </div>
  );
}

function TemplatesTab({ t }: { t: Theme }) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("en_US");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getWhatsAppTemplates()
      .then(res => setTemplates(res.data ?? []))
      .catch(() => setError("Failed to load templates."))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    if (!name.trim() || !body.trim()) { setError("Template name and body text are required."); return; }
    setCreating(true); setError(null);
    try {
      const components = [
        ...(header.trim() ? [{ type: "HEADER", format: "TEXT", text: header.trim() }] : []),
        { type: "BODY", text: body.trim() },
        ...(footer.trim() ? [{ type: "FOOTER", text: footer.trim() }] : []),
      ];
      await createWhatsAppTemplate({ name: name.trim(), category, language, components });
      setName(""); setHeader(""); setBody(""); setFooter("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create template.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(templateName: string) {
    try { await deleteWhatsAppTemplate(templateName); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete template."); }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 space-y-4 ${t.card}`}>
        <h3 className={`text-sm font-bold ${t.heading}`}>New Template</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Name</label>
            <input className={inputCls(t)} value={name} onChange={e => setName(e.target.value)} placeholder="order_confirmation" />
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Category</label>
            <select className={inputCls(t)} value={category} onChange={e => setCategory(e.target.value)}>
              {TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Language</label>
            <input className={inputCls(t)} value={language} onChange={e => setLanguage(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Header (optional)</label>
          <input className={inputCls(t)} value={header} onChange={e => setHeader(e.target.value)} />
        </div>
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Body — use {"{{1}}"}, {"{{2}}"}...</label>
          <textarea className={inputCls(t)} rows={3} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Footer (optional)</label>
          <input className={inputCls(t)} value={footer} onChange={e => setFooter(e.target.value)} />
        </div>
        {error && <p className={`text-xs font-semibold ${t.bad}`}>{error}</p>}
        <button
          onClick={handleCreate}
          disabled={creating}
          className={`flex items-center gap-2 font-bold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${t.primaryBtn}`}
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Submit for approval
        </button>
      </div>

      {loading ? (
        <p className={`text-sm ${t.muted}`}>Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className={`text-sm ${t.muted}`}>No templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => (
            <div key={tpl.id} className={`rounded-xl border px-4 py-3 flex items-center justify-between ${t.card}`}>
              <div>
                <p className={`text-sm font-semibold ${t.heading}`}>{tpl.name}</p>
                <p className={`text-xs ${t.muted}`}>{tpl.category} · {tpl.language}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${statusTone(t, tpl.status)}`}>{tpl.status}</span>
                <button onClick={() => handleDelete(tpl.name)} className={`px-2.5 py-1.5 rounded-lg border ${t.secondaryBtn}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowsTab({ t }: { t: Theme }) {
  const [flows, setFlows] = useState<WhatsAppFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getWhatsAppFlows()
      .then(res => setFlows(res.data ?? []))
      .catch(() => setError("Failed to load flows."))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function toggleCategory(cat: string) {
    setCategories(prev => (prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]));
  }

  async function handleCreate() {
    if (!name.trim() || categories.length === 0) { setError("Flow name and at least one category are required."); return; }
    setCreating(true); setError(null);
    try {
      await createWhatsAppFlow({ name: name.trim(), categories });
      setName(""); setCategories([]);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create flow.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveJson(flowId: string) {
    const json = jsonDrafts[flowId];
    if (!json?.trim()) { setError("Paste the Flow JSON first."); return; }
    setBusyId(flowId); setError(null);
    try { await updateWhatsAppFlowJson(flowId, json); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save Flow JSON."); }
    finally { setBusyId(null); }
  }

  async function handlePublish(flowId: string) {
    setBusyId(flowId); setError(null);
    try { await publishWhatsAppFlow(flowId); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to publish flow."); }
    finally { setBusyId(null); }
  }

  async function handleDelete(flowId: string) {
    setBusyId(flowId); setError(null);
    try { await deleteWhatsAppFlow(flowId); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete flow."); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 space-y-4 ${t.card}`}>
        <h3 className={`text-sm font-bold ${t.heading}`}>New Flow</h3>
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Name</label>
          <input className={inputCls(t)} value={name} onChange={e => setName(e.target.value)} placeholder="Volunteer Signup" />
        </div>
        <div>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${t.dim}`}>Categories</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FLOW_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${categories.includes(cat) ? t.chipActive : t.chipInactive}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {error && <p className={`text-xs font-semibold ${t.bad}`}>{error}</p>}
        <button
          onClick={handleCreate}
          disabled={creating}
          className={`flex items-center gap-2 font-bold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${t.primaryBtn}`}
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create draft flow
        </button>
      </div>

      {loading ? (
        <p className={`text-sm ${t.muted}`}>Loading flows…</p>
      ) : flows.length === 0 ? (
        <p className={`text-sm ${t.muted}`}>No flows yet.</p>
      ) : (
        <div className="space-y-3">
          {flows.map(f => (
            <div key={f.id} className={`rounded-2xl border p-4 space-y-3 ${t.card}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${t.heading}`}>{f.name}</p>
                  <p className={`text-[11px] font-mono ${t.muted}`}>{f.id}</p>
                </div>
                <span className={`text-xs font-bold ${statusTone(t, f.status)}`}>{f.status}</span>
              </div>
              <textarea
                placeholder="Paste Flow JSON here"
                rows={5}
                className={inputCls(t) + " font-mono text-xs"}
                value={jsonDrafts[f.id] ?? ""}
                onChange={e => setJsonDrafts(prev => ({ ...prev, [f.id]: e.target.value }))}
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  disabled={busyId === f.id}
                  onClick={() => handleSaveJson(f.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 ${t.secondaryBtn}`}
                >
                  <Upload className="w-3.5 h-3.5" /> Save JSON
                </button>
                <button
                  disabled={busyId === f.id}
                  onClick={() => handlePublish(f.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 ${t.primaryBtn}`}
                >
                  <Rocket className="w-3.5 h-3.5" /> Publish
                </button>
                {f.status?.toUpperCase() === "DRAFT" && (
                  <button
                    disabled={busyId === f.id}
                    onClick={() => handleDelete(f.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 ${t.secondaryBtn}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogTab({ t }: { t: Theme }) {
  const [messages, setMessages] = useState<WhatsAppMessageLog[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWhatsAppMessages(page)
      .then(res => { setMessages(res.content ?? []); setTotalPages(res.totalPages ?? 0); })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <p className={`text-sm ${t.muted}`}>Loading…</p>;

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <p className={`text-sm ${t.muted}`}>No messages yet.</p>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className={t.tableHead}>
                <tr>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Direction</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Phone</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Type / Template</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className={t.rowDivide}>
                {messages.map(m => (
                  <tr key={m.id}>
                    <td className={`px-3 py-2 ${t.cell}`}>{m.direction}</td>
                    <td className={`px-3 py-2 ${t.cell}`}>{m.phoneNumber}</td>
                    <td className={`px-3 py-2 ${t.cell}`}>{m.templateName ?? m.messageType}</td>
                    <td className={`px-3 py-2 font-bold ${statusTone(t, m.status)}`}>{m.status}</td>
                    <td className={`px-3 py-2 ${t.cell}`}>{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40 ${t.secondaryBtn}`}
        >
          Prev
        </button>
        <span className={`text-xs ${t.muted}`}>Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(p => p + 1)}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-40 ${t.secondaryBtn}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
