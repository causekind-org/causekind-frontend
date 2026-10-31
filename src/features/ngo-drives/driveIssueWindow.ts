import { formatIST } from "@/lib/formatIST";

/**
 * Drive-offer issue window, driven only by the backend's `issueWindowEndsAt`.
 * When the field is absent we keep the old behaviour (status decides).
 */
export function isDriveIssueWindowOpen(issueWindowEndsAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!issueWindowEndsAt) return true;
  const end = Date.parse(issueWindowEndsAt);
  return Number.isNaN(end) ? true : now < end;
}

/** "You can report a problem until 30 Oct, 4:30 PM IST." or null when unknown. */
export function driveIssueWindowLabel(issueWindowEndsAt: string | null | undefined): string | null {
  if (!issueWindowEndsAt || Number.isNaN(Date.parse(issueWindowEndsAt))) return null;
  return `You can report a problem until ${formatIST(issueWindowEndsAt)}.`;
}
