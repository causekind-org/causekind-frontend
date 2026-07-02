"use client";

import { type CompatibilityIndicator as IndicatorType } from "@/lib/api";

const CONFIG: Record<
  IndicatorType,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  STRONG_MATCH: {
    label: "Strong Match",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
    icon: "✓",
  },
  POSSIBLE_MATCH: {
    label: "Possible Match",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: "~",
  },
  SOME_SPECS_DONT_MATCH: {
    label: "Some Specs Don't Match",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    icon: "!",
  },
  NOT_ELIGIBLE: {
    label: "Not Eligible for This Request",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon: "✕",
  },
};

interface Props {
  indicator: IndicatorType;
  explanation?: string;
  breakdown?: {
    categoryMatch: boolean;
    quantityMatch: boolean;
    conditionOk: boolean;
  };
  className?: string;
}

export default function CompatibilityIndicator({
  indicator,
  explanation,
  breakdown,
  className = "",
}: Props) {
  const cfg = CONFIG[indicator];

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border} ${className}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${cfg.color} ${cfg.border}`}
        >
          {cfg.icon}
        </span>
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>

      {explanation && (
        <p className={`mt-1.5 text-sm ${cfg.color} opacity-90`}>{explanation}</p>
      )}

      {breakdown && (
        <ul className="mt-2 space-y-0.5">
          <BreakdownRow label="Category" ok={breakdown.categoryMatch} />
          <BreakdownRow label="Quantity" ok={breakdown.quantityMatch} />
          <BreakdownRow label="Condition" ok={breakdown.conditionOk} />
        </ul>
      )}
    </div>
  );
}

function BreakdownRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <span className={ok ? "text-green-600" : "text-red-500"}>{ok ? "✓" : "✕"}</span>
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
    </li>
  );
}
