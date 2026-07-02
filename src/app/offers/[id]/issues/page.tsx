"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDonationOffer, reportPostDeliveryIssue, type DonationOffer } from "@/lib/api";

const ISSUE_TYPES = [
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "UNDISCLOSED_DAMAGE", label: "Undisclosed damage or defect" },
  { value: "MISSING_ACCESSORIES", label: "Required accessories missing" },
  { value: "UNSAFE_ITEM", label: "Item appears unsafe" },
  { value: "MONEY_DEMANDED", label: "Donor demanded payment" },
  { value: "INAPPROPRIATE_BEHAVIOUR", label: "Inappropriate behaviour" },
  { value: "OTHER", label: "Other" },
];

export default function ReportIssuePage() {
  const params = useParams();
  const router = useRouter();
  const offerId = Number(params.id);

  const [offer, setOffer] = useState<DonationOffer | null>(null);
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getDonationOffer(offerId).then(setOffer).catch(() => {});
  }, [offerId]);

  async function handleSubmit() {
    if (!issueType) { setError("Please select an issue type"); return; }
    if (description.trim().length < 20) { setError("Please describe the issue in at least 20 characters"); return; }
    setSubmitting(true); setError(null);
    try {
      await reportPostDeliveryIssue(offerId, {
        issueType,
        description: description.trim(),
        windowCategory: offer?.requestCategory?.toLowerCase() === "electronics" ? "ELECTRONICS" : "GENERAL",
      });
      setSubmitted(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to submit"); }
    finally { setSubmitting(false); }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-sm w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950 text-2xl">!</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Issue Reported</h2>
          <p className="mt-2 text-sm text-gray-500">Our team will review your report and reach out within 24 hours.</p>
          <button onClick={() => router.push("/offers")} className="mt-6 rounded-xl bg-[#b04a15] px-6 py-2.5 text-sm font-semibold text-white">
            Back to Offers
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="mx-auto max-w-lg px-4 pt-8 space-y-5">
        <div>
          <button onClick={() => router.back()} className="mb-2 text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Report an Issue</h1>
          {offer && <p className="text-sm text-gray-500">{offer.requestTitle}</p>}
        </div>

        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          This is not a return process. You can only report: wrong item, undisclosed damage, missing accessories, unsafe item, money demanded, or inappropriate behaviour.
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Issue Type *</label>
            <div className="space-y-2">
              {ISSUE_TYPES.map(({ value, label }) => (
                <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  issueType === value ? "border-[#b04a15] bg-orange-50 dark:bg-orange-950/30" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  <input type="radio" name="issueType" value={value} checked={issueType === value}
                    onChange={() => setIssueType(value)} className="text-[#b04a15]" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Describe the issue *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Please describe exactly what happened..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[#b04a15] resize-none"
            />
            <p className="mt-1 text-xs text-gray-400">{description.length} / 500 characters</p>
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full rounded-xl bg-[#b04a15] py-3 text-sm font-semibold text-white hover:bg-[#c45520] transition-colors disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Issue Report"}
          </button>
        </div>
      </div>
    </main>
  );
}
