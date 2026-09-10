"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";
import type { VerificationDocument, VerificationDocumentType } from "@/lib/api";

export function ProfileDocumentCard({ type, label, required, document: doc, busy, checking, error, onUpload, onRemove }: {
  type: VerificationDocumentType; label: string; required?: boolean;
  document?: VerificationDocument; busy: boolean; checking: boolean; error?: string;
  onUpload: (file: File) => void; onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const selfie = type === "SELFIE_WITH_ID";
  const failed = !!error || doc?.aiVerified === false;
  const passed = doc?.aiVerified === true;
  return <div className={`rounded-xl border p-4 ${failed ? "border-red-200 bg-red-50/40 dark:border-red-900" : passed ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
    <label htmlFor={`doc-${type}`} className="text-sm font-semibold text-[#1e3a60] dark:text-blue-200">{label}{required ? " *" : " (optional)"}</label>
    <div className={`my-3 flex items-start gap-2 text-xs ${failed ? "text-red-700 dark:text-red-300" : passed ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"}`} role="status" aria-live="polite">
      {checking ? <Loader2 className="size-4 shrink-0 animate-spin"/> : failed ? <AlertCircle className="size-4 shrink-0"/> : passed ? <CheckCircle2 className="size-4 shrink-0"/> : <ShieldCheck className="size-4 shrink-0"/>}
      <div><p className="font-semibold">{checking ? "Uploading & running AI screening…" : error ? "Upload not accepted" : !doc ? "AI screening runs after upload" : passed ? selfie ? "AI check passed · face clearly visible" : "AI document check passed" : failed ? "Please replace this document" : "Saved · AI check pending admin review"}</p>
        {!checking && (error || doc?.aiReason) && <p className="mt-1 leading-relaxed">{error || doc?.aiReason}</p>}
        {!checking && error && doc && <p className="mt-1">Your previously saved file is still in place.</p>}
      </div>
    </div>
    {selfie && <p className="mb-3 text-xs leading-relaxed text-slate-500">Face the camera in good light and keep your face unobstructed. Both live photos and uploads receive the same face-visibility check.</p>}
    <input ref={input} id={`doc-${type}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[#1e3a60]" onChange={e => { const file=e.target.files?.[0]; e.target.value=""; if(file)onUpload(file); }}/>
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {selfie && <button type="button" disabled={busy} onClick={()=>setCameraOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1e3a60] px-3 text-xs font-semibold text-white disabled:opacity-50"><Camera className="size-4"/>Take live photo</button>}
      {doc && <button type="button" disabled={busy} className="min-h-10 text-xs text-red-600 underline disabled:opacity-50" onClick={onRemove}>Remove</button>}
    </div>
    {selfie && <CameraCaptureDialog open={cameraOpen} onOpenChange={setCameraOpen} facingMode="user" title="Take your profile photo" instructions="Keep your face clearly visible. AI will check the photo after you choose to use it." onCapture={file=>{setCameraOpen(false);onUpload(file);}} onChoosePhoto={()=>{setCameraOpen(false);input.current?.click();}}/>}
  </div>;
}
