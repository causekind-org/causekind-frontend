"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmAssignContact, crmClearDoNotCall, crmListContacts, crmListStaff, crmRevealPhone, crmSetDoNotCall,
  type CrmCallPurpose, type CrmContact, type CrmRole, type CrmStaff, type SaPage,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, PhoneOff } from "lucide-react";

const ROLE_FILTERS: { label: string; value: CrmRole | null }[] = [
  { label: "All", value: null },
  { label: "Donors", value: "DONOR" },
  { label: "Donees", value: "DONEE" },
];

type ReasonPrompt = { userId: number; clearing: boolean };

/** The staff call list: registered donors and donees, masked until a logged reveal. */
export function CrmContactsPanel({ canManage }: { canManage: boolean }) {
  const [role, setRole] = useState<CrmRole | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [noRequest, setNoRequest] = useState(false);
  const [unassigned, setUnassigned] = useState(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SaPage<CrmContact> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<CrmStaff[]>([]);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [purposes, setPurposes] = useState<Record<number, CrmCallPurpose>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<ReasonPrompt | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => { setName(nameInput); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    crmListContacts({ role, name, noRequest, unassigned, page })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the call list."))
      .finally(() => setLoading(false));
  }, [role, name, noRequest, unassigned, page]);

  useEffect(load, [load]);

  useEffect(() => {
    if (canManage) crmListStaff().then(setStaff).catch(() => {});
  }, [canManage]);

  async function reveal(userId: number) {
    const purpose = purposes[userId];
    if (!purpose) return;
    setBusyId(userId);
    try {
      const { phone } = await crmRevealPhone(userId, purpose);
      setRevealed((prev) => ({ ...prev, [userId]: phone }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reveal this number.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveReason() {
    if (!prompt || !reason.trim()) return;
    const { userId, clearing } = prompt;
    setBusyId(userId);
    try {
      await (clearing ? crmClearDoNotCall(userId, reason.trim()) : crmSetDoNotCall(userId, reason.trim()));
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setPrompt(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusyId(null);
    }
  }

  async function assign(userId: number, ownerUserId: number | null) {
    setBusyId(userId);
    try {
      await crmAssignContact(userId, ownerUserId);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign this contact.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map((f) => (
          <Button key={f.label} size="sm" variant={role === f.value ? "default" : "outline"}
            onClick={() => { setRole(f.value); setPage(0); }}>
            {f.label}
          </Button>
        ))}
        <Input className="w-full sm:w-56" placeholder="Search by name" aria-label="Search by name"
          value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={noRequest}
            onChange={(e) => { setNoRequest(e.target.checked); setPage(0); }} />
          Never created a request
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={unassigned}
            onChange={(e) => { setUnassigned(e.target.checked); setPage(0); }} />
          Unassigned
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      )}
      {data && data.items.length === 0 && !loading && (
        <p className="py-10 text-center text-sm text-muted-foreground">No contacts match these filters.</p>
      )}

      {data?.items.map((c) => (
        <Card key={c.userId}>
          <CardContent className="space-y-2 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.maskedPhone, c.maskedEmail, c.city].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{c.role === "DONOR" ? "Donor" : "Donee"}</Badge>
                {c.role === "DONEE" && !c.hasRequest && <Badge variant="outline">Never created a request</Badge>}
                {c.doNotCall && <Badge variant="destructive">Do not call</Badge>}
              </div>
            </div>

            {c.doNotCall && c.doNotCallReason && (
              <p className="text-xs text-muted-foreground">Reason: {c.doNotCallReason}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!c.doNotCall && (revealed[c.userId] ? (
                <a className="inline-flex items-center gap-1.5 text-sm font-medium underline" href={`tel:${revealed[c.userId]}`}>
                  <Phone className="size-4" aria-hidden /> {revealed[c.userId]}
                </a>
              ) : (
                <>
                  <select aria-label={`Why are you calling ${c.fullName}?`} className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={purposes[c.userId] ?? ""}
                    onChange={(e) => setPurposes((prev) => ({ ...prev, [c.userId]: e.target.value as CrmCallPurpose }))}>
                    <option value="" disabled>Call purpose</option>
                    <option value="SUPPORT">Support</option>
                    <option value="ONBOARDING">Onboarding</option>
                    {c.role === "DONOR" && <option value="FUNDRAISING" disabled>Fundraising (needs calling basis)</option>}
                  </select>
                  <Button size="sm" disabled={!purposes[c.userId] || busyId === c.userId} onClick={() => reveal(c.userId)}>
                    <Phone className="size-4" aria-hidden /> Call
                  </Button>
                </>
              ))}
              {!c.doNotCall && (
                <Button size="sm" variant="outline" onClick={() => { setPrompt({ userId: c.userId, clearing: false }); setReason(""); }}>
                  <PhoneOff className="size-4" aria-hidden /> Do not call
                </Button>
              )}
              {c.doNotCall && canManage && (
                <Button size="sm" variant="outline" onClick={() => { setPrompt({ userId: c.userId, clearing: true }); setReason(""); }}>
                  Clear do not call
                </Button>
              )}
              {canManage ? (
                <select aria-label={`Owner of ${c.fullName}`} className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={c.ownerUserId ?? ""} disabled={busyId === c.userId}
                  onChange={(e) => assign(c.userId, e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              ) : (
                <span className="text-xs text-muted-foreground">{c.ownerName ?? "Unassigned"}</span>
              )}
            </div>

            {prompt?.userId === c.userId && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="w-full sm:w-80" maxLength={500} value={reason} autoFocus
                  aria-label="Reason" placeholder={prompt.clearing ? "Why can we call again?" : "What did they say?"}
                  onChange={(e) => setReason(e.target.value)} />
                <Button size="sm" disabled={!reason.trim() || busyId === c.userId} onClick={saveReason}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setPrompt(null)}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {data.page + 1} of {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={!data.hasNext} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
