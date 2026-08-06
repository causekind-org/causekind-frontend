"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getItemListing, type ItemListing } from "@/lib/api";
import { displayReason } from "@/lib/rejectionReason";
import { ItemListingWizard } from "@/features/item-listing-wizard/ItemListingWizard";

/** Statuses this route can actually edit. Anything else gets a clear message. */
const EDITABLE = new Set(["DRAFT", "NEEDS_INFORMATION"]);

/**
 * Edit / resubmit an existing listing — the same canonical wizard as `/items/new`.
 * This page previously carried its own 710-line copy of the form, with its own
 * validation and its own payload builder.
 */
export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading } = useAuth();

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;

  const [listing, setListing] = useState<ItemListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "SUPER_ADMIN") { router.replace("/super-admin"); return; }
    if (user.role !== "DONOR" && user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (id == null) { setLoadError("That listing address isn't valid."); setLoading(false); return; }
    let alive = true;
    getItemListing(id)
      .then(l => {
        if (!alive) return;
        if (!EDITABLE.has(l.status)) {
          setLoadError(`This listing is ${l.status.replace(/_/g, " ").toLowerCase()} and can no longer be edited.`);
        } else {
          setListing(l);
        }
      })
      // The server owns authorisation; 401/403/404 all land here and get the
      // same non-committal message rather than leaking whether the id exists.
      .catch(() => { if (alive) setLoadError("We couldn't open that listing. It may have been removed, or it isn't yours."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (isLoading || loading) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--ck-role-accent)]" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (loadError || !listing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {loadError ?? "We couldn't open that listing."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-4 min-h-[44px] rounded-xl bg-[var(--ck-role-accent)] px-5 text-sm font-black text-white"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <ItemListingWizard
      mode={listing.status === "NEEDS_INFORMATION" ? "needs-info" : "draft"}
      listing={listing}
      initialDraftId={listing.id}
      adminNote={listing.rejectionReason ? displayReason(listing.rejectionReason) : null}
    />
  );
}
