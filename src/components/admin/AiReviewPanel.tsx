"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import {
  adminGetListingAiReview, adminGetItemRequestAiReview, type AdminAiReviewResponse,
} from "@/lib/api";

function reviewBadgeClass(recommendation: string) {
  switch (recommendation) {
    case "APPROVE": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECT": return "border-red-200 bg-red-50 text-red-700";
    case "NEEDS_INFORMATION": return "border-amber-200 bg-amber-50 text-amber-700";
    default: return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function riskBadgeClass(riskLevel: string) {
  switch (riskLevel) {
    case "LOW": return "border-emerald-200 bg-white text-emerald-700";
    case "HIGH": return "border-red-200 bg-white text-red-700";
    default: return "border-amber-200 bg-white text-amber-700";
  }
}

/**
 * Structured AI review for a listing or item request — recommendation badge,
 * risk level, confidence, summary, evidence, and "use reason" shortcuts that
 * pre-fill the admin's reject / needs-info inputs.
 * Shared by the admin dashboard queues and the donee verification panel.
 */
export function AiReviewPanel({
  entity,
  id,
  onUseReason,
  onUseNeedsInfo,
}: {
  entity: "request" | "listing";
  id: number;
  onUseReason: (reason: string) => void;
  onUseNeedsInfo?: (reason: string) => void;
}) {
  const [review, setReview] = useState<AdminAiReviewResponse | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingReview(true);
    setReview(null);
    const loader = entity === "listing" ? adminGetListingAiReview : adminGetItemRequestAiReview;
    loader(id)
      .then(data => { if (active) setReview(data); })
      .catch(() => { if (active) setReview(null); })
      .finally(() => { if (active) setLoadingReview(false); });
    return () => { active = false; };
  }, [entity, id]);

  if (loadingReview) {
    return (
      <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-violet-500" onClick={event => event.stopPropagation()}>
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI reviewing...
        </span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-400" onClick={event => event.stopPropagation()}>
        AI review unavailable. Manual review still works.
      </div>
    );
  }

  const badgeClass = reviewBadgeClass(review.recommendation);
  const riskClass = riskBadgeClass(review.riskLevel);
  const canUseNeedsInfo = review.recommendation === "NEEDS_INFORMATION" && onUseNeedsInfo;
  const canUseReject = review.recommendation === "REJECT" || (review.recommendation === "NEEDS_INFORMATION" && !onUseNeedsInfo);

  return (
    <div
      className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5"
      onClick={event => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
            <Bot className="h-3.5 w-3.5" /> AI Review
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${badgeClass}`}>
            {review.recommendation.replace(/_/g, " ")}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskClass}`}>
            {review.riskLevel} risk
          </span>
        </div>
        <span className="text-[10px] font-bold text-stone-400">{Math.round(review.confidence)}% confidence</span>
      </div>

      <p className="mt-1.5 text-xs font-medium leading-relaxed text-stone-700">{review.summary}</p>

      {review.evidence.length > 0 && (
        <div className="mt-2 space-y-1">
          {review.evidence.slice(0, 2).map((item, index) => (
            <p key={index} className="text-[11px] leading-relaxed text-stone-500">- {item}</p>
          ))}
        </div>
      )}

      {(canUseReject || canUseNeedsInfo) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canUseReject && (
            <button
              type="button"
              onClick={() => onUseReason(review.suggestedAdminReason)}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 transition hover:bg-red-50"
            >
              {review.recommendation === "REJECT" ? "Use reject reason" : "Use AI note"}
            </button>
          )}
          {canUseNeedsInfo && (
            <button
              type="button"
              onClick={() => canUseNeedsInfo(review.suggestedAdminReason)}
              className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-700 transition hover:bg-amber-50"
            >
              Use needs-info note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
