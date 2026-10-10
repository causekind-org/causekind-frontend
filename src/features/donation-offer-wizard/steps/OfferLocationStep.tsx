"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2, LocateFixed, MapPin, Navigation, TriangleAlert } from "lucide-react";
import { checkDonorDistance, type DonorDistanceCheck } from "@/lib/api";
import { usePinAddress } from "@/hooks/usePinAddress";
import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import type { OfferModel } from "../offerModel";

// The map is only for donors who can't (or won't) share their device location.
const LocationPinPicker = dynamic(() => import("@/components/LocationPinPicker"), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full animate-pulse rounded-xl bg-stone-100 dark:bg-zinc-800" role="status" aria-label="Loading map" />,
});

/** What the wizard needs to know to hold or allow Continue. */
export type OfferLocationStatus = {
  /** A location lookup or the distance check is still running. */
  busy: boolean;
  /** Outside the radius and the donor has not said yes yet. */
  needsConsent: boolean;
  /** Everything settled: location set, distance checked, and inside the radius or agreed to travel. */
  ready: boolean;
};

type Check =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "done"; result: DonorDistanceCheck }
  | { kind: "failed" };

/**
 * Offer wizard, step 1: where is the donor? (owner, 2026-10-09)
 *
 * <p>The location decides whether the donor can offer at all: within the
 * matching radius (10 km) the flow simply continues; further away, the donor
 * is shown the recipient's area and asked whether they will take the item
 * there if the recipient can't come. Yes records `donorDropOffAvailable` and
 * continues; No leaves the wizard. The same location becomes the offer's
 * pickup city, PIN code and locality, which replaced the old "Pickup &
 * delivery" step.
 *
 * <p>The distance is worked out on the server: the donor's browser is never
 * sent the recipient's coordinates, only whole kilometres and the area's
 * centre to about 1 km (ItemRequestService.checkDonorDistance).
 */
export function OfferLocationStep({
  requestId, model, errors, onChange, onDecline, onStatusChange,
}: {
  requestId: number;
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  /** "No, go back": leave the wizard for where the donor came from. */
  onDecline: () => void;
  onStatusChange: (status: OfferLocationStatus) => void;
}) {
  const pin = model.latitude != null && model.longitude != null ? { lat: model.latitude, lng: model.longitude } : null;
  const pinAddress = usePinAddress();
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [check, setCheck] = useState<Check>({ kind: "idle" });
  const checkSeq = useRef(0);

  const runCheck = useCallback(async (lat: number, lng: number) => {
    const mine = ++checkSeq.current;
    setCheck({ kind: "checking" });
    try {
      const result = await checkDonorDistance(requestId, lat, lng);
      if (mine === checkSeq.current) setCheck({ kind: "done", result });
    } catch {
      if (mine === checkSeq.current) setCheck({ kind: "failed" });
    }
  }, [requestId]);

  // A resumed draft already has a location: check it again on arrival.
  const checkedOnArrival = useRef(false);
  useEffect(() => {
    if (checkedOnArrival.current || !pin) return;
    checkedOnArrival.current = true;
    void runCheck(pin.lat, pin.lng);
  }, [pin, runCheck]);

  /** A new location from the device or the map: set it, fill the address, check the distance. */
  const place = useCallback((lat: number, lng: number) => {
    onChange("latitude", lat);
    onChange("longitude", lng);
    // A new place needs a new answer: any earlier "yes, I'll travel" was for the old one.
    onChange("donorDropOffAvailable", false);
    void runCheck(lat, lng);
    pinAddress.lookup(lat, lng, (found) => {
      // A field the lookup can't find is cleared, never kept from the old place.
      onChange("pickupCity", found.city ?? "");
      onChange("pickupPincode", found.pincode ?? "");
      onChange("pickupLocality", found.locality ?? "");
    }, () => {
      onChange("pickupCity", "");
      onChange("pickupPincode", "");
      onChange("pickupLocality", "");
    });
  }, [onChange, runCheck, pinAddress.lookup]); // eslint-disable-line react-hooks/exhaustive-deps

  function locateMe() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGpsError("This browser can't share your location. Find it on the map instead.");
      setShowMap(true);
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); place(pos.coords.latitude, pos.coords.longitude); },
      (err) => {
        setLocating(false);
        setShowMap(true);
        setGpsError(err.code === err.PERMISSION_DENIED
          ? "Location access is blocked. Allow it for this site, or find your location on the map below."
          : "We couldn't find your location. Find it on the map below.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  // ── Status for the wizard ──
  const result = check.kind === "done" ? check.result : null;
  const outside = !!result && result.located && !result.withinRadius;
  const busy = locating || pinAddress.running || check.kind === "checking";
  const needsConsent = outside && !model.donorDropOffAvailable;
  const ready = !!pin && !!model.pickupCity.trim() && !busy && !!result && !needsConsent;
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  useEffect(() => { statusRef.current({ busy, needsConsent, ready }); }, [busy, needsConsent, ready]);
  useEffect(() => () => { statusRef.current({ busy: false, needsConsent: false, ready: false }); }, []);

  const radius = result?.radiusKm ?? 10;
  const area = result?.area || "the recipient's area";
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const areaMap = outside && result?.approxLatitude != null && result.approxLongitude != null && mapKey
    ? `https://maps.googleapis.com/maps/api/staticmap?${new URLSearchParams({
        center: `${result.approxLatitude},${result.approxLongitude}`, zoom: "12", size: "640x260", scale: "2", key: mapKey,
      }).toString()}`
    : null;
  const [areaMapFailed, setAreaMapFailed] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        We use your location to check the donation radius: whether you are within <b>{radius} km</b> of the person
        who needs this item. It also becomes the pickup area for your offer.
      </p>

      <div data-field="latitude" tabIndex={-1} className="space-y-2 outline-none">
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--ck-role-hover)] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        >
          {locating
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding you…</>
            : <><LocateFixed className="h-4 w-4" aria-hidden /> {pin ? "Use my current location again" : "Use my current location"}</>}
        </button>
        {gpsError && <p role="alert" className="text-xs font-semibold text-amber-700 dark:text-amber-300">{gpsError}</p>}
        {errors.latitude && !pin && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{errors.latitude}</p>}

        {!showMap ? (
          <button type="button" onClick={() => setShowMap(true)}
            className="text-xs font-semibold text-stone-500 underline underline-offset-2 hover:text-stone-700 dark:text-stone-400">
            Can&apos;t use your location? Find it on the map
          </button>
        ) : (
          <LocationPinPicker pin={pin} onPick={(lat, lng) => place(lat, lng)} tone="donor" showSearch height={240} />
        )}
      </div>

      {/* Where the pickup is, once known. */}
      {pin && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          {pinAddress.running ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Looking up your area…
            </p>
          ) : model.pickupCity.trim() ? (
            <p className="flex items-start gap-1.5 text-sm text-stone-700 dark:text-stone-200">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
              <span><span className="text-stone-500 dark:text-stone-400">Pickup area: </span>
                <b>{[model.pickupLocality, model.pickupCity, model.pickupPincode].filter((x) => x.trim()).join(", ")}</b></span>
            </p>
          ) : (
            <WizardField label="Your city" required error={errors.pickupCity} hint="We couldn't read it from your location.">
              {({ id, describedBy, invalid }) => (
                <input id={id} name="pickupCity" value={model.pickupCity} className={controlClass}
                  aria-describedby={describedBy} aria-invalid={invalid}
                  onChange={(e) => onChange("pickupCity", e.target.value)} />
              )}
            </WizardField>
          )}
        </div>
      )}

      {/* The distance verdict. */}
      <div aria-live="polite">
        {check.kind === "checking" && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 dark:text-stone-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking the distance to the recipient…
          </p>
        )}
        {check.kind === "failed" && (
          <p role="alert" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
            We couldn&apos;t check the distance.
            {pin && <button type="button" className="underline" onClick={() => void runCheck(pin.lat, pin.lng)}>Try again</button>}
          </p>
        )}
        {result && !result.located && (
          <p className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300">
            We couldn&apos;t work out the distance for this request, so you can go ahead.
          </p>
        )}
        {result && result.located && result.withinRadius && (
          <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>You&apos;re about <b>{result.distanceKm} km</b> from the recipient{result.area ? <> ({result.area})</> : null}, within the {radius} km donation radius. Continue to offer your item.</span>
          </p>
        )}
        {outside && result && (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>The recipient is in <b>{area}</b>, about <b>{result.distanceKm} km</b> from you. That is outside your {radius} km donation radius.</span>
            </p>

            {areaMap && !areaMapFailed && (
              <figure className="overflow-hidden rounded-lg border border-amber-200 dark:border-amber-900">
                {/* eslint-disable-next-line @next/next/no-img-element -- external Static Maps image */}
                <img src={areaMap} alt={`Map of ${area}`} className="h-36 w-full object-cover" onError={() => setAreaMapFailed(true)} />
                <figcaption className="bg-white/70 px-3 py-1.5 text-2xs text-stone-500 dark:bg-zinc-900/70 dark:text-stone-400">
                  Approximate area. The exact address is shared once the handover is arranged.
                </figcaption>
              </figure>
            )}

            {model.donorDropOffAvailable ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm text-green-800 dark:bg-zinc-900 dark:text-green-300">
                <span className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  You&apos;ve agreed to take the item to {area} if the recipient can&apos;t come to you.</span>
                <button type="button" className="text-xs font-semibold text-stone-500 underline" onClick={() => onChange("donorDropOffAvailable", false)}>Change</button>
              </div>
            ) : (
              <div data-field="donorDropOffAvailable" tabIndex={-1} className="space-y-3 outline-none">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Do you want to donate outside your {radius} km area?</p>
                <p className="flex items-start gap-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-stone-700 dark:bg-zinc-900 dark:text-stone-300">
                  <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
                  If you say yes, be ready to travel to {area} and hand the item over yourself if the recipient can&apos;t come to you.
                </p>
                {errors.donorDropOffAvailable && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{errors.donorDropOffAvailable}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onChange("donorDropOffAvailable", true)}
                    className="min-h-[44px] rounded-xl bg-[var(--ck-role-accent)] px-4 text-sm font-bold text-white hover:bg-[var(--ck-role-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]">
                    Yes, I&apos;ll take it there
                  </button>
                  <button type="button" onClick={onDecline}
                    className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200">
                    No, go back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
