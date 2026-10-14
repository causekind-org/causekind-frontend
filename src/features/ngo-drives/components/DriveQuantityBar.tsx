/**
 * Drive progress for the NGO side: received, on the way (pledged, not yet handed over)
 * and still needed. Used by the dashboard drive card and the NGO drive page so both show
 * the same numbers.
 */
export function DriveQuantityBar({ needed, received, pledged, unit, compact = false }: {
  needed: number; received: number; pledged: number; unit?: string; compact?: boolean;
}) {
  const total = Math.max(1, needed);
  const still = Math.max(0, needed - received - pledged);
  const receivedPct = Math.min(100, (received / total) * 100);
  const pledgedPct = Math.min(100 - receivedPct, (pledged / total) * 100);
  const u = unit ? ` ${unit.replaceAll("_", " ").toLowerCase()}` : "";
  const stats: [string, number, string][] = [
    ["Received", received, "bg-ngo-600"],
    ["On the way", pledged, "bg-ngo-300 dark:bg-ngo-700"],
    ["Still needed", still, "bg-stone-300 dark:bg-zinc-600"],
  ];
  return (
    <div>
      <div className={`flex w-full overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800 ${compact ? "h-2" : "h-3"}`}
        role="progressbar" aria-label="Drive progress" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={received + pledged}>
        <div className="h-full bg-ngo-600" style={{ width: `${receivedPct}%` }} />
        <div className="h-full bg-ngo-300 dark:bg-ngo-700" style={{ width: `${pledgedPct}%` }} />
      </div>
      <dl className={`mt-2 grid grid-cols-3 gap-2 ${compact ? "text-xs" : "text-sm"}`}>
        {stats.map(([label, value, swatch]) => (
          <div key={label} className="flex flex-col">
            <dt className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              <span className={`h-2 w-2 shrink-0 rounded-full ${swatch}`} aria-hidden="true" />{label}
            </dt>
            <dd className="font-bold text-stone-900 dark:text-stone-100">{value}{u}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
