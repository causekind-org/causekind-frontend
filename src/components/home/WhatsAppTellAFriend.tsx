"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";
import { trackMetaCustom } from "@/lib/metaEvents";
import { trackClarity } from "@/lib/clarityEvents";

export const WHATSAPP_INVITE_MESSAGE =
  "Hey! I found CauseKind — you can give things you don't need (books, clothes, furniture…) to verified people nearby who need them. It's free. Take a look: https://www.causekind.com/?utm_source=whatsapp&utm_medium=share&utm_campaign=invite";

export const WHATSAPP_INVITE_URL = `https://wa.me/?text=${encodeURIComponent(
  WHATSAPP_INVITE_MESSAGE
)}`;

/**
 * Clean SVG WhatsApp Logo
 */
export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm-3.53 4.44c-.2-.01-.43 0-.62.03-.25.04-.54.15-.75.4-.3.35-.97 1.01-.97 2.42s1.02 2.76 1.16 2.95c.14.2 1.95 3.12 4.84 4.25 2.4.94 2.89.75 3.41.7 1.04-.1 1.74-.75 1.98-1.48.24-.73.24-1.36.17-1.49-.07-.13-.26-.2-.55-.35-.29-.15-1.73-.85-2-.95-.27-.1-.47-.15-.67.15-.2.3-.77.95-.94 1.15-.17.2-.34.22-.63.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.52-.08-.15-.65-1.61-.92-2.22-.26-.61-.53-.52-.73-.53z" />
    </svg>
  );
}

/**
 * Shared share handler with Web Share API and WhatsApp fallback
 */
export async function handleWhatsAppShare() {
  try {
    trackMetaCustom("ShareClick", { channel: "whatsapp" });
    trackClarity("share_click");
  } catch {}

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "CauseKind — Verified In-Kind Giving",
        text: WHATSAPP_INVITE_MESSAGE,
      });
      return;
    } catch {
      // User cancelled or share aborted — do nothing
      return;
    }
  }

  // Desktop or browsers without navigator.share fallback
  window.open(WHATSAPP_INVITE_URL, "_blank", "noopener,noreferrer");
}

/**
 * "Tell a friend on WhatsApp" button with heart burst animation & pulsing icon
 */
export function WhatsAppTellAFriendButton({
  className = "",
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "green";
}) {
  const [bursting, setBursting] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setBursting(true);
    setTimeout(() => setBursting(false), 900);
    await handleWhatsAppShare();
  };

  const isGreen = variant === "green";

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Heart Burst Particle Effect */}
      {bursting && (
        <div className="absolute -top-3 inset-x-0 flex justify-center pointer-events-none z-30">
          <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-[#B5480F]/30" />
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-bounce" />
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        aria-label="Tell a friend on WhatsApp"
        className={`group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-[13px] tracking-wide transition-all duration-200 active:scale-95 cursor-pointer ${
          isGreen
            ? "bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-[#25D366]/20"
            : "border border-stone-600/70 hover:border-stone-400 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white shadow-xs backdrop-blur-xs"
        } ${className}`}
      >
        {/* Pulsing WhatsApp icon */}
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366]/40 opacity-75 animate-ping duration-1000" />
          <WhatsAppIcon
            className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
              isGreen ? "text-white" : "text-[#25D366]"
            }`}
          />
        </span>
        <span>Tell a friend on WhatsApp</span>
      </button>
    </div>
  );
}
