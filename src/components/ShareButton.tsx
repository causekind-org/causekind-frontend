"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * ShareButton — uses Web Share API when available (mobile native sheet),
 * falls back to copying the link on desktop/unsupported browsers.
 */
export function ShareButton({
  title,
  path,
  className = "",
}: {
  title: string;
  /** URL path (e.g. "/requests" — origin is auto-prepended) */
  path: string;
  className?: string;
}) {
  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : path;
    const text = `Check this on CauseKind: ${title}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      void navigator.clipboard?.writeText(url).then(
        () => toast.success("Link copied"),
        () => toast.error("Couldn't copy the link"),
      );
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share this"
      title="Share"
      className={`group flex items-center gap-1 text-stone-400 hover:text-[var(--ck-role-accent)] transition-colors ${className}`}
    >
      <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
    </button>
  );
}
