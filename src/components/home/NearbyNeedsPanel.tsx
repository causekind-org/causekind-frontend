"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PublicItemRequest } from "@/lib/api";

/**
 * What actually fills the hero's right column when no campaign is running.
 *
 * <p>The column has been empty by default. The code beside it says so outright:
 * the monetary campaign card "never renders while FEATURES.money is false —
 * roughly 40% of the hero is empty every other day of the year". Seasonal cards
 * cover it during their windows and nothing covers it the rest of the time.
 *
 * <p><b>Real requests, or nothing.</b> Every line here comes from the public need
 * board. There is deliberately no "you could help 3–5 people" style figure: an
 * invented impact number is a claim nobody can stand behind, and the true version
 * — these specific people are waiting — is more persuasive anyway.
 *
 * <p><b>City only.</b> `PublicItemRequestResponse` states the rule it is built
 * on: "City only. Never the pincode, and never the coordinates." This renders
 * what that projection gives and never asks for more.
 *
 * <p>Renders null when there is nothing to show, so an empty board leaves the
 * hero as it was rather than displaying an empty frame.
 */
export function NearbyNeedsPanel({ requests }: { requests: PublicItemRequest[] }) {
  const t = useTranslations("nearbyNeeds");

  const shown = requests.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <motion.div
      className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 65, damping: 18, delay: 0.35 }}
    >
      <p className="text-2xs font-black uppercase tracking-[0.2em] text-[#f0b97a]">
        {t("eyebrow")}
      </p>

      <ul className="mt-3.5 space-y-3">
        {shown.map((request) => (
          <li key={request.id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-bold text-white leading-snug line-clamp-1">
              {request.title}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-2xs text-white/60">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {/* City is the finest granularity the public projection carries. */}
              {request.city}
              <span className="text-white/30">·</span>
              {request.category}
            </p>
          </li>
        ))}
      </ul>

      <Link
        href="/requests"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#f0b97a] hover:text-white transition-colors"
      >
        {t("cta")}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </motion.div>
  );
}
