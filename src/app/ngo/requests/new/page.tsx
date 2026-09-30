import { redirect } from "next/navigation";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { ALL_REQUEST_CATEGORIES } from "@/lib/categoryVisuals";
import { createItemRequestDraft, getMyItemRequests, updateItemRequestDraft, submitItemRequestDraft, type UpdateRequestPayload } from "@/lib/api";
import { toast } from "@/lib/toast";

const input = "mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button = "rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700";
const blank = { title: "", category: "", quantity: "1", urgency: "NORMAL", city: "", pincode: "", description: "", latitude: "", longitude: "" };

export default function NgoNewRequestPage() {
  return <Suspense fallback={<p className="p-8" role="status">Loading request…</p>}><NgoRequestForm /></Suspense>;
}

function NgoRequestForm() {
  const { user, isLoading: authLoading } = useAuth();
  const status = useNgoStatus();
  const router = useRouter();
  const params = useSearchParams();
  const draftParam = params.get("draft");
  const [form, setForm] = useState(() => ({ ...blank, category: ALL_REQUEST_CATEGORIES.find(c => c === params.get("category")) || "" }));
  const [draftId, setDraftId] = useState<number | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!draftParam);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login?next=%2Fngo%2Frequests%2Fnew");
    else if (!["NGO", "NGO_PARTNER"].includes(user.role?.toUpperCase() || "")) router.replace("/requests");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!draftParam || !user) return;
    let active = true;
    setLoadingDraft(true); setLoadError("");
    getMyItemRequests().then(requests => {
      if (!active) return;
      const draft = requests.find(r => r.id === Number(draftParam) && r.status === "DRAFT");
      if (!draft) { setLoadError("This draft is unavailable or has already been submitted. Open your request list to continue."); return; }
      setDraftId(draft.id);
      setForm({ title: draft.title === "Draft" ? "" : draft.title, category: draft.category, quantity: String(draft.quantity),
        urgency: draft.urgency, city: draft.city, pincode: draft.pincode || "", description: draft.description || "",
        latitude: draft.latitude == null ? "" : String(draft.latitude), longitude: draft.longitude == null ? "" : String(draft.longitude) });
    }).catch(e => { if (active) setLoadError(e instanceof Error ? e.message : "We could not load your draft."); })
      .finally(() => { if (active) setLoadingDraft(false); });
    return () => { active = false; };
  }, [draftParam, user]);

  function update(key: keyof typeof blank, value: string) { setForm(previous => ({ ...previous, [key]: value })); }
  function locate() {
    if (!navigator.geolocation) { setError("Location is unavailable here. You can enter the coordinates below."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(position => {
      setForm(previous => ({ ...previous, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
      setLocating(false);
    }, () => { setLocating(false); setError("We could not get your location. Please enter the coordinates or try again."); }, { timeout: 12000 });
  }
  async function save(submit: boolean) {
    if (saving.current) return;
    if (!status.canPostRequest) { setError(status.lockReason); return; }
    const lat = Number(form.latitude), lng = Number(form.longitude), quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) { setError("Please enter a whole quantity of at least one."); return; }
    const hasLocation = form.latitude.trim() !== "" && form.longitude.trim() !== "";
    if ((submit || draftId !== null || form.latitude || form.longitude) && (!hasLocation || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)) {
      setError("Please provide a valid latitude and longitude for the delivery area."); return;
    }
    if (submit && (form.title.trim().length < 3 || !form.category || !form.city.trim() || !form.description.trim())) {
      setError("Please add the item, category, city and how your organization will use it."); return;
    }
    saving.current = true; setBusy(true); setError("");
    try {
      let id = draftId;
      if (!id) { const created = await createItemRequestDraft(); id = created.id; setDraftId(id); }
      const payload: UpdateRequestPayload = { title: form.title.trim() || "Draft", category: form.category,
        quantity, urgency: form.urgency, city: form.city.trim(), pincode: form.pincode.trim(), description: form.description.trim(),
        ...(hasLocation ? { latitude: lat, longitude: lng } : {}) };
      await updateItemRequestDraft(id, payload);
      if (submit) {
        await submitItemRequestDraft(id);
        toast.success("Thank you. Your organization's request is with our team for review.");
        window.dispatchEvent(new Event("ngo-activity-updated"));
        router.push("/ngo/requests");
      } else {
        toast.success("Your draft is saved. You can return to it from your requests.");
        router.replace(`/ngo/requests/new?draft=${id}`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "We could not save your request. Your entries are still here."); }
    finally { saving.current = false; setBusy(false); }
  }

  if (authLoading || status.isLoading || loadingDraft) return <p className="p-8" role="status">Loading your NGO request…</p>;
  if (!user) return null;
  if (loadError) return <main className="mx-auto max-w-xl space-y-4 p-8"><p role="alert">{loadError}</p><button className={button} onClick={() => window.location.reload()}>Retry</button><Link className="ml-4 underline" href="/ngo/requests">Your requests</Link></main>;
  if (!status.canPostRequest) return <main className="mx-auto max-w-xl space-y-4 p-8">
    <h1 className="text-2xl font-bold">Before you post a request</h1><p role={status.error ? "alert" : "status"}>{status.lockReason}</p>
    {status.error ? <button className={button} onClick={() => void status.refresh()}>Retry</button>
      : <Link className="underline" href={status.isPhotosDue ? "/ngo/handovers" : "/profile/ngo-details"}>{status.isPhotosDue ? "Complete your handover photos" : "View your application"}</Link>}
  </main>;

  return <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-zinc-950 sm:px-8"><div className="mx-auto max-w-2xl space-y-6">
    <Link href="/ngo/requests" className="text-sm underline">Back to your requests</Link>
    <header><h1 className="text-3xl font-bold">What does your organization need?</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Tell us what will help and how it will be used. Our team reviews each need, then looks for a private donor match before publishing it.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <form className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7" onSubmit={e => { e.preventDefault(); void save(true); }}>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <label className="block text-sm font-semibold">Item needed<input className={input} required minLength={3} maxLength={120} value={form.title} onChange={e => update("title", e.target.value)} placeholder="For example, school bags for our learning centre" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Category<select className={input} required value={form.category} onChange={e => update("category", e.target.value)}><option value="">Choose a category</option>{ALL_REQUEST_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="block text-sm font-semibold">Quantity<input className={input} type="number" min={1} step={1} required value={form.quantity} onChange={e => update("quantity", e.target.value)} /></label>
        </div>
        <label className="block text-sm font-semibold">Urgency<select className={input} value={form.urgency} onChange={e => update("urgency", e.target.value)}><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
        <label className="block text-sm font-semibold">How will these items help?<textarea className={input} rows={5} required maxLength={2000} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Explain the intended use, who will benefit and any item specifications. Avoid including private beneficiary information." /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">City<input className={input} required maxLength={100} value={form.city} onChange={e => update("city", e.target.value)} /></label>
          <label className="block text-sm font-semibold">Postal code (optional)<input className={input} maxLength={10} value={form.pincode} onChange={e => update("pincode", e.target.value)} /></label>
        </div>
        <div className="space-y-3"><h2 className="font-semibold">Delivery area</h2><p className="text-sm text-stone-500">Choose a location where your organization can receive items. Location is requested only when you press the button.</p>
          <button type="button" className={button} disabled={locating} onClick={locate}>{locating ? "Getting location…" : "Use my current location"}</button>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Latitude<input className={input} type="number" step="any" min={-90} max={90} required value={form.latitude} onChange={e => update("latitude", e.target.value)} /></label><label className="text-sm">Longitude<input className={input} type="number" step="any" min={-180} max={180} required value={form.longitude} onChange={e => update("longitude", e.target.value)} /></label></div>
        </div>
        <div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => void save(false)}>Save draft</button><button type="submit" className={`${button} bg-ngo-700 text-white`}>{busy ? "Saving…" : "Submit for review"}</button></div>
      </fieldset>
    </form>
  </div></main>;
}
