"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { toast } from "@/lib/toast";

interface AvatarUploadProps {
  imageDataUrl: string | null;
  initials: string;
  onImageChange: (dataUrl: string | null) => void;
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function AvatarUpload({ imageDataUrl, initials, onImageChange }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Image must be 2 MB or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        onImageChange(result);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circle avatar */}
      <div className="relative w-24 h-24 shrink-0">
        {imageDataUrl ? (
          <img
            src={imageDataUrl}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-md"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] border-4 border-white dark:border-zinc-900 shadow-md flex items-center justify-center">
            <span className="text-white text-3xl font-bold uppercase select-none">
              {initials}
            </span>
          </div>
        )}

        {/* Camera button — overlapping bottom-right edge */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload profile photo"
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#b04a15] hover:bg-[#963c0d] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Remove photo link — only when image exists */}
      {imageDataUrl && (
        <button
          type="button"
          onClick={() => onImageChange(null)}
          className="inline-flex w-fit text-xs text-stone-400 hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
        >
          Remove photo
        </button>
      )}
    </div>
  );
}
