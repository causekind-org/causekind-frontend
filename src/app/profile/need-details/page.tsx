"use client";

import { ProfileDocumentCard } from "./ProfileDocumentCard";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/AppLink";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDoneeNeedProfile, saveDoneeNeedProfile, uploadNeedProfileDocument, deleteNeedProfileDocument, type DoneeNeedProfile, type RequestVerification, type VerificationDocumentType } from "@/lib/api";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { NEED_PROFILE_DOCS, liveNeedProfileMissing, needProfileItemLabel, progressOf } from "@/lib/needProfileDocs";

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
/** Quiet autosave fires this long after the last keystroke or change. */
const AUTOSAVE_MS = 1500;

/**
 * Which "missing" items belong to which required section, mirrored from
 * DoneeProfileService.missing(). A required section is done when none of its
 * items is still missing; a section with no compulsory fields is always done
 * (owner, 2026-10-06); documents are done when no required document is missing.
 */
const SECTION_MISSING: Record<number, string[]> = {
  0: ["People in home", "Dependents", "Age", "Housing type"],
  1: ["Monthly household income", "Income source", "Financial situation"],
};
function stepDone(index: number, missing: string[]): boolean {
  if (index === DOCS_STEP) return !DOCS.some(d => d.required && missing.includes(d.type));
  const owned = SECTION_MISSING[index];
  if (owned) return !owned.some(m => missing.includes(m));
  return true;
}

/** Compulsory fields of one section that are still blank in the form. */
function blankRequired(index: number, details: Partial<RequestVerification>): string[] {
  const group = GROUPS[index];
  if (!group) return [];
  const isBlank = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
  const keys = group.fields.filter(f => f.required && isBlank(details[f.key])).map(f => f.key as string);
  if (index === 0 && !details.housingType) keys.push("housingType");
  return keys;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function NeedProfilePage() { return <Suspense fallback={null}><NeedProfileEditor /></Suspense>; }
function NeedProfileEditor() {
  const {user,isLoading}=useAuth(); const router=useRouter(); const params=useSearchParams();
  const [profile,setProfile]=useState<DoneeNeedProfile|null>(null);
  const [details,setDetails]=useState<Partial<RequestVerification>>({});
  // `busy` is for document uploads only; autosave never locks the form.
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const [checking,setChecking]=useState<VerificationDocumentType|null>(null);
  const [uploadErrors,setUploadErrors]=useState<Partial<Record<VerificationDocumentType,string>>>({});
  // Every section stays mounted; only the active one is visible. Unmounting
  // would lose in-progress edits on every switch, and the page's tests drive a
  // household field and a document upload within one render.
  const [active,setActive]=useState(0);
  // Compulsory fields left blank when the donee tried to move on.
  const [blankKeys,setBlankKeys]=useState<Set<string>>(new Set());

  // ── Saving ─────────────────────────────────────────────────────────────
  // The latest form values and the last values the server confirmed, as refs:
  // saves run from timers, unmount and navigation, past any one render.
  const detailsRef=useRef(details); detailsRef.current=details;
  const savedJson=useRef<string|null>(null);
  const inFlight=useRef<Promise<boolean>|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [saveState,setSaveState]=useState<SaveState>("idle");
  const [moving,setMoving]=useState(false);
  const unsaved=()=>savedJson.current!==null && JSON.stringify(detailsRef.current)!==savedJson.current;

  /**
   * Saves whatever is in the form now (partial data is fine — the server keeps
   * blanks as blanks). Resolves true once the server has these exact values.
   * Saves queue behind each other, so a fast typist never races two writes.
   */
  const saveNow=useCallback(async():Promise<boolean>=>{
    if(timer.current){clearTimeout(timer.current);timer.current=null;}
    if(inFlight.current) await inFlight.current;
    if(!unsaved()) return true;
    const sent=detailsRef.current; const sentJson=JSON.stringify(sent);
    setSaveState("saving");
    const run=(async()=>{
      try{
        const p=await saveDoneeNeedProfile(sent);
        savedJson.current=sentJson;
        // Not apply(p): the donee may have kept typing while this was in flight.
        setProfile(p);
        setSaveState(unsaved()?"idle":"saved");
        return true;
      }catch{ setSaveState("error"); return false; }
      finally{ inFlight.current=null; }
    })();
    inFlight.current=run;
    const ok=await run;
    // Typed during the save: those edits get their own (quiet) save.
    if(ok && unsaved()) timer.current=setTimeout(()=>void saveNow(),AUTOSAVE_MS);
    return ok;
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  /** A field changed: update the form and (re)arm the quiet autosave. */
  function change(patch: Partial<RequestVerification>, key: string){
    setDetails(v=>({...v,...patch}));
    setBlankKeys(s=>{ if(!s.has(key)) return s; const n=new Set(s); n.delete(key); return n; });
    if(timer.current) clearTimeout(timer.current);
    timer.current=setTimeout(()=>void saveNow(),AUTOSAVE_MS);
  }

  // Leaving the page: save what's pending; warn only if something is unsaved.
  useEffect(()=>{
    const onBeforeUnload=(e:BeforeUnloadEvent)=>{ if(unsaved()||inFlight.current){ e.preventDefault(); e.returnValue=""; } };
    window.addEventListener("beforeunload",onBeforeUnload);
    return ()=>{ window.removeEventListener("beforeunload",onBeforeUnload); if(unsaved()) void saveNow(); };
  },[saveNow]); // eslint-disable-line react-hooks/exhaustive-deps

  function goTo(index:number){
    void saveNow();
    setBlankKeys(new Set());
    setActive(index);
  }

  function highlight(blanks:string[]){
    setBlankKeys(new Set(blanks));
    document.getElementById(blanks[0]==="housingType"?"profile-housing":`profile-${blanks[0]}`)?.focus();
  }

  async function nextSection(){
    const blanks=blankRequired(active,details);
    if(blanks.length){
      highlight(blanks);
      toast.error("Fill in the fields marked * before moving on.");
      return;
    }
    setMoving(true);
    const ok=await saveNow();
    setMoving(false);
    if(!ok){ toast.error("We couldn't save this section. Check your connection and try again."); return; }
    setBlankKeys(new Set());
    setActive(active+1);
  }

  /** Last section: save, then continue to the request — or show what's left. */
  async function finish(){
    setMoving(true);
    const ok=await saveNow();
    setMoving(false);
    if(!ok){ toast.error("We couldn't save your profile. Check your connection and try again."); return; }
    if(missing.length===0){ router.push(destination); return; }
    const firstSection=GROUPS.findIndex((_,i)=>blankRequired(i,detailsRef.current).length>0);
    if(firstSection>=0){
      setActive(firstSection);
      requestAnimationFrame(()=>highlight(blankRequired(firstSection,detailsRef.current)));
      toast.error("A few required details are still missing.");
    } else if(DOCS.some(d=>d.required && missing.includes(d.type))){
      setActive(DOCS_STEP);
      toast.error("Upload the required documents to finish.");
    } else {
      toast.error("Add your name, phone and city on your basic profile to finish.");
    }
  }

  const next=params.get("next");
  // Allowlist, not a sanitiser: `next` is attacker-controllable, so only these
  // exact shapes round-trip. `category` comes from the donee-view tiles.
  const destination=next && /^\/requests\/new(?:\?(?:draftId=\d+|category=[A-Za-z0-9%_-]{1,60}))?$/.test(next) ? next : "/requests/new";
  function apply(p:DoneeNeedProfile) {setProfile(p);setDetails(p.details);savedJson.current=JSON.stringify(p.details);}
  async function load() {try {setError("");apply(await getDoneeNeedProfile());} catch(e) {setError(e instanceof Error?e.message:"Could not load your profile");}}
  useEffect(()=>{if(isLoading)return;if(!user){router.replace("/login?next=%2Fprofile%2Fneed-details");return;}void load();},[user,isLoading]);
  async function upload(type:VerificationDocumentType,file:File) {
    // Shrink before the size check, not after: a phone photo of an ID is
    // routinely over 10MB and was being turned away here without ever being
    // offered. The gentle single-pass, not the display ladder — screeners read
    // text off these. An undecodable file comes back unchanged and is still
    // caught by the check below.
    const prepared=await compressImageIfNeeded(file);
    if(prepared.size>10*1024*1024){toast.error("Please use a photo under 10 MB");return;}
    setBusy(true); setChecking(type); setUploadErrors(v=>({...v,[type]:undefined}));
    try {const doc=await uploadNeedProfileDocument(type,prepared);const p=await getDoneeNeedProfile();setProfile(p);
      if(doc.aiVerified===false) toast.error("Please replace this document. See the AI feedback below.");
      else toast.success(doc.aiVerified===true?"Saved — AI screening passed":"Saved for admin review");}
    catch(e){const message=e instanceof Error?e.message:"Upload failed";setUploadErrors(v=>({...v,[type]:message}));toast.error(message);}
    finally{setBusy(false);setChecking(null);}
  }

  if(error)return <div className="mx-auto max-w-4xl p-6"><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry</Button><Link href="/profile">Back to profile</Link></div>;
  if(!profile)return <p className="p-8" role="status">Loading your request profile…</p>;

  // Live: judged from what is typed now, not from the last save.
  const missing = liveNeedProfileMissing(details, profile.missing);
  const complete = missing.length === 0;
  const progress = progressOf(missing);
  const remaining = missing.length;
  const isLast = active === DOCS_STEP;
  const bar = "h-full rounded-full bg-[var(--ck-role-accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none";

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
            <div className={bar} style={{width: `${progress.pct}%`}} />
          </div>
          <p className="text-xs leading-relaxed text-stone-500">
            {complete ? "Everything is in. You can post a need now." : `${remaining} ${remaining===1?"item":"items"} left before you can post a need.`}
          </p>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto px-4 py-5">
          {STEPS.map((title,index)=>
            <button key={title} type="button" onClick={()=>goTo(index)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${index===active?"bg-stone-100 font-bold text-[#1e3a60] dark:bg-zinc-800 dark:text-blue-200":"font-semibold text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-zinc-800/60"}`}>
              {(()=>{const done=stepDone(index,missing);return(
              <span aria-label={done?"Done":undefined} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-black ${done?"bg-emerald-500 text-white":index===active?"bg-[var(--ck-role-accent)] text-white":"border border-stone-300 text-stone-400 dark:border-zinc-600"}`}>{done?<Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />:index+1}</span>);})()}
              {title}
            </button>
          )}
        </nav>

        {/* What is still outstanding, as of what is typed right now. */}
        {missing.length>0 && <div className="mt-auto border-t border-stone-200 px-7 py-5 dark:border-zinc-800">
          <p className="text-3xs font-black uppercase tracking-[0.18em] text-stone-400">Still needed</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {missing.map(m=><li key={m} className="flex items-start gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
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
            <div className={bar} style={{width: `${progress.pct}%`}} />
          </div>
          <p className="mt-2 text-xs text-stone-500">{complete?"Everything is in.":`${remaining} ${remaining===1?"item":"items"} left.`}</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((title,index)=>
              <button key={title} type="button" onClick={()=>goTo(index)}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-2xs font-bold transition-colors ${index===active?"bg-[var(--ck-role-accent)] text-white":"border border-stone-300 text-stone-600 dark:border-zinc-600 dark:text-stone-300"}`}>{title}</button>
            )}
          </div>
        </div>

        <form onSubmit={e=>{e.preventDefault();void (isLast?finish():nextSection());}} className="flex flex-1 flex-col">
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
                        ? <Textarea id={`profile-${field.key}`} rows={4} maxLength={field.max} placeholder={field.required?undefined:"Not provided"} aria-invalid={blankKeys.has(field.key)||undefined} value={String(details[field.key]??"")} onChange={e=>change({[field.key]:e.target.value},field.key)} onBlur={()=>void saveNow()} className={`text-sm placeholder:text-xs ${blankKeys.has(field.key)?"border-red-500 ring-1 ring-red-500":""}`}/>
                        : <Input id={`profile-${field.key}`} placeholder={field.required?undefined:"Not provided"} aria-invalid={blankKeys.has(field.key)||undefined} className={blankKeys.has(field.key)?"border-red-500 ring-1 ring-red-500":undefined} type={field.type||"text"} min={0} max={field.type==="number"?field.max:undefined} maxLength={field.type!=="number"?field.max:undefined} value={details[field.key] as string|number ?? ""} onChange={e=>{const value=e.target.value;change({[field.key]:field.type==="number"?(value===""?null:Number(value)):value},field.key);}} onBlur={()=>void saveNow()}/>}
                      {blankKeys.has(field.key)&&<p className="mt-1 text-xs font-semibold text-red-600">This is required.</p>}
                    </div>)}
                    {index===0&&<div>
                      <label htmlFor="profile-housing" className="mb-1.5 block text-2xs font-black uppercase tracking-wider text-stone-500">Housing type *</label>
                      <select id="profile-housing" aria-invalid={blankKeys.has("housingType")||undefined} value={details.housingType||""} onChange={e=>change({housingType:(e.target.value || null) as RequestVerification["housingType"]},"housingType")} className={`h-10 w-full rounded-md border bg-transparent px-3 text-sm dark:border-zinc-700 ${blankKeys.has("housingType")?"border-red-500 ring-1 ring-red-500":"border-slate-200"}`}><option value="">Select</option>{["OWNED","RENTED","TEMPORARY","SHELTER"].map(h=><option key={h} value={h}>{h.charAt(0)+h.slice(1).toLowerCase()}</option>)}</select>
                    </div>}
                  </div>
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

          {/* Action bar: everything saves on its own; Next / Finish also save first. */}
          <div className="sticky bottom-0 border-t border-stone-200 bg-white px-5 py-4 sm:px-10 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className={`text-sm font-semibold ${complete?"text-emerald-700 dark:text-emerald-400":"text-stone-500"}`}>
                  {complete
                    ? <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" />Ready to request</span>
                    : `${remaining} left`}
                </p>
                <p role="status" aria-live="polite" className="text-xs font-semibold">
                  {saveState==="saving" && <span className="inline-flex items-center gap-1 text-stone-500"><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />Saving…</span>}
                  {saveState==="saved" && <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Check className="h-3 w-3" aria-hidden />Saved</span>}
                  {saveState==="error" && <span className="text-red-600 dark:text-red-400">Couldn&apos;t save. <button type="button" onClick={()=>void saveNow()} className="underline">Retry</button></span>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Already complete: no need to walk the sections again. */}
                {complete && !isLast &&
                  <Button type="button" variant="outline" disabled={busy||moving} onClick={()=>void finish()}>Continue to request <ArrowRight className="ml-1.5 h-4 w-4" /></Button>}
                <Button type="submit" disabled={busy||moving}>
                  {moving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />Saving…</> : isLast ? "Finish" : "Next section"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>;
}
