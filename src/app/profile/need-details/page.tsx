"use client";

import { ProfileDocumentCard } from "./ProfileDocumentCard";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDoneeNeedProfile, saveDoneeNeedProfile, importPreviousNeedProfile, uploadNeedProfileDocument, deleteNeedProfileDocument, type DoneeNeedProfile, type RequestVerification, type VerificationDocumentType } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { NEED_PROFILE_DOCS, needProfileItemLabel, progressOf } from "@/lib/needProfileDocs";

const GROUPS: {title: string; blurb: string; fields: {key: keyof RequestVerification; label: string; type?: "number" | "text" | "textarea"; required?: boolean; max?: number}[]}[] = [
  {title: "Household & housing", blurb: "Saved once and reused on every request you make, so you never type it twice.", fields: [
    {key:"householdSize",label:"People in home",type:"number",required:true,max:1000},
    {key:"dependents",label:"People who cannot earn",type:"number",required:true,max:1000},
    {key:"age",label:"Your age",type:"number",required:true,max:120},
    {key:"gender",label:"Gender (optional)",max:20},
    {key:"landlordNameContact",label:"Landlord contact, if applicable",max:200},
    {key:"addressLandmark",label:"Address / landmark",max:300},
  ]},
  {title: "Financial situation", blurb: "Our team reads this to understand why buying the item yourself is out of reach.", fields: [
    {key:"monthlyIncome",label:"Monthly household income (₹)",type:"number",required:true,max:1000000000},
    {key:"incomeSource",label:"Income source (write none if not earning)",required:true,max:200},
    {key:"supportingInstitution",label:"Supporting institution, if any",max:200},
    {key:"reasonCannotBuy",label:"Why you need financial support",type:"textarea",required:true,max:10000},
  ]},
  {title: "Your situation", blurb: "Optional, but it is what turns a form into a person for whoever reviews your request.", fields: [
    {key:"beneficiaryDetails",label:"Your own health or personal circumstances",type:"textarea",max:500},
    {key:"medicalCondition",label:"Medical condition, if applicable",type:"textarea",max:10000},
    {key:"detailedStory",label:"Background you want our team to understand",type:"textarea",max:10000},
    {key:"mapsPin",label:"Optional Google Maps link for your residence",max:300},
  ]},
  {title: "References & contacts", blurb: "Optional. Someone we can speak to, and a second way to reach you.", fields: [
    {key:"referrerName",label:"Independent reference name",max:150},
    {key:"referrerContact",label:"Reference phone, including country code",max:30},
    {key:"altContactName",label:"Alternate contact name",max:150},
    {key:"altContactPhone",label:"Alternate contact phone",max:30},
  ]},
];
const DOCS = NEED_PROFILE_DOCS;
const DOCS_STEP = GROUPS.length;
const STEPS = [...GROUPS.map(g => g.title), "Identity documents"];

export default function NeedProfilePage() { return <Suspense fallback={null}><NeedProfileEditor /></Suspense>; }
function NeedProfileEditor() {
  const {user,isLoading}=useAuth(); const router=useRouter(); const params=useSearchParams();
  const [profile,setProfile]=useState<DoneeNeedProfile|null>(null);
  const [details,setDetails]=useState<Partial<RequestVerification>>({});
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [dirty,setDirty]=useState(false);
  const [checking,setChecking]=useState<VerificationDocumentType|null>(null);
  const [uploadErrors,setUploadErrors]=useState<Partial<Record<VerificationDocumentType,string>>>({});
  // Every section stays mounted; only the active one is visible. Unmounting
  // would lose in-progress edits on every switch, and the page's tests drive a
  // household field and a document upload within one render.
  const [active,setActive]=useState(0);
  const next=params.get("next");
  // Allowlist, not a sanitiser: `next` is attacker-controllable, so only these
  // exact shapes round-trip. `category` comes from the donee-view tiles.
  const destination=next && /^\/requests\/new(?:\?(?:draftId=\d+|category=[A-Za-z0-9%_-]{1,60}))?$/.test(next) ? next : "/requests/new";
  function apply(p:DoneeNeedProfile) {setProfile(p);setDetails(p.details);setDirty(false);}
  async function load() {try {setError("");apply(await getDoneeNeedProfile());} catch(e) {setError(e instanceof Error?e.message:"Could not load your profile");}}
  useEffect(()=>{if(isLoading)return;if(!user){router.replace("/login?next=%2Fprofile%2Fneed-details");return;}void load();},[user,isLoading]);
  async function save(continueToRequest=false) {
    setBusy(true);
    try { const p=await saveDoneeNeedProfile(details); apply(p); toast.success("Profile saved");
      if(continueToRequest && p.complete) router.push(destination);
      else if(continueToRequest) toast.error("Please complete the items listed above before starting a request.");
    } catch(e){toast.error(e instanceof Error?e.message:"Could not save your profile");}finally{setBusy(false);}
  }
  async function upload(type:VerificationDocumentType,file:File) {
    if(file.size>10*1024*1024){toast.error("Please use a photo under 10 MB");return;}
    setBusy(true); setChecking(type); setUploadErrors(v=>({...v,[type]:undefined}));
    try {const doc=await uploadNeedProfileDocument(type,file);const p=await getDoneeNeedProfile();setProfile(p);
      if(doc.aiVerified===false) toast.error("Please replace this document. See the AI feedback below.");
      else toast.success(doc.aiVerified===true?"Saved ? AI screening passed":"Saved for admin review");}
    catch(e){const message=e instanceof Error?e.message:"Upload failed";setUploadErrors(v=>({...v,[type]:message}));toast.error(message);}
    finally{setBusy(false);setChecking(null);}
  }

  if(error)return <div className="mx-auto max-w-4xl p-6"><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry</Button><Link href="/profile">Back to profile</Link></div>;
  if(!profile)return <p className="p-8" role="status">Loading your request profile…</p>;

  const progress = progressOf(profile.missing);
  const remaining = profile.missing.length;

  return <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950">
    {/* Full-bleed: the rail sits flush to the viewport's left edge. Centring
        this wrapper left a strip of page background beside the rail, which read
        as a floating panel rather than the side of the page. The form keeps a
        max-width for line length but is left-aligned against the rail rather
        than centred in the remaining space, so the two read as one column. */}
    <div className="flex">

      {/* ── Readiness rail ────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 flex-col border-r border-stone-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-stone-200 px-7 pb-6 pt-8 dark:border-zinc-800">
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ck-role-accent)]"><ArrowLeft className="h-4 w-4" />Back to profile</Link>
          <div>
            <p className="text-3xs font-black uppercase tracking-[0.22em] text-stone-400">Request profile</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-[#1e3a60] dark:text-blue-200">Your readiness</h1>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-4xl font-black leading-none tabular-nums text-[var(--ck-role-accent)]">{progress.pct}%</span>
            <span className="text-xs font-semibold text-stone-500">{progress.done} of {progress.total} done</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-[var(--ck-role-accent)] transition-[width] duration-500" style={{width: `${progress.pct}%`}} />
          </div>
          <p className="text-xs leading-relaxed text-stone-500">
            {profile.complete ? "Everything is in. You can post a need now." : `${remaining} ${remaining===1?"item":"items"} left before you can post a need.`}
          </p>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto px-4 py-5">
          {STEPS.map((title,index)=>
            <button key={title} type="button" onClick={()=>setActive(index)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${index===active?"bg-stone-100 font-bold text-[#1e3a60] dark:bg-zinc-800 dark:text-blue-200":"font-semibold text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-zinc-800/60"}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-black ${index===active?"bg-[var(--ck-role-accent)] text-white":"border border-stone-300 text-stone-400 dark:border-zinc-600"}`}>{index+1}</span>
              {title}
            </button>
          )}
        </nav>

        {/* The truthful list: exactly what the server says is outstanding. */}
        {profile.missing.length>0 && <div className="mt-auto border-t border-stone-200 px-7 py-5 dark:border-zinc-800">
          <p className="text-3xs font-black uppercase tracking-[0.18em] text-stone-400">Still needed</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {profile.missing.map(m=><li key={m} className="flex items-start gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ck-role-accent)]" />{needProfileItemLabel(m)}
            </li>)}
          </ul>
        </div>}
      </aside>

      {/* ── Working pane ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile header: the rail collapses to a bar and a row of chips. */}
        <div className="border-b border-stone-200 bg-white px-5 py-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ck-role-accent)]"><ArrowLeft className="h-4 w-4" />Back to profile</Link>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-bold text-[#1e3a60] dark:text-blue-200">Your readiness</h1>
            <span className="text-2xl font-black tabular-nums text-[var(--ck-role-accent)]">{progress.pct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-[var(--ck-role-accent)] transition-[width] duration-500" style={{width: `${progress.pct}%`}} />
          </div>
          <p className="mt-2 text-xs text-stone-500">{profile.complete?"Everything is in.":`${remaining} ${remaining===1?"item":"items"} left.`}</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((title,index)=>
              <button key={title} type="button" onClick={()=>setActive(index)}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-2xs font-bold transition-colors ${index===active?"bg-[var(--ck-role-accent)] text-white":"border border-stone-300 text-stone-600 dark:border-zinc-600 dark:text-stone-300"}`}>{title}</button>
            )}
          </div>
        </div>

        <form onSubmit={e=>{e.preventDefault();void save();}} className="flex flex-1 flex-col">
          <fieldset disabled={busy} className="flex-1 px-5 py-8 sm:px-10">
            <div className="max-w-3xl">

              {GROUPS.map((group,index)=>
                <section key={group.title} className={index===active?"":"hidden"}>
                  <h2 className="text-2xl font-bold tracking-tight text-[#1e3a60] dark:text-blue-200">{group.title}</h2>
                  <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-stone-500">{group.blurb}</p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    {group.fields.map(field=><div key={field.key} className={field.type==="textarea"?"sm:col-span-2":""}>
                      <label className="mb-1.5 block text-2xs font-black uppercase tracking-wider text-stone-500" htmlFor={`profile-${field.key}`}>{field.label}{field.required?" *":""}</label>
                      {field.type==="textarea"
                        ? <Textarea id={`profile-${field.key}`} rows={4} maxLength={field.max} value={String(details[field.key]??"")} onChange={e=>{setDetails(v=>({...v,[field.key]:e.target.value}));setDirty(true);}} className="text-sm placeholder:text-xs"/>
                        : <Input id={`profile-${field.key}`} type={field.type||"text"} min={0} max={field.type==="number"?field.max:undefined} maxLength={field.type!=="number"?field.max:undefined} value={details[field.key] as string|number ?? ""} onChange={e=>{const value=e.target.value;setDetails(v=>({...v,[field.key]:field.type==="number"?(value===""?null:Number(value)):value}));setDirty(true);}}/>}
                    </div>)}
                    {index===0&&<div>
                      <label htmlFor="profile-housing" className="mb-1.5 block text-2xs font-black uppercase tracking-wider text-stone-500">Housing type *</label>
                      <select id="profile-housing" value={details.housingType||""} onChange={e=>{setDetails(v=>({...v,housingType:(e.target.value || null) as RequestVerification["housingType"]}));setDirty(true);}} className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-zinc-700"><option value="">Select</option>{["OWNED","RENTED","TEMPORARY","SHELTER"].map(h=><option key={h} value={h}>{h.charAt(0)+h.slice(1).toLowerCase()}</option>)}</select>
                    </div>}
                  </div>
                  {index===0&&<div className="mt-8 rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm font-bold text-[#1e3a60] dark:text-blue-200">Filled this in before?</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">Copy the details from your previous requests instead of typing them again.</p>
                    <Button variant="outline" disabled={busy||dirty} className="mt-4" onClick={async()=>{setBusy(true);try{apply(await importPreviousNeedProfile());toast.success("Previous details imported. Please review them before continuing.");}catch(e){toast.error(e instanceof Error?e.message:"Import failed");}finally{setBusy(false);}}}>Import from my previous requests</Button>
                    {dirty&&<p className="mt-2 text-xs text-stone-500">Save your edits before importing previous information.</p>}
                  </div>}
                </section>
              )}

              <section className={active===DOCS_STEP?"":"hidden"}>
                <h2 className="text-2xl font-bold tracking-tight text-[#1e3a60] dark:text-blue-200">Identity documents</h2>
                <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-stone-500">Upload clear JPG, PNG or WebP photographs. AI checks document type and readability; final verification stays with our admins. Sharing your photo with donors is a separate choice on each request.</p>
                <div className="mt-7 grid items-start gap-4 sm:grid-cols-2">
                  {DOCS.map(item=><ProfileDocumentCard key={item.type} {...item} document={profile.documents.find(d=>d.docType===item.type)} busy={busy} checking={checking===item.type} error={uploadErrors[item.type]} onUpload={file=>void upload(item.type,file)} onRemove={async()=>{const doc=profile.documents.find(d=>d.docType===item.type);if(!doc)return;setBusy(true);try{await deleteNeedProfileDocument(doc.id);setProfile(await getDoneeNeedProfile());setUploadErrors(v=>({...v,[item.type]:undefined}));}catch{toast.error("Could not remove document");}finally{setBusy(false);}}}/>)}
                </div>
                <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-stone-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Update your name, phone and city on your <Link href="/profile" className="underline">basic profile</Link>. Completing this form does not mean your request is approved.</p>
              </section>
            </div>
          </fieldset>

          {/* Action bar: the same two saves the page has always had. */}
          <div className="sticky bottom-0 border-t border-stone-200 bg-white px-5 py-4 sm:px-10 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3">
              <p className={`text-sm font-semibold ${profile.complete?"text-emerald-700 dark:text-emerald-400":"text-stone-500"}`}>
                {profile.complete
                  ? <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />Ready to request</span>
                  : `${remaining} left`}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {active<DOCS_STEP && <Button type="button" variant="outline" disabled={busy} onClick={()=>setActive(active+1)}>Next section</Button>}
                <Button type="submit" variant="outline" disabled={busy}>{busy?"Working…":"Save profile"}</Button>
                {/* Only once there is somewhere to continue to. Offering this on
                    section one invites a click that can only end in the "complete
                    the items above" toast. A donee whose profile is already
                    complete gets it wherever they are — they are not here to
                    walk the sections again. */}
                {(active===DOCS_STEP || profile.complete) &&
                  <Button type="button" disabled={busy} onClick={()=>void save(true)}>Save &amp; continue to request <ArrowRight className="ml-1.5 h-4 w-4" /></Button>}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>;
}
