"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  getWhatsAppTemplates, createWhatsAppTemplate, deleteWhatsAppTemplate, type WhatsAppTemplate,
  getWhatsAppFlows, createWhatsAppFlow, updateWhatsAppFlowJson, publishWhatsAppFlow, deleteWhatsAppFlow, type WhatsAppFlow,
  sendWhatsAppTemplateMessage, getWhatsAppMessages, type WhatsAppMessageLog,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Send, Trash2, Upload, Rocket } from "lucide-react";

const TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const FLOW_CATEGORIES = [
  "SIGN_UP", "SIGN_IN", "APPOINTMENT_BOOKING", "LEAD_GENERATION",
  "CONTACT_US", "CUSTOMER_SUPPORT", "SURVEY", "OTHER",
];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase();
  if (["APPROVED", "PUBLISHED", "DELIVERED", "READ"].includes(s)) return "default";
  if (["REJECTED", "FAILED"].includes(s)) return "destructive";
  if (["PENDING", "DRAFT", "SENT", "RECEIVED"].includes(s)) return "secondary";
  return "outline";
}

/** WhatsApp admin console — previously duplicated as a standalone ADMIN page
 * (shadcn-styled) and a separate raw-HTML super-admin panel. This is now the
 * single implementation, shared by both dashboards. */
export function WhatsAppPanel() {
  return (
    <Tabs defaultValue="send">
      <TabsList>
        <TabsTrigger value="send">Send Message</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="flows">Flows</TabsTrigger>
        <TabsTrigger value="log">Message Log</TabsTrigger>
      </TabsList>

      <TabsContent value="send"><SendMessageTab /></TabsContent>
      <TabsContent value="templates"><TemplatesTab /></TabsContent>
      <TabsContent value="flows"><FlowsTab /></TabsContent>
      <TabsContent value="log"><MessageLogTab /></TabsContent>
    </Tabs>
  );
}

// ── Send Message ──────────────────────────────────────────────────────────────

function SendMessageTab() {
  const [to, setTo] = useState("");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateName, setTemplateName] = useState("");
  const [customTemplate, setCustomTemplate] = useState(false);
  const [languageCode, setLanguageCode] = useState("en_US");
  const [params, setParams] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getWhatsAppTemplates()
      .then((res) => setTemplates(res.data ?? []))
      .catch(() => toast.error("Failed to load templates."))
      .finally(() => setTemplatesLoading(false));
  }, []);

  function handleTemplatePick(value: string) {
    if (value === "__custom__") {
      setCustomTemplate(true);
      setTemplateName("");
      return;
    }
    setCustomTemplate(false);
    const picked = templates.find((t) => t.name === value);
    setTemplateName(value);
    if (picked?.language) setLanguageCode(picked.language);
  }

  async function handleSend() {
    if (!to.trim() || !templateName.trim()) {
      toast.error("Recipient phone number and template name are required.");
      return;
    }
    setSending(true);
    try {
      await sendWhatsAppTemplateMessage({
        to: to.trim(),
        templateName: templateName.trim(),
        languageCode: languageCode.trim() || "en_US",
        bodyParameters: params.map((p) => p.trim()).filter(Boolean),
      });
      toast.success("WhatsApp message sent.");
      setTo(""); setParams([""]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wa-to">Recipient phone (e.g. 919812345678)</Label>
            <Input id="wa-to" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="wa-lang">Language code</Label>
            <Input id="wa-lang" value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Template</Label>
          {!customTemplate ? (
            <Select value={templateName} onValueChange={handleTemplatePick} disabled={templatesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={templatesLoading ? "Loading templates…" : "Choose a template"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    {t.name} · {t.language} · {t.status}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom (type manually)…</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex gap-2">
              <Input
                id="wa-template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="template_name"
              />
              <Button type="button" variant="outline" onClick={() => setCustomTemplate(false)}>
                Choose from list
              </Button>
            </div>
          )}
          {!customTemplate && templates.length === 0 && !templatesLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              No templates synced yet — create one in the Templates tab, or switch to Custom.
            </p>
          )}
        </div>
        <div>
          <Label>Body variables (in order, e.g. {"{{1}}"}, {"{{2}}"}...)</Label>
          <div className="space-y-2 mt-1">
            {params.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={p}
                  onChange={(e) => setParams((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder={`Variable ${i + 1}`}
                />
                <Button variant="outline" size="icon" onClick={() => setParams((prev) => prev.filter((_, idx) => idx !== i))} disabled={params.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setParams((prev) => [...prev, ""])} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add variable
            </Button>
          </div>
        </div>
        <Button onClick={handleSend} disabled={sending} className="gap-1.5">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Templates ─────────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("en_US");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    getWhatsAppTemplates()
      .then((res) => setTemplates(res.data ?? []))
      .catch(() => toast.error("Failed to load templates."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!name.trim() || !body.trim()) {
      toast.error("Template name and body text are required.");
      return;
    }
    setCreating(true);
    try {
      const components = [
        ...(header.trim() ? [{ type: "HEADER", format: "TEXT", text: header.trim() }] : []),
        { type: "BODY", text: body.trim() },
        ...(footer.trim() ? [{ type: "FOOTER", text: footer.trim() }] : []),
      ];
      await createWhatsAppTemplate({ name: name.trim(), category, language, components });
      toast.success("Template submitted for approval.");
      setName(""); setHeader(""); setBody(""); setFooter("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create template.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(templateName: string) {
    try {
      await deleteWhatsAppTemplate(templateName);
      toast.success("Template deleted.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete template.");
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-semibold">New Template</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tpl-name">Name</Label>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="order_confirmation" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tpl-lang">Language</Label>
              <Input id="tpl-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="tpl-header">Header (optional)</Label>
            <Input id="tpl-header" value={header} onChange={(e) => setHeader(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tpl-body">Body — use {"{{1}}"}, {"{{2}}"}... for variables</Label>
            <Textarea id="tpl-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="tpl-footer">Footer (optional)</Label>
            <Input id="tpl-footer" value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Submit for approval
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {t.language}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(t.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Flows ─────────────────────────────────────────────────────────────────────

function FlowsTab() {
  const [flows, setFlows] = useState<WhatsAppFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getWhatsAppFlows()
      .then((res) => setFlows(res.data ?? []))
      .catch(() => toast.error("Failed to load flows."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleCreate() {
    if (!name.trim() || categories.length === 0) {
      toast.error("Flow name and at least one category are required.");
      return;
    }
    setCreating(true);
    try {
      await createWhatsAppFlow({ name: name.trim(), categories });
      toast.success("Flow created as draft.");
      setName(""); setCategories([]);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create flow.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveJson(flowId: string) {
    const json = jsonDrafts[flowId];
    if (!json?.trim()) { toast.error("Paste the Flow JSON first."); return; }
    setBusyId(flowId);
    try {
      await updateWhatsAppFlowJson(flowId, json);
      toast.success("Flow JSON saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save Flow JSON.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublish(flowId: string) {
    setBusyId(flowId);
    try {
      await publishWhatsAppFlow(flowId);
      toast.success("Flow published.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to publish flow.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(flowId: string) {
    setBusyId(flowId);
    try {
      await deleteWhatsAppFlow(flowId);
      toast.success("Flow deleted.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete flow.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <h2 className="font-semibold">New Flow</h2>
          <div>
            <Label htmlFor="flow-name">Name</Label>
            <Input id="flow-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Volunteer Signup" />
          </div>
          <div>
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {FLOW_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${categories.includes(cat) ? "bg-primary text-primary-foreground border-primary" : "bg-transparent"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create draft flow
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading flows…</p>
      ) : flows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flows yet.</p>
      ) : (
        <div className="space-y-3">
          {flows.map((f) => (
            <Card key={f.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.id}</p>
                  </div>
                  <Badge variant={statusVariant(f.status)}>{f.status}</Badge>
                </div>
                <Textarea
                  placeholder="Paste Flow JSON here"
                  rows={6}
                  value={jsonDrafts[f.id] ?? ""}
                  onChange={(e) => setJsonDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={busyId === f.id} onClick={() => handleSaveJson(f.id)} className="gap-1.5">
                    <Upload className="h-4 w-4" /> Save JSON
                  </Button>
                  <Button size="sm" disabled={busyId === f.id} onClick={() => handlePublish(f.id)} className="gap-1.5">
                    <Rocket className="h-4 w-4" /> Publish
                  </Button>
                  {f.status?.toUpperCase() === "DRAFT" && (
                    <Button variant="outline" size="sm" disabled={busyId === f.id} onClick={() => handleDelete(f.id)} className="gap-1.5">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Message Log ───────────────────────────────────────────────────────────────

function MessageLogTab() {
  const [messages, setMessages] = useState<WhatsAppMessageLog[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWhatsAppMessages(page)
      .then((res) => { setMessages(res.content ?? []); setTotalPages(res.totalPages ?? 0); })
      .catch(() => toast.error("Failed to load message log."))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <p className="text-sm text-muted-foreground mt-4">Loading…</p>;

  return (
    <div className="mt-4 space-y-3">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-4">Direction</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Type / Template</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{m.direction}</td>
                  <td className="py-2 pr-4">{m.phoneNumber}</td>
                  <td className="py-2 pr-4">{m.templateName ?? m.messageType}</td>
                  <td className="py-2 pr-4"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                  <td className="py-2 pr-4">{new Date(m.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
