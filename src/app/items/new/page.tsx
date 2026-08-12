"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormSkeleton, PageSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getItemListing, type ItemListing } from "@/lib/api";
import { ItemListingWizard } from "@/features/item-listing-wizard/ItemListingWizard";

/**
 * Create a listing, or resume one via `?draft=<id>`.
 *
 * <p>Thin by design: this used to be a 1005-line component that duplicated the
 * edit page. Everything now lives in the shared wizard feature.
 */
export default function NewItemPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading } = useAuth();

  const raw = params.get("draft");
  const urlDraftId = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  /**
   * The id WE put in the URL after creating a draft. It must be excluded from
   * the resume logic below: otherwise our own `router.replace` looks like the
   * user navigating to a different draft, and the wizard would refetch and
   * remount mid-edit, losing everything they had typed.
   */
  const createdIdRef = useRef<number | null>(null);
  const resumeId = urlDraftId != null && urlDraftId !== createdIdRef.current ? urlDraftId : null;

  const [listing, setListing] = useState<ItemListing | null>(null);
  const [loading, setLoading] = useState(resumeId != null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Route safety. Server ownership checks stay authoritative; this only avoids
  // showing a donor-only form to someone who cannot use it.
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "SUPER_ADMIN") { router.replace("/super-admin"); return; }
    if (user.role !== "DONOR" && user.role !== "ADMIN") { router.replace("/dashboard"); }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (resumeId == null) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    getItemListing(resumeId)
      .then(l => {
        if (!alive) return;
        if (l.status !== "DRAFT") {
          setLoadError("That listing is no longer a draft.");
        } else {
          setListing(l);
        }
      })
      .catch(() => { if (alive) setLoadError("We couldn't open that draft. It may have been removed, or it isn't yours."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [resumeId]);

  const handleDraftCreated = useCallback((id: number) => {
    createdIdRef.current = id;
    // replace, not push: a draft id appearing must not add a history entry the
    // donor has to press Back through.
    router.replace(`/items/new?draft=${id}`, { scroll: false });
  }, [router]);

  if (isLoading || loading) {
    // The wizard opens on a form, so hold that shape rather than centring a
    // spinner in 60dvh and then replacing it with fields.
    return (
      <PageSkeleton>
        <div className="mx-auto w-full max-w-[680px] space-y-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56 max-w-full" />
          <FormSkeleton fields={4} label="Loading the listing form" />
        </div>
      </PageSkeleton>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{loadError}</p>
        <button
          type="button"
          onClick={() => { createdIdRef.current = null; router.replace("/items/new"); }}
          className="mt-4 min-h-[44px] rounded-xl bg-[var(--ck-role-accent)] px-5 text-sm font-black text-white"
        >
          Start a new listing
        </button>
      </div>
    );
  }

  return (
    <ItemListingWizard
      // Keyed on the RESUME id only, which never changes as a result of our own
      // URL rewrite — so creating a draft can never remount the wizard.
      key={resumeId ?? "new"}
      mode={resumeId ? "draft" : "create"}
      listing={listing}
      initialDraftId={resumeId}
      onDraftCreated={handleDraftCreated}
    />
  );
}
