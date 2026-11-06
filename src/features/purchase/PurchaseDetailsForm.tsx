"use client";

import { useRef, useState, type ReactNode } from "react";
import { Camera, FileText, Loader2, Upload } from "lucide-react";
import type { PurchaseDetailsView } from "@/lib/api";

const input = "w-full min-h-12 rounded-xl border border-[#C9D0DB] bg-white px-3.5 py-2 text-base text-stone-900 focus:border-[var(--ck-role-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-100 sm:text-[15px]";
const primary = "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[var(--ck-role-accent)] px-7 py-2 text-[16px] font-extrabold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60";
const secondary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C9D0DB] bg-white px-4 py-2 text-[15px] font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-transparent dark:text-stone-200 dark:hover:bg-zinc-800";

/** What the donor actually bought, as the form hands it back. */
export type PurchaseFormValues = {
  itemName: string; brand?: string; model?: string; actualPrice: number;
  purchasedQuantity: number; quantity: number; retailer: string; purchasedOn: string; notes?: string;
  photo: File | null; receipt: File | null;
};

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">
        {label}{required ? <span className="text-red-600" aria-hidden> *</span> : <span className="font-semibold text-stone-500"> (optional)</span>}
      </span>
      {children}
      {hint && <span className="block text-[13px] text-stone-500 dark:text-stone-400">{hint}</span>}
    </label>
  );
}

function FilePick({ label, hint, accept, file, onPick, icon }: {
  label: string; hint: string; accept: string; file: File | null; onPick: (f: File | null) => void; icon: ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">{label}</span>
      <span className="block text-[13px] text-stone-500 dark:text-stone-400">{hint}</span>
      <input ref={ref} type="file" accept={accept} className="sr-only" aria-label={label}
        onChange={e => { onPick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={secondary} onClick={() => ref.current?.click()}>
          {icon} {file ? "Change file" : "Choose file"}
        </button>
        {file && (
          <>
            <span className="max-w-[16rem] truncate text-sm text-stone-600 dark:text-stone-300">{file.name}</span>
            <button type="button" className="min-h-11 text-sm font-bold text-stone-500 underline" onClick={() => onPick(null)}>Remove</button>
          </>
        )}
      </div>
    </div>
  );
}

const today = () => new Date().toLocaleDateString("en-CA");

/**
 * "Tell us what you purchased" — buy and hand over, after buying.
 *
 * <p>The actual item replaces the proposal for the record, and may differ from
 * it: the recipient accepted the donor's commitment, not a product, so a
 * different brand or model goes to our team to verify and never back to the
 * recipient. `edit` reuses it when our team asks for more information; the photo
 * is then optional (the earlier one stays unless replaced).
 */
export function PurchaseDetailsForm({
  mode, acceptedQuantity, heldQuantity, acceptedAt, defaults, busy, onSubmit,
}: {
  mode: "new" | "edit";
  acceptedQuantity: number;
  /** The most that can be donated now; a correction cannot reclaim units already released. */
  heldQuantity: number;
  acceptedAt: string | null;
  defaults: Partial<PurchaseDetailsView> & { itemName?: string | null };
  busy: boolean;
  onSubmit: (values: PurchaseFormValues) => Promise<boolean>;
}) {
  const [itemName, setItemName] = useState(defaults.actualItemName ?? defaults.itemName ?? "");
  const [brand, setBrand] = useState(defaults.actualBrand ?? defaults.plannedBrand ?? "");
  const [model, setModel] = useState(defaults.actualModel ?? defaults.plannedModel ?? "");
  const [noBrand, setNoBrand] = useState(mode === "edit" && !defaults.actualBrand && !defaults.actualModel);
  const [price, setPrice] = useState(defaults.actualPrice != null ? String(defaults.actualPrice) : "");
  const [bought, setBought] = useState(String(defaults.purchasedQuantity ?? acceptedQuantity));
  const [donated, setDonated] = useState(String(mode === "edit" ? heldQuantity : acceptedQuantity));
  const [store, setStore] = useState(defaults.intendedStore ?? "");
  const [date, setDate] = useState(defaults.purchasedOn ?? today());
  const [notes, setNotes] = useState(defaults.purchaseNotes ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [paid, setPaid] = useState(mode === "edit");

  const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  const boughtN = int(bought), donatedN = int(donated), priceN = Number(price.trim());
  const earliest = acceptedAt ? acceptedAt.slice(0, 10) : undefined;
  const cap = Math.min(heldQuantity, Number.isNaN(boughtN) ? heldQuantity : boughtN);

  let error: string | null = null;
  if (!itemName.trim()) error = "Tell us what you bought.";
  else if (!noBrand && (!brand.trim() || !model.trim())) error = "Enter the brand and model, or tick that the item has none.";
  else if (!(priceN > 0)) error = "Enter the price you paid.";
  else if (!(boughtN >= 1)) error = "Enter how many you bought.";
  else if (!(donatedN >= 1 && donatedN <= cap)) error = `You can donate 1 to ${cap} here${cap < heldQuantity ? " (you can't donate more than you bought)" : ""}.`;
  else if (!store.trim()) error = "Enter the store or seller.";
  else if (!date || date > today() || (earliest && date < earliest)) error = "Enter the date you bought it (from the day the recipient accepted, up to today).";
  else if (mode === "new" && !photo) error = "Add a clear photo of the item you bought.";
  else if (!paid) error = "Confirm you paid for it yourself in full.";

  const short = !Number.isNaN(donatedN) && donatedN < acceptedQuantity;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Item purchased" required>
            <input className={input} value={itemName} maxLength={200} onChange={e => setItemName(e.target.value)} placeholder="e.g. Laptop" />
          </Field>
        </div>
        <Field label="Brand" required={!noBrand}>
          <input className={input} value={brand} maxLength={100} disabled={noBrand} onChange={e => setBrand(e.target.value)} />
        </Field>
        <Field label="Model / variant" required={!noBrand}>
          <input className={input} value={model} maxLength={100} disabled={noBrand} onChange={e => setModel(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="size-4" checked={noBrand} onChange={e => setNoBrand(e.target.checked)} />
          This item has no brand or model (for example, a generic or handmade item)
        </label>
        <Field label="Price you paid" required hint="For the whole purchase, in rupees. Only you and our team see it.">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">₹</span>
            <input className={`${input} pl-7`} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </Field>
        <Field label="Store or seller" required>
          <input className={input} value={store} maxLength={200} onChange={e => setStore(e.target.value)} placeholder="Shop name, or Amazon, Flipkart…" />
        </Field>
        <Field label="Quantity purchased" required hint="Everything you bought, even units you keep.">
          <input className={input} inputMode="numeric" value={bought} onChange={e => setBought(e.target.value)} />
        </Field>
        <Field label="Quantity donated to this recipient" required hint={`The recipient accepted ${acceptedQuantity}.`}>
          <input className={input} inputMode="numeric" value={donated} onChange={e => setDonated(e.target.value)} />
        </Field>
        <Field label="Purchase date" required>
          <input type="date" className={input} value={date} max={today()} min={earliest} onChange={e => setDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Additional details">
            <textarea rows={2} className={input} value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} placeholder="Colour, size, warranty…" />
          </Field>
        </div>
      </div>
      {short && (
        <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          You&apos;re donating {donatedN} of the {acceptedQuantity} accepted. The other {acceptedQuantity - donatedN} go back to the request so another donor can cover them.
        </p>
      )}
      <FilePick label={mode === "new" ? "Photo of the item you bought *" : "New photo of the item (optional)"}
        hint={mode === "new" ? "Required. A clear, recent photo of the actual item, not a product image from a website." : "Only if our team asked for a new photo; otherwise the earlier one stays."}
        accept="image/*" file={photo} onPick={setPhoto} icon={<Camera className="size-4" aria-hidden />} />
      <FilePick label="Receipt or invoice (optional, private)" hint="Only our team sees it — never the recipient. Hide payment card details."
        accept="image/*,application/pdf" file={receipt} onPick={setReceipt} icon={<FileText className="size-4" aria-hidden />} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 size-4 shrink-0" checked={paid} onChange={e => setPaid(e.target.checked)} />
        <span>I paid for this myself in full. The recipient pays nothing.</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button type="button" className={primary} disabled={!!error || busy}
        onClick={() => void onSubmit({
          itemName: itemName.trim(), ...(noBrand ? {} : { brand: brand.trim(), model: model.trim() }),
          actualPrice: priceN, purchasedQuantity: boughtN, quantity: donatedN, retailer: store.trim(), purchasedOn: date,
          ...(notes.trim() ? { notes: notes.trim() } : {}), photo, receipt,
        })}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {mode === "new" ? "Send for verification" : "Send the updated details"}
      </button>
    </div>
  );
}
