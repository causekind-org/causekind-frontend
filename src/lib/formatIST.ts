/**
 * Formats timestamps into Indian Standard Time (Asia/Kolkata, UTC+5:30).
 *
 * Requirements:
 * - Datetime with time: "22 Oct 2026, 10:21 am IST"
 * - Date-only (YYYY-MM-DD): "22 Oct 2026" (never shifted by timezone offset)
 * - Safe against null, undefined, invalid dates.
 */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatIST(dateInput: string | number | Date | null | undefined): string {
  if (dateInput == null || dateInput === "") return "";

  // 1. Plain calendar date (YYYY-MM-DD)
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = dateOnlyMatch[1];
      const monthIdx = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
  }

  // 2. Full timestamp
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    let str = String(dateInput).trim();
    // If it's an ISO string without offset or Z (e.g. "2026-10-22T04:51:00"), treat as UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
      str += "Z";
    }
    date = new Date(str);
  }

  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  // Format in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  let day = "";
  let month = "";
  let year = "";
  let hour = "";
  let minute = "";
  let dayPeriod = "";

  for (const part of parts) {
    if (part.type === "day") day = part.value;
    else if (part.type === "month") {
      const idx = parseInt(part.value, 10) - 1;
      month = MONTH_NAMES[idx] ?? part.value;
    }
    else if (part.type === "year") year = part.value;
    else if (part.type === "hour") hour = part.value;
    else if (part.type === "minute") minute = part.value;
    else if (part.type === "dayPeriod") dayPeriod = part.value.toLowerCase();
  }

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`;
}

/** Short date in IST (e.g. "22 Oct 2026") */
export function formatISTDate(dateInput: string | number | Date | null | undefined): string {
  if (dateInput == null || dateInput === "") return "";

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = dateOnlyMatch[1];
      const monthIdx = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
  }

  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    let str = String(dateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
      str += "Z";
    }
    date = new Date(str);
  }

  if (isNaN(date.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return formatter.format(date);
}
