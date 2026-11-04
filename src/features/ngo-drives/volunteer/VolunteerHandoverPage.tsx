"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, MapPin, Phone, Send } from "lucide-react";
import { ApiError, volunteerHandover, type VolunteerChatMessage, type VolunteerHandoverView } from "@/lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhotoCaptureDialog } from "@/features/ngo-drives/components/PhotoCaptureDialog";

const STORAGE_KEY = "ck_volunteer_token";
const DETAILS_POLL_MS = 10_000;
const CHAT_POLL_MS = 5_000;
const primary = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--handover-accent)] px-4 text-sm font-semibold text-[var(--handover-on-accent)] hover:bg-[var(--handover-accent-hover)] disabled:opacity-50";
const secondary = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-800 dark:border-zinc-700 dark:text-stone-100";
const panel = "rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900";

const isDeadLink = (e: unknown) => e instanceof ApiError && (e.status === 401 || e.status === 410);
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Handover times are Indian local times, sent with no zone. */
export function formatPickupTime(value: string): string {
  const d = new Date(`${value.replace(/Z$/, "")}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(d)} IST`;
}

/** Takes the token from the link's #fragment, removes it from the URL, and keeps it for this tab's refreshes. */
function readToken(): string | null {
  const fromHash = window.location.hash.replace(/^#/, "");
  if (fromHash) {
    window.history.replaceState(null, "", window.location.pathname);
    try { sessionStorage.setItem(STORAGE_KEY, fromHash); } catch { /* memory only */ }
    return fromHash;
  }
  try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main data-ck-role-theme="ngo" className="handover-ngo-drive min-h-[100dvh] bg-[var(--background)] text-stone-900 dark:text-stone-100">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-4">
        <header className="flex items-center gap-2 border-b border-stone-200 pb-3 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element -- plain logo, no site chrome here */}
          <img src="/logo-filled.webp" alt="" width={28} height={28} className="size-7" />
          <span className="font-serif text-lg font-bold">CauseKind</span>
        </header>
        {children}
      </div>
    </main>
  );
}

export function VolunteerHandoverPage() {
  const tokenRef = useRef<string | null>(null);
  const ngoNameRef = useRef<string | null>(null);
  const [view, setView] = useState<VolunteerHandoverView | null>(null);
  const [dead, setDead] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fail = useCallback((e: unknown) => {
    tokenRef.current = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
    setView(null);
    const fromApi = e instanceof ApiError && e.message.startsWith("This link is no longer active") ? e.message : null;
    setDead(fromApi ?? `This link is no longer active. Ask ${ngoNameRef.current ?? "the NGO"} for a new one.`);
  }, []);

  const load = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const next = await volunteerHandover.details(token);
      ngoNameRef.current = next.ngoName;
      setView(next);
      setLoadError(false);
    } catch (e) {
      if (isDeadLink(e)) fail(e);
      else setLoadError(true); // a poll failing keeps what is on screen
    }
  }, [fail]);

  useEffect(() => {
    if (!tokenRef.current) tokenRef.current = readToken();
    if (!tokenRef.current) { fail(null); return; }
    void load();
  }, [fail, load]);

  const completed = view?.completed === true;
  useEffect(() => {
    if (completed || dead) return;
    const t = setInterval(() => { if (!document.hidden) void load(); }, DETAILS_POLL_MS);
    return () => clearInterval(t);
  }, [completed, dead, load]);

  if (dead) {
    return <Shell><p data-testid="volunteer-dead" role="alert" className={`${panel} text-sm`}>{dead}</p></Shell>;
  }
  if (!view) {
    if (loadError) {
      return (
        <Shell>
          <div className={`${panel} space-y-3`}>
            <p role="alert" className="text-sm">We couldn&apos;t load this pickup. Check your connection.</p>
            <button type="button" className={primary} onClick={() => void load()}>Try again</button>
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <div data-testid="volunteer-loading" aria-busy="true" className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200 dark:bg-zinc-800" />)}
        </div>
      </Shell>
    );
  }
  if (view.completed) {
    return (
      <Shell>
        <section data-testid="volunteer-complete" className={`${panel} space-y-3 text-center`}>
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"><Check className="size-6" aria-hidden /></span>
          <h1 className="font-serif text-xl font-bold">Handover complete, thank you</h1>
          <p className="text-sm">{view.confirmedQuantity} × {view.itemName} for {view.ngoName}</p>
          {view.photoUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage link
            <img key={url} src={url} alt="Handover" className="w-full rounded-lg object-cover" />
          ))}
        </section>
      </Shell>
    );
  }

  const token = tokenRef.current ?? "";
  return (
    <Shell>
      <section className={`${panel} space-y-2`}>
        <p className="text-xs text-stone-600 dark:text-stone-300">{view.ngoName}</p>
        <h1 className="break-words font-serif text-xl font-bold">{view.driveTitle}</h1>
        <dl className="space-y-1 text-sm">
          <div><dt className="inline font-semibold">When: </dt><dd className="inline" data-testid="volunteer-when">{formatPickupTime(view.pickupAt)}</dd></div>
          <div><dt className="inline font-semibold">Donor: </dt><dd className="inline">{view.donorFirstName}</dd></div>
          <div><dt className="inline font-semibold">Address: </dt><dd className="inline break-words">{view.address}</dd></div>
          <div><dt className="inline font-semibold">Items: </dt><dd className="inline">{view.itemName} × {view.quantity}</dd></div>
          {view.donorNotes && <div><dt className="inline font-semibold">Donor&apos;s notes: </dt><dd className="inline break-words">{view.donorNotes}</dd></div>}
        </dl>
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <a href={view.directionsUrl} target="_blank" rel="noreferrer noopener" className={secondary}><MapPin className="size-4" aria-hidden />Open in Google Maps</a>
          {view.donorPhone && <a href={`tel:${view.donorPhone}`} className={secondary}><Phone className="size-4" aria-hidden />Call donor</a>}
        </div>
      </section>

      {view.codeConfirmed
        ? <PhotoStep token={token} view={view} onChanged={load} onDead={fail} />
        : <CodeStep token={token} view={view} onConfirmed={setView} onDead={fail} />}

      <ChatPanel token={token} donorName={view.donorFirstName} />
    </Shell>
  );
}

function CodeStep({ token, view, onConfirmed, onDead }: {
  token: string; view: VolunteerHandoverView; onConfirmed: (v: VolunteerHandoverView) => void; onDead: (e: unknown) => void;
}) {
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(String(view.quantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qtyNum = Number(qty);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1 && (view.quantity === 0 || qtyNum <= view.quantity);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onConfirmed(await volunteerHandover.confirmCode(token, code, qtyNum));
    } catch (e) {
      if (isDeadLink(e)) onDead(e);
      else { setError(errorText(e, "We couldn't confirm the code.")); setCode(""); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="volunteer-code-step" className={`${panel} space-y-3`}>
      <h2 className="text-sm font-bold">Step 1: Enter the donor&apos;s code</h2>
      <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy} aria-label="Six digit handover code">
        <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
      </InputOTP>
      <p className="text-xs text-stone-600 dark:text-stone-300">Ask the donor for the 6-digit code on their screen.</p>
      <label className="block text-sm font-medium">
        Quantity received (offered {view.quantity})
        <input type="number" inputMode="numeric" min={1} max={view.quantity || undefined} value={qty} disabled={busy} onChange={(e) => setQty(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" className={primary} disabled={busy || !/^\d{6}$/.test(code) || !qtyValid} onClick={() => void submit()}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}Confirm code
      </button>
    </section>
  );
}

function PhotoStep({ token, view, onChanged, onDead }: {
  token: string; view: VolunteerHandoverView; onChanged: () => Promise<void>; onDead: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insecure = typeof window !== "undefined" && !window.isSecureContext;

  const upload = async (file: File) => {
    setOpen(false);
    setBusy(true);
    setError(null);
    try {
      await volunteerHandover.addPhoto(token, file);
      await onChanged();
    } catch (e) {
      // Someone else's photo may have just completed it: the details say which.
      if (isDeadLink(e)) {
        if (e instanceof ApiError && e.message.startsWith("This link is no longer active")) onDead(e);
        else await onChanged();
      } else setError(errorText(e, "We couldn't upload that photo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="volunteer-photo-step" className={`${panel} space-y-3`}>
      <h2 className="text-sm font-bold">Step 2: Take a photo of the items</h2>
      <p className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
        <Check className="size-4 shrink-0" aria-hidden />
        {view.codeConfirmedByNgo ? "Code already confirmed by the NGO" : `Code confirmed (${view.confirmedQuantity})`}
      </p>
      {insecure && <p className="text-xs text-amber-700 dark:text-amber-300">The camera needs a secure (HTTPS) page. Open the link from your email again.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" className={primary} disabled={busy} onClick={() => setOpen(true)}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}Take photo
      </button>
      <PhotoCaptureDialog open={open} onCancel={() => setOpen(false)} onCaptured={(file) => void upload(file)}
        unavailableMessage={`Allow camera access in your browser settings and reload. If it still doesn't work, ask ${view.ngoName} to add the photo.`} />
    </section>
  );
}

function ChatPanel({ token, donorName }: { token: string; donorName: string }) {
  const [messages, setMessages] = useState<VolunteerChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setMessages(await volunteerHandover.chat(token)); } catch { /* the details poll handles a dead link */ }
  }, [token]);

  useEffect(() => {
    void load();
    const t = setInterval(() => { if (!document.hidden) void load(); }, CHAT_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const sent = await volunteerHandover.sendChat(token, text.trim());
      setMessages((cur) => [...cur, sent]);
      setText("");
    } catch (e) {
      setError(errorText(e, "We couldn't send that message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <section data-testid="volunteer-chat" className={`${panel} space-y-3`}>
      <h2 className="text-sm font-bold">Chat with {donorName}</h2>
      <ul className="max-h-64 space-y-2 overflow-y-auto" aria-live="polite">
        {messages.length === 0 && <li className="text-sm text-stone-600 dark:text-stone-300">No messages yet.</li>}
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%]">
              <p className={`mb-0.5 text-xs text-stone-600 dark:text-stone-300 ${m.mine ? "text-right" : ""}`}>{m.mine ? "You" : m.senderName}</p>
              <p className={`break-words rounded-lg px-3 py-2 text-sm ${m.mine ? "bg-[var(--handover-accent)] text-[var(--handover-on-accent)]" : "bg-stone-100 dark:bg-zinc-800"}`}>{m.content}</p>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void send(); }}>
        <input aria-label="Message to the donor" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message"
          className="h-11 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        <button type="submit" aria-label="Send" disabled={sending || !text.trim()}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--handover-accent)] text-[var(--handover-on-accent)] disabled:opacity-50">
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </button>
      </form>
    </section>
  );
}
