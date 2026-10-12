/**
 * Reads a timestamp from the backend.
 *
 * The backend sends `LocalDateTime` with no zone, and the server clock is UTC,
 * so a zone-less stamp is UTC. `new Date()` would read it as the viewer's local
 * time, which in India shows every time 5.5 hours early (a message sent at
 * 14:18 IST showed 08:48). Stamps that already carry a zone, and plain dates,
 * are read as they are.
 */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const zoned = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) || !iso.includes("T");
  const d = new Date(zoned ? iso : iso + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "14:18"-style time of a backend timestamp, in the viewer's own time zone. */
export function formatServerTime(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}
