"use client";

import { useEffect, useState } from "react";
import { readUrlParam, statusIndexFromUrl, writeUrlParams } from "@/components/admin/adminUrlState";
import { formatIST } from "@/lib/formatIST";
import { serverDate } from "@/lib/serverTime";

/** One status tab: its ?status= value ("" = All), label and the statuses it lists. */
export type StatusTab = { value: string; text: string; matches: (status: string) => boolean };

/** The standard waiting / approved / not approved / all tab set (first is the default). */
export function reviewTabs(waiting: string, rejected: string): StatusTab[] {
  return [
    { value: "PENDING", text: waiting, matches: (s) => s === "PENDING" },
    { value: "APPROVED", text: "Approved", matches: (s) => s === "APPROVED" },
    { value: "REJECTED", text: rejected, matches: (s) => s === "REJECTED" },
    { value: "", text: "All", matches: () => true },
  ];
}

/** ?status= (default: the first tab) and ?q= for an admin panel; both leave the URL when it unmounts. */
export function useAdminStatusTabs(tabs: StatusTab[]) {
  const [index, setIndex] = useState(() => statusIndexFromUrl(tabs, 0));
  const [query, setQuery] = useState(() => readUrlParam("q").trim().slice(0, 100));
  useEffect(() => { writeUrlParams({ status: index === 0 ? null : tabs[index].value || "ALL" }); }, [index, tabs]);
  useEffect(() => { writeUrlParams({ q: query || null }); }, [query]);
  useEffect(() => () => writeUrlParams({ q: null, status: null }), []);
  return { index, setIndex, tab: tabs[index], query, setQuery };
}

/** Tab labels with how many items each holds, e.g. "Approved (3)". */
export function tabOptions<T>(tabs: StatusTab[], items: T[], statusOf: (item: T) => string) {
  return tabs.map((t) => ({ label: `${t.text} (${items.filter((x) => t.matches(statusOf(x))).length})` }));
}

/** A decided item: the decision, who and when (IST), and the reason. */
export function DecisionLine({ status, by, at, reason, rejectedText = "Not approved" }: {
  status: string; by?: string | null; at?: string | null; reason?: string | null; rejectedText?: string;
}) {
  if (status !== "APPROVED" && status !== "REJECTED") return null;
  const approved = status === "APPROVED";
  return (
    <div data-testid="decision-line" className={`mt-3 rounded-lg border p-3 text-xs ${approved ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
      <p className="font-bold">{approved ? "Approved" : rejectedText}{by ? ` by ${by}` : ""}{at ? ` · ${formatIST(serverDate(at))}` : ""}</p>
      {reason && <p className="mt-1 ck-user-text">Reason: {reason}</p>}
    </div>
  );
}
