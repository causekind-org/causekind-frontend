"use client";

import { useState } from "react";
import { Check, UserRound } from "lucide-react";
import { setVolunteerCallPermission, type NgoDriveOfferHandoverRecordResponse, type NgoDriveOfferResponse } from "@/lib/api";
import { formatPickupTime } from "@/features/ngo-drives/volunteer/VolunteerHandoverPage";

/** Who will collect the donor's items, and whether that person may call them. */
export function DonorPickupPersonCard({ offer, handover, onChanged }: {
  offer: NgoDriveOfferResponse;
  handover: NgoDriveOfferHandoverRecordResponse | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const person = offer.assignedPerson;

  const toggle = async (allowed: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await setVolunteerCallPermission(offer.id, allowed);
      onChanged();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="donor-pickup-person" className="mb-4 space-y-2 rounded-xl border border-stone-200 p-4 dark:border-zinc-700">
      <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
        <UserRound className="size-4" aria-hidden /> Pickup person
      </h3>
      {person ? (
        <p className="text-sm text-stone-800 dark:text-stone-200">
          {person.name}{person.role ? ` (${person.role})` : ""} from {offer.ngoName} will pick up your items
          {handover?.scheduledDateTime ? ` on ${formatPickupTime(handover.scheduledDateTime)}` : ""}.
        </p>
      ) : (
        <p className="text-sm text-stone-800 dark:text-stone-200">The NGO will assign someone for the pickup soon.</p>
      )}
      <label className="flex min-h-11 items-center gap-3 text-sm text-stone-800 dark:text-stone-200">
        <input type="checkbox" className="size-4" disabled={busy} checked={offer.donorAllowsVolunteerCall === true}
          onChange={(e) => void toggle(e.target.checked)} />
        Let the pickup person call me
      </label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

/** "Code confirmed by Ravi" / "Photo added by the NGO". */
export function WhoConfirmed({ handover }: { handover: NgoDriveOfferHandoverRecordResponse | null }) {
  const code = handover?.confirmation?.codeConfirmedBy;
  const photo = handover?.confirmation?.photoAddedBy;
  if (!code && !photo) return null;
  return (
    <ul data-testid="who-confirmed" className="space-y-1 rounded-xl border border-stone-200 p-3 text-sm text-stone-800 dark:border-zinc-700 dark:text-stone-200">
      {code && <li className="flex items-center gap-2"><Check className="size-4 shrink-0" aria-hidden />Code confirmed by {code}</li>}
      {photo && <li className="flex items-center gap-2"><Check className="size-4 shrink-0" aria-hidden />Photo added by {photo}</li>}
    </ul>
  );
}
