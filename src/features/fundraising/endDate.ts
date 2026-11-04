/** The first day a fundraiser may end. The server needs a date after today (FundraisingCampaignService.missing). */
export const earliestEndDate = (now = Date.now()) => new Date(now + 86400000).toISOString().slice(0, 10);

/** The "by which date" answer becomes the page's last day; it must be a real date that is still to come. */
export const endDateOk = (v: string | null | undefined, now = Date.now()) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v ?? "") && v! >= earliestEndDate(now);
