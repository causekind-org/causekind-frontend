"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Upload, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  IS_NGO_DEMO_MODE,
  type NGOFormState,
  getNgoStillNeededItems,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { NGO_PHOTO_RULE, uploadNgoPhoto, getNgoFilePreviewUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CorrectionNote, type NgoCorrections } from "@/features/ngo-registration/components/CorrectionNote";
import { UploadedFilePreview } from "@/features/ngo-registration/components/UploadedFilePreview";
import { FilePreviewDialog, type PreviewFile } from "@/components/FilePreviewDialog";

/** Photos: JPG, PNG or WebP, up to 10 MB (the server checks the real file too). */
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function checkNgoPhotoFile(file: File): string | null {
  const typeOk = PHOTO_TYPES.includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
  return !typeOk || file.size === 0 || file.size > 10 * 1024 * 1024 ? NGO_PHOTO_RULE : null;
}

interface OrgPhotosProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Items a reviewer asked to fix, with their notes (shown next to each). */
  corrections?: NgoCorrections;
}

export function OrgPhotos({ data, onChange, onBack, onContinue, corrections }: OrgPhotosProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const officeInputRef = useRef<HTMLInputElement>(null);
  const activityInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [draggingLogo, setDraggingLogo] = useState(false);
  const [draggingOffice, setDraggingOffice] = useState(false);

  // Local immediate blob preview URLs
  const [localLogoBlob, setLocalLogoBlob] = useState<string | null>(null);
  const [localOfficeBlob, setLocalOfficeBlob] = useState<string | null>(null);
  const [localActivityBlobs, setLocalActivityBlobs] = useState<(string | null)[]>([null, null, null]);

  // Uploading and error state per section
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [lastLogoFile, setLastLogoFile] = useState<File | null>(null);

  const [uploadingOffice, setUploadingOffice] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);
  const [lastOfficeFile, setLastOfficeFile] = useState<File | null>(null);

  const [uploadingActivity, setUploadingActivity] = useState<boolean[]>([false, false, false]);
  const [activityErrors, setActivityErrors] = useState<(string | null)[]>([null, null, null]);
  const [lastActivityFiles, setLastActivityFiles] = useState<(File | null)[]>([null, null, null]);

  function safeCreateObjectURL(file: File): string | null {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      try {
        return URL.createObjectURL(file);
      } catch {
        return null;
      }
    }
    return null;
  }

  function safeRevokeObjectURL(url: string | null) {
    if (url && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  }

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      safeRevokeObjectURL(localLogoBlob);
      safeRevokeObjectURL(localOfficeBlob);
      localActivityBlobs.forEach((b) => {
        safeRevokeObjectURL(b);
      });
    };
  }, [localLogoBlob, localOfficeBlob, localActivityBlobs]);

  // Step-level full-size viewer with previous/next arrows across all uploaded photos
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const stepPreviewFiles = useMemo(() => {
    const out: { id: string; file: PreviewFile }[] = [];
    if (data.logo && !data.logo.demo) {
      out.push({
        id: "logo",
        file: {
          name: `Organization Logo: ${data.logo.name}`,
          mimeType: data.logo.mimeType,
          resolve:
            data.logo.photoId != null
              ? async () => await getNgoFilePreviewUrl("photo", data.logo!.photoId!)
              : undefined,
          url: data.logo.photoId == null ? data.logo.s3Url : undefined,
        },
      });
    }
    if (data.officePhoto && !data.officePhoto.demo) {
      out.push({
        id: "office",
        file: {
          name: `Registered Office Photo: ${data.officePhoto.name}`,
          mimeType: data.officePhoto.mimeType,
          resolve:
            data.officePhoto.photoId != null
              ? async () => await getNgoFilePreviewUrl("photo", data.officePhoto!.photoId!)
              : undefined,
          url: data.officePhoto.photoId == null ? data.officePhoto.s3Url : undefined,
        },
      });
    }
    data.activityPhotos.forEach((f, i) => {
      if (f && !f.demo) {
        out.push({
          id: `activity-${i}`,
          file: {
            name: `Activity Photo ${i + 1}: ${f.name}`,
            mimeType: f.mimeType,
            resolve:
              f.photoId != null
                ? async () => await getNgoFilePreviewUrl("photo", f!.photoId!)
                : undefined,
            url: f.photoId == null ? f.s3Url : undefined,
          },
        });
      }
    });
    return out;
  }, [data.logo, data.officePhoto, data.activityPhotos]);

  const openPreview = (id: string) => {
    const idx = stepPreviewFiles.findIndex((x) => x.id === id);
    if (idx >= 0) setPreviewIndex(idx);
  };

  async function performLogoUpload(file: File) {
    const blob = safeCreateObjectURL(file);
    setLocalLogoBlob(blob);
    setUploadingLogo(true);
    setLogoError(null);
    setLastLogoFile(file);

    try {
      const res = await uploadNgoPhoto(file, "logo");
      onChange({
        logo: {
          name: file.name,
          photoId: res.photoId,
          s3Url: res.s3Url,
          s3Key: res.s3Key,
          size: file.size,
          mimeType: file.type,
          demo: false,
        },
      });
      setLogoError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Logo upload failed. Please try another image.";
      setLogoError(msg);
      // Keep existing data.logo intact
    } finally {
      setUploadingLogo(false);
    }
  }

  async function performOfficeUpload(file: File) {
    const blob = safeCreateObjectURL(file);
    setLocalOfficeBlob(blob);
    setUploadingOffice(true);
    setOfficeError(null);
    setLastOfficeFile(file);

    try {
      const res = await uploadNgoPhoto(file, "office_photo");
      onChange({
        officePhoto: {
          name: file.name,
          photoId: res.photoId,
          s3Url: res.s3Url,
          s3Key: res.s3Key,
          size: file.size,
          mimeType: file.type,
          demo: false,
        },
      });
      setOfficeError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Office photo upload failed. Please try another image.";
      setOfficeError(msg);
      // Keep existing data.officePhoto intact
    } finally {
      setUploadingOffice(false);
    }
  }

  async function performActivityUpload(index: number, file: File) {
    const blob = safeCreateObjectURL(file);
    const nextBlobs = [...localActivityBlobs];
    nextBlobs[index] = blob;
    setLocalActivityBlobs(nextBlobs);

    const nextUploading = [...uploadingActivity];
    nextUploading[index] = true;
    setUploadingActivity(nextUploading);

    const nextErrors = [...activityErrors];
    nextErrors[index] = null;
    setActivityErrors(nextErrors);

    const nextFiles = [...lastActivityFiles];
    nextFiles[index] = file;
    setLastActivityFiles(nextFiles);

    try {
      const res = await uploadNgoPhoto(file, "activity_photo");
      const nextPhotos = [...data.activityPhotos];
      nextPhotos[index] = {
        name: file.name,
        photoId: res.photoId,
        s3Url: res.s3Url,
        s3Key: res.s3Key,
        size: file.size,
        mimeType: file.type,
        demo: false,
      };
      onChange({ activityPhotos: nextPhotos });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Photo upload failed. Try another image.";
      const updatedErrors = [...activityErrors];
      updatedErrors[index] = msg;
      setActivityErrors(updatedErrors);
    } finally {
      const resetUploading = [...uploadingActivity];
      resetUploading[index] = false;
      setUploadingActivity(resetUploading);
    }
  }

  function handleLogoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const refused = checkNgoPhotoFile(files[0]);
    if (refused) return setLogoError(refused);
    performLogoUpload(files[0]);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handleOfficeFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const refused = checkNgoPhotoFile(files[0]);
    if (refused) return setOfficeError(refused);
    performOfficeUpload(files[0]);
    if (officeInputRef.current) officeInputRef.current.value = "";
  }

  function handleActivityFile(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const refused = checkNgoPhotoFile(files[0]);
    if (refused) {
      const next = [...activityErrors];
      next[index] = refused;
      setActivityErrors(next);
      return;
    }
    performActivityUpload(index, files[0]);
    if (activityInputRefs[index]?.current) activityInputRefs[index].current!.value = "";
  }

  function removeActivityPhoto(index: number) {
    const next = [...data.activityPhotos];
    next[index] = null;
    onChange({ activityPhotos: next });
    const nextErrors = [...activityErrors];
    nextErrors[index] = null;
    setActivityErrors(nextErrors);
    const nextBlobs = [...localActivityBlobs];
    nextBlobs[index] = null;
    setLocalActivityBlobs(nextBlobs);
  }

  const missing = getNgoStillNeededItems("org-photos", data);

  return (
    <div className="space-y-6">
      <FilePreviewDialog
        files={stepPreviewFiles.map((x) => x.file)}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />

      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-ngo-700 dark:text-ngo-300">
          Step 4 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Organization Photos
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Visual verification helps donors and partners trust and identify your organization.
        </p>
      </div>

      <div className="space-y-5">
        {/* 1. Organization Logo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Organization Logo <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                Square or transparent PNG recommended (PNG, JPG, WebP · max 10 MB)
              </p>
              <CorrectionNote note={corrections?.logo} field="logo" />
            </div>
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="sr-only"
            id="ngo-logo-upload"
            disabled={uploadingLogo}
            onChange={(e) => handleLogoFiles(e.target.files)}
          />

          {uploadingLogo ? (
            <div className="rounded-xl border border-ngo-300 bg-[#FAF7F2] p-4 dark:border-emerald-900/60 dark:bg-[#141E18]">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                  {localLogoBlob ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={localLogoBlob} alt="Uploading logo" className="h-full w-full object-cover" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-ngo-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-ngo-700 dark:text-ngo-300 shrink-0" />
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Uploading & moderating logo…
                    </p>
                  </div>
                  <p className="mt-0.5 text-3xs text-stone-500 dark:text-stone-400">
                    Running AI content moderation check
                  </p>
                </div>
              </div>
            </div>
          ) : data.logo ? (
            <div>
              <UploadedFilePreview
                file={data.logo}
                label="Organization Logo"
                kind="photo"
                localBlobUrl={localLogoBlob}
                onPreview={() => openPreview("logo")}
                onReplace={() => logoInputRef.current?.click()}
                onRemove={() => {
                  setLocalLogoBlob(null);
                  onChange({ logo: null });
                  setLogoError(null);
                }}
              />
              {logoError && (
                <div className="mt-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-2xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Replacement failed: {logoError} (kept previous logo)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastLogoFile) performLogoUpload(lastLogoFile);
                      else logoInputRef.current?.click();
                    }}
                    className="shrink-0 font-bold underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingLogo(true);
                }}
                onDragLeave={() => setDraggingLogo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingLogo(false);
                  handleLogoFiles(e.dataTransfer.files);
                }}
                onClick={() => logoInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    logoInputRef.current?.click();
                  }
                }}
                aria-label="Upload organization logo"
                className={cn(
                  "m-3 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 transition-colors",
                  draggingLogo
                    ? "border-ngo-700 bg-ngo-700/5 cursor-pointer"
                    : "border-stone-200 dark:border-zinc-700 hover:border-ngo-700/50 cursor-pointer"
                )}
              >
                <Upload className="h-5 w-5 text-stone-400" aria-hidden />
                <p className="text-2xs font-semibold text-stone-600 dark:text-stone-300">Click or drag logo here</p>
                <p className="text-3xs text-stone-400">PNG, JPG or WebP · Max 10 MB</p>
              </div>

              {/* Demo Mode shortcut */}
              {IS_NGO_DEMO_MODE && (
                <div className="border-t border-stone-200/70 dark:border-zinc-800 px-3.5 py-1.5 flex items-center justify-between bg-stone-100/50 dark:bg-zinc-800/40">
                  <span className="text-3xs font-medium text-stone-400 dark:text-stone-500">Demo mode active</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const dummyBlob = new Blob(["demo logo content"], { type: "image/png" });
                      const file = new File([dummyBlob], "organization-logo-demo.png", { type: "image/png" });
                      performLogoUpload(file);
                    }}
                    className="text-3xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
                  >
                    Mark as uploaded ✓
                  </button>
                </div>
              )}

              {logoError && (
                <div className="border-t border-red-100 dark:border-red-950/50 bg-red-50/70 dark:bg-red-950/20 px-3.5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-3xs text-red-700 dark:text-red-300 font-medium truncate">
                      {logoError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastLogoFile) performLogoUpload(lastLogoFile);
                      else logoInputRef.current?.click();
                    }}
                    className="shrink-0 inline-flex items-center gap-1 text-3xs font-bold text-red-700 hover:text-red-800 underline underline-offset-2"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Registered Office Photo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Registered Office Photo <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                Front entrance or nameboard of your registered address
              </p>
              <CorrectionNote note={corrections?.officePhoto} field="officePhoto" />
            </div>
          </div>

          <input
            ref={officeInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="sr-only"
            id="ngo-office-upload"
            disabled={uploadingOffice}
            onChange={(e) => handleOfficeFiles(e.target.files)}
          />

          {uploadingOffice ? (
            <div className="rounded-xl border border-ngo-300 bg-[#FAF7F2] p-4 dark:border-emerald-900/60 dark:bg-[#141E18]">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                  {localOfficeBlob ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={localOfficeBlob} alt="Uploading office photo" className="h-full w-full object-cover" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-ngo-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-ngo-700 dark:text-ngo-300 shrink-0" />
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Uploading office photo…
                    </p>
                  </div>
                  <p className="mt-0.5 text-3xs text-stone-500 dark:text-stone-400">
                    Running AI moderation check
                  </p>
                </div>
              </div>
            </div>
          ) : data.officePhoto ? (
            <div>
              <UploadedFilePreview
                file={data.officePhoto}
                label="Registered Office Photo"
                kind="photo"
                localBlobUrl={localOfficeBlob}
                onPreview={() => openPreview("office")}
                onReplace={() => officeInputRef.current?.click()}
                onRemove={() => {
                  setLocalOfficeBlob(null);
                  onChange({ officePhoto: null });
                  setOfficeError(null);
                }}
              />
              {officeError && (
                <div className="mt-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-2xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Replacement failed: {officeError} (kept previous photo)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastOfficeFile) performOfficeUpload(lastOfficeFile);
                      else officeInputRef.current?.click();
                    }}
                    className="shrink-0 font-bold underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingOffice(true);
                }}
                onDragLeave={() => setDraggingOffice(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingOffice(false);
                  handleOfficeFiles(e.dataTransfer.files);
                }}
                onClick={() => officeInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    officeInputRef.current?.click();
                  }
                }}
                aria-label="Upload office photo"
                className={cn(
                  "m-3 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 transition-colors",
                  draggingOffice
                    ? "border-ngo-700 bg-ngo-700/5 cursor-pointer"
                    : "border-stone-200 dark:border-zinc-700 hover:border-ngo-700/50 cursor-pointer"
                )}
              >
                <Camera className="h-5 w-5 text-stone-400" aria-hidden />
                <p className="text-2xs font-semibold text-stone-600 dark:text-stone-300">Click or drag office photo</p>
                <p className="text-3xs text-stone-400">JPG, PNG, WebP · Max 10 MB</p>
              </div>

              {/* Demo Mode shortcut */}
              {IS_NGO_DEMO_MODE && (
                <div className="border-t border-stone-200/70 dark:border-zinc-800 px-3.5 py-1.5 flex items-center justify-between bg-stone-100/50 dark:bg-zinc-800/40">
                  <span className="text-3xs font-medium text-stone-400 dark:text-stone-500">Demo mode active</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const dummyBlob = new Blob(["demo office content"], { type: "image/jpeg" });
                      const file = new File([dummyBlob], "office-front-entrance-demo.jpg", { type: "image/jpeg" });
                      performOfficeUpload(file);
                    }}
                    className="text-3xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
                  >
                    Mark as uploaded ✓
                  </button>
                </div>
              )}

              {officeError && (
                <div className="border-t border-red-100 dark:border-red-950/50 bg-red-50/70 dark:bg-red-950/20 px-3.5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-3xs text-red-700 dark:text-red-300 font-medium truncate">
                      {officeError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastOfficeFile) performOfficeUpload(lastOfficeFile);
                      else officeInputRef.current?.click();
                    }}
                    className="shrink-0 inline-flex items-center gap-1 text-3xs font-bold text-red-700 hover:text-red-800 underline underline-offset-2"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Community / Activity Photos Grid (Optional, up to 3) */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Activity Photos <span className="text-xs font-normal text-stone-400">(Optional, up to 3)</span>
              </p>
              <span className="text-3xs font-bold text-stone-400">
                {data.activityPhotos.filter(Boolean).length} of 3 uploaded
              </span>
            </div>
            <p className="text-3xs text-stone-400 dark:text-stone-500">
              Photos of your community programs, distribution drives, or field activities
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[0, 1, 2].map((idx) => {
              const photo = data.activityPhotos[idx];
              const isUploadingThis = uploadingActivity[idx];
              const err = activityErrors[idx];

              return (
                <div key={idx} className="space-y-1">
                  <CorrectionNote note={corrections?.[`activityPhotos.${idx}`]} field={`activityPhotos.${idx}`} />
                  <input
                    ref={activityInputRefs[idx]}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    id={`activity-photo-${idx}`}
                    disabled={isUploadingThis}
                    onChange={(e) => handleActivityFile(idx, e.target.files)}
                  />

                  {isUploadingThis ? (
                    <div className="rounded-xl border border-ngo-300 bg-[#FAF7F2] p-4 dark:border-emerald-900/60 dark:bg-[#141E18]">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                          {localActivityBlobs[idx] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={localActivityBlobs[idx]!} alt={`Uploading activity photo ${idx + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <Loader2 className="h-5 w-5 animate-spin text-ngo-700" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-ngo-700 dark:text-ngo-300 shrink-0" />
                            <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              Uploading activity photo {idx + 1}…
                            </p>
                          </div>
                          <p className="mt-0.5 text-3xs text-stone-500 dark:text-stone-400">
                            Running AI moderation check
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : photo ? (
                    <div>
                      <UploadedFilePreview
                        file={photo}
                        label={`Activity Photo ${idx + 1}`}
                        kind="photo"
                        localBlobUrl={localActivityBlobs[idx]}
                        onPreview={() => openPreview(`activity-${idx}`)}
                        onReplace={() => activityInputRefs[idx].current?.click()}
                        onRemove={() => removeActivityPhoto(idx)}
                      />
                      {err && (
                        <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-2 text-2xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {err}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const f = lastActivityFiles[idx];
                              if (f) performActivityUpload(idx, f);
                              else activityInputRefs[idx].current?.click();
                            }}
                            className="shrink-0 font-bold underline"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] p-3 flex flex-col justify-between">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => activityInputRefs[idx].current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            activityInputRefs[idx].current?.click();
                          }
                        }}
                        className="border-2 border-dashed border-[#EADBCE] dark:border-emerald-950/60 hover:border-ngo-700/50 rounded-lg p-3 text-center transition-colors flex flex-col items-center justify-center min-h-[70px] cursor-pointer"
                      >
                        <ImagePlus className="h-5 w-5 text-stone-400 mb-1" />
                        <span className="text-3xs font-semibold text-stone-600 dark:text-stone-300">
                          Add Activity Photo {idx + 1}
                        </span>
                      </div>

                      {/* Demo Mode shortcut */}
                      {IS_NGO_DEMO_MODE && (
                        <div className="pt-1 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dummyBlob = new Blob(["demo activity content"], { type: "image/jpeg" });
                              const file = new File([dummyBlob], `activity-photo-${idx + 1}-demo.jpg`, { type: "image/jpeg" });
                              performActivityUpload(idx, file);
                            }}
                            className="text-3xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
                          >
                            Mark demo ✓
                          </button>
                        </div>
                      )}

                      {err && (
                        <div className="rounded bg-red-50 dark:bg-red-950/20 p-1.5 flex items-center justify-between text-3xs text-red-600 mt-1">
                          <span className="truncate">{err}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const f = lastActivityFiles[idx];
                              if (f) performActivityUpload(idx, f);
                              else activityInputRefs[idx].current?.click();
                            }}
                            className="font-bold underline ml-1 shrink-0"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-end gap-2 pt-2">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={missing.length > 0}
            className="flex items-center gap-1.5 rounded-xl bg-ngo-700 disabled:bg-stone-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed hover:bg-ngo-600 active:bg-ngo-800 px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {missing.length > 0 && (
          <p className="text-3xs text-stone-500 dark:text-stone-400 text-right pr-1">
            Still needed: {missing.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
