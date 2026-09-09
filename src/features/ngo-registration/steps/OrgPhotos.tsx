"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, FileImage, ImagePlus, Trash2, Upload, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  IS_NGO_DEMO_MODE,
  getNextDemoPhotoId,
  type NGOFormState,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { uploadNgoPhoto } from "@/lib/api";
import { cn } from "@/lib/utils";

interface OrgPhotosProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function OrgPhotos({ data, onChange, onBack, onContinue }: OrgPhotosProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const officeInputRef = useRef<HTMLInputElement>(null);
  const activityInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [draggingLogo, setDraggingLogo] = useState(false);
  const [draggingOffice, setDraggingOffice] = useState(false);

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

  async function performLogoUpload(file: File) {
    setUploadingLogo(true);
    setLogoError(null);
    setLastLogoFile(file);

    // TEMPORARY: Demo Mode — skip real S3 upload when demo flag is active
    if (IS_NGO_DEMO_MODE) {
      setTimeout(() => {
        let previewUrl = "";
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          // ignore in non-browser env
        }
        onChange({
          logo: {
            name: file.name,
            photoId: getNextDemoPhotoId(),
            s3Url: previewUrl,
            s3Key: "demo/photos/logo.png",
            size: file.size,
            mimeType: file.type || "image/png",
            demo: true,
          },
        });
        setUploadingLogo(false);
      }, 400);
      return;
    }

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Logo upload failed. Please try another image.";
      setLogoError(msg);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function performOfficeUpload(file: File) {
    setUploadingOffice(true);
    setOfficeError(null);
    setLastOfficeFile(file);

    // TEMPORARY: Demo Mode — skip real S3 upload when demo flag is active
    if (IS_NGO_DEMO_MODE) {
      setTimeout(() => {
        let previewUrl = "";
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          // ignore in non-browser env
        }
        onChange({
          officePhoto: {
            name: file.name,
            photoId: getNextDemoPhotoId(),
            s3Url: previewUrl,
            s3Key: "demo/photos/office.jpg",
            size: file.size,
            mimeType: file.type || "image/jpeg",
            demo: true,
          },
        });
        setUploadingOffice(false);
      }, 400);
      return;
    }

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Office photo upload failed. Please try another image.";
      setOfficeError(msg);
    } finally {
      setUploadingOffice(false);
    }
  }

  async function performActivityUpload(index: number, file: File) {
    const nextUploading = [...uploadingActivity];
    nextUploading[index] = true;
    setUploadingActivity(nextUploading);

    const nextErrors = [...activityErrors];
    nextErrors[index] = null;
    setActivityErrors(nextErrors);

    const nextFiles = [...lastActivityFiles];
    nextFiles[index] = file;
    setLastActivityFiles(nextFiles);

    // TEMPORARY: Demo Mode — skip real S3 upload when demo flag is active
    if (IS_NGO_DEMO_MODE) {
      setTimeout(() => {
        let previewUrl = "";
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          // ignore in non-browser env
        }
        const nextPhotos = [...data.activityPhotos];
        nextPhotos[index] = {
          name: file.name,
          photoId: getNextDemoPhotoId(),
          s3Url: previewUrl,
          s3Key: `demo/photos/activity-${index + 1}.jpg`,
          size: file.size,
          mimeType: file.type || "image/jpeg",
          demo: true,
        };
        onChange({ activityPhotos: nextPhotos });
        const resetUploading = [...uploadingActivity];
        resetUploading[index] = false;
        setUploadingActivity(resetUploading);
      }, 400);
      return;
    }

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
    performLogoUpload(files[0]);
  }

  function handleOfficeFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    performOfficeUpload(files[0]);
  }

  function handleActivityFile(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    performActivityUpload(index, files[0]);
  }

  function removeActivityPhoto(index: number) {
    const next = [...data.activityPhotos];
    next[index] = null;
    onChange({ activityPhotos: next });
    const nextErrors = [...activityErrors];
    nextErrors[index] = null;
    setActivityErrors(nextErrors);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">
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
                Organization Logo
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                Square or transparent PNG recommended (PNG, JPG, WebP · max 8MB)
              </p>
            </div>
            {data.logo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-3xs font-bold text-green-700 dark:text-green-300">
                <Check className="h-3 w-3" /> Uploaded
              </span>
            )}
          </div>

          {data.logo ? (
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3.5 dark:border-green-900/40 dark:bg-green-950/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-bold text-xs">
                  <FileImage className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                    {data.logo.name}
                  </p>
                  <p className="text-3xs text-stone-500 dark:text-stone-400">
                    {data.logo.demo ? "Demo Logo Asset" : "Uploaded Image"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({ logo: null });
                  setLogoError(null);
                }}
                className="text-2xs font-bold text-stone-400 hover:text-red-500 transition-colors p-1"
                aria-label="Remove logo"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 overflow-hidden">
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                id="ngo-logo-upload"
                disabled={uploadingLogo}
                onChange={(e) => handleLogoFiles(e.target.files)}
              />
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  if (uploadingLogo) return;
                  e.preventDefault();
                  setDraggingLogo(true);
                }}
                onDragLeave={() => setDraggingLogo(false)}
                onDrop={(e) => {
                  if (uploadingLogo) return;
                  e.preventDefault();
                  setDraggingLogo(false);
                  handleLogoFiles(e.dataTransfer.files);
                }}
                onClick={() => {
                  if (!uploadingLogo) logoInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if (!uploadingLogo && (e.key === "Enter" || e.key === " ")) {
                    logoInputRef.current?.click();
                  }
                }}
                aria-label="Upload organization logo"
                className={cn(
                  "m-3 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 transition-colors",
                  uploadingLogo
                    ? "border-[#b04a15]/40 bg-[#b04a15]/5 cursor-wait"
                    : draggingLogo
                    ? "border-[#b04a15] bg-[#b04a15]/5 cursor-pointer"
                    : "border-stone-200 dark:border-zinc-700 hover:border-[#b04a15]/50 cursor-pointer"
                )}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#b04a15]" aria-hidden />
                    <p className="text-2xs font-bold text-[#b04a15]">Uploading & moderating logo…</p>
                    <p className="text-3xs text-stone-400">Running AI content moderation check</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-stone-400" aria-hidden />
                    <p className="text-2xs font-semibold text-stone-600 dark:text-stone-300">Click or drag logo here</p>
                    <p className="text-3xs text-stone-400">PNG, JPG or WebP · Max 8MB</p>
                  </>
                )}
              </div>

              {/* TEMPORARY: Demo Mode shortcut — instant complete on click */}
              {IS_NGO_DEMO_MODE && (
                <div className="border-t border-stone-200/70 dark:border-zinc-800 px-3.5 py-1.5 flex items-center justify-between bg-stone-100/50 dark:bg-zinc-800/40">
                  <span className="text-3xs font-medium text-stone-400 dark:text-stone-500">Demo mode active</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        logo: {
                          name: "organization-logo-demo.png",
                          photoId: getNextDemoPhotoId(),
                          s3Key: "demo/photos/logo.png",
                          size: 1024 * 64,
                          mimeType: "image/png",
                          demo: true,
                        },
                      });
                    }}
                    className="text-3xs font-bold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2"
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
                Registered Office Photo
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                Front entrance or nameboard of your registered address
              </p>
            </div>
            {data.officePhoto && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-3xs font-bold text-green-700 dark:text-green-300">
                <Check className="h-3 w-3" /> Uploaded
              </span>
            )}
          </div>

          {data.officePhoto ? (
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3.5 dark:border-green-900/40 dark:bg-green-950/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-bold text-xs">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                    {data.officePhoto.name}
                  </p>
                  <p className="text-3xs text-stone-500 dark:text-stone-400">
                    {data.officePhoto.demo ? "Demo Office Image" : "Uploaded Image"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({ officePhoto: null });
                  setOfficeError(null);
                }}
                className="text-2xs font-bold text-stone-400 hover:text-red-500 transition-colors p-1"
                aria-label="Remove office photo"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 overflow-hidden">
              <input
                ref={officeInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                id="ngo-office-upload"
                disabled={uploadingOffice}
                onChange={(e) => handleOfficeFiles(e.target.files)}
              />
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  if (uploadingOffice) return;
                  e.preventDefault();
                  setDraggingOffice(true);
                }}
                onDragLeave={() => setDraggingOffice(false)}
                onDrop={(e) => {
                  if (uploadingOffice) return;
                  e.preventDefault();
                  setDraggingOffice(false);
                  handleOfficeFiles(e.dataTransfer.files);
                }}
                onClick={() => {
                  if (!uploadingOffice) officeInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if (!uploadingOffice && (e.key === "Enter" || e.key === " ")) {
                    officeInputRef.current?.click();
                  }
                }}
                aria-label="Upload office photo"
                className={cn(
                  "m-3 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-4 transition-colors",
                  uploadingOffice
                    ? "border-[#b04a15]/40 bg-[#b04a15]/5 cursor-wait"
                    : draggingOffice
                    ? "border-[#b04a15] bg-[#b04a15]/5 cursor-pointer"
                    : "border-stone-200 dark:border-zinc-700 hover:border-[#b04a15]/50 cursor-pointer"
                )}
              >
                {uploadingOffice ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#b04a15]" aria-hidden />
                    <p className="text-2xs font-bold text-[#b04a15]">Uploading office photo…</p>
                    <p className="text-3xs text-stone-400">Running AI moderation check</p>
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-stone-400" aria-hidden />
                    <p className="text-2xs font-semibold text-stone-600 dark:text-stone-300">Click or drag office photo</p>
                    <p className="text-3xs text-stone-400">JPG, PNG, WebP · Max 8MB</p>
                  </>
                )}
              </div>

              {/* TEMPORARY: Demo Mode shortcut — instant complete on click */}
              {IS_NGO_DEMO_MODE && (
                <div className="border-t border-stone-200/70 dark:border-zinc-800 px-3.5 py-1.5 flex items-center justify-between bg-stone-100/50 dark:bg-zinc-800/40">
                  <span className="text-3xs font-medium text-stone-400 dark:text-stone-500">Demo mode active</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        officePhoto: {
                          name: "office-front-entrance-demo.jpg",
                          photoId: getNextDemoPhotoId(),
                          s3Key: "demo/photos/office.jpg",
                          size: 1024 * 250,
                          mimeType: "image/jpeg",
                          demo: true,
                        },
                      });
                    }}
                    className="text-3xs font-bold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[0, 1, 2].map((idx) => {
              const photo = data.activityPhotos[idx];
              const isUploadingThis = uploadingActivity[idx];
              const err = activityErrors[idx];

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between"
                >
                  <input
                    ref={activityInputRefs[idx]}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    id={`activity-photo-${idx}`}
                    disabled={isUploadingThis}
                    onChange={(e) => handleActivityFile(idx, e.target.files)}
                  />

                  {photo ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-3xs font-bold">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeActivityPhoto(idx)}
                          className="text-stone-400 hover:text-red-500 transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-2 text-center">
                        <Check className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <p className="text-3xs font-bold text-stone-700 dark:text-stone-300 truncate">
                          {photo.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!isUploadingThis) activityInputRefs[idx].current?.click();
                        }}
                        onKeyDown={(e) => {
                          if (!isUploadingThis && (e.key === "Enter" || e.key === " ")) {
                            activityInputRefs[idx].current?.click();
                          }
                        }}
                        className={cn(
                          "border-2 border-dashed border-stone-200 dark:border-zinc-700 hover:border-[#b04a15]/50 rounded-lg p-3 text-center transition-colors flex-1 flex flex-col items-center justify-center min-h-[90px]",
                          isUploadingThis ? "cursor-wait bg-[#b04a15]/5 border-[#b04a15]/40" : "cursor-pointer"
                        )}
                      >
                        {isUploadingThis ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-[#b04a15] mb-1" />
                            <span className="text-3xs font-bold text-[#b04a15]">
                              Uploading…
                            </span>
                          </>
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5 text-stone-400 mb-1" />
                            <span className="text-3xs font-semibold text-stone-600 dark:text-stone-300">
                              Add Photo {idx + 1}
                            </span>
                          </>
                        )}
                      </div>

                      {/* TEMPORARY: Demo Mode shortcut — quick complete */}
                      {IS_NGO_DEMO_MODE && (
                        <div className="pt-1 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextPhotos = [...data.activityPhotos];
                              nextPhotos[idx] = {
                                name: `activity-photo-${idx + 1}-demo.jpg`,
                                photoId: getNextDemoPhotoId(),
                                s3Key: `demo/photos/activity-${idx + 1}.jpg`,
                                size: 1024 * 180,
                                mimeType: "image/jpeg",
                                demo: true,
                              };
                              onChange({ activityPhotos: nextPhotos });
                            }}
                            className="text-3xs font-bold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2"
                          >
                            Mark demo ✓
                          </button>
                        </div>
                      )}

                      {err && (
                        <div className="rounded bg-red-50 dark:bg-red-950/20 p-1.5 flex items-center justify-between text-3xs text-red-600">
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
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-1.5 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
