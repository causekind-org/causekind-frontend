import { describe, expect, it } from "vitest";

import type { PublicItemRequest } from "@/lib/api";
import {
  RAKSHA_BANDHAN_CAMPAIGN,
  daysWaiting,
  isRakshaBandhanCampaignActive,
  longestWaiting,
  waitingLabel,
} from "./raksha-bandhan";

function need(over: Partial<PublicItemRequest> = {}): PublicItemRequest {
  return {
    id: 1,
    title: "Winter blanket",
    category: "Household",
    quantity: 1,
    urgency: "NORMAL",
    city: "Nagpur",
    description: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    imageUrl: null,
    emergency: false,
    doneeFirstName: "Ramesh",
    ...over,
  };
}

describe("isRakshaBandhanCampaignActive", () => {
  it("shows the campaign during the 27 August – 1 September IST window", () => {
    // Raksha Bandhan itself, 28 August 2026, mid-morning IST.
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-28T06:00:00.000Z"), undefined)).toBe(true);
  });

  it("is already showing half an hour into the opening day", () => {
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-26T19:00:00.000Z"), undefined)).toBe(true);
  });

  it("still shows in the last hour of Tuesday 1 September IST", () => {
    expect(isRakshaBandhanCampaignActive(new Date("2026-09-01T17:30:00.000Z"), undefined)).toBe(true);
  });

  it("stays hidden either side of the window", () => {
    // One millisecond before midnight IST on the 27th.
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-26T18:29:59.999Z"), undefined)).toBe(false);
    // The closing boundary is exclusive — midnight IST on Wednesday the 2nd.
    expect(isRakshaBandhanCampaignActive(RAKSHA_BANDHAN_CAMPAIGN.endsAt, undefined)).toBe(false);
  });

  it("honours an immediate manual on or off override", () => {
    const outside = new Date("2026-07-01T00:00:00.000Z");

    expect(isRakshaBandhanCampaignActive(outside, "on")).toBe(true);
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-28T06:00:00.000Z"), "off")).toBe(false);
  });
});

describe("daysWaiting", () => {
  const now = new Date("2026-08-28T12:00:00.000Z");

  it("counts whole elapsed days, floored", () => {
    expect(daysWaiting("2026-08-27T12:00:00.000Z", now)).toBe(1);
    expect(daysWaiting("2026-07-12T12:00:00.000Z", now)).toBe(47);
    // 23 hours is not yet a day.
    expect(daysWaiting("2026-08-27T13:00:00.000Z", now)).toBe(0);
  });

  it("does not depend on the reader's timezone", () => {
    // The same instant expressed two ways must give the same duration. A
    // local-calendar-date difference would answer differently in Mumbai and
    // London for exactly this input.
    expect(daysWaiting("2026-08-20T18:30:00.000Z", now)).toBe(
      daysWaiting("2026-08-21T00:00:00+05:30", now),
    );
  });

  it("never returns a negative age for a future-dated row", () => {
    // Clock skew between the app server and the database must not render as
    // "waiting -3 days".
    expect(daysWaiting("2026-09-30T00:00:00.000Z", now)).toBe(0);
  });

  it("returns null rather than a confident zero for unusable input", () => {
    // A card that says "waiting 0 days" looks like an answer. Null lets the
    // caller render nothing instead.
    expect(daysWaiting(null, now)).toBeNull();
    expect(daysWaiting(undefined, now)).toBeNull();
    expect(daysWaiting("", now)).toBeNull();
    expect(daysWaiting("not a date", now)).toBeNull();
  });
});

describe("waitingLabel", () => {
  it("never renders '1 days'", () => {
    expect(waitingLabel(1)).toBe("waiting 1 day");
    expect(waitingLabel(2)).toBe("waiting 2 days");
    expect(waitingLabel(47)).toBe("waiting 47 days");
  });

  it("says 'since today' rather than counting zero", () => {
    expect(waitingLabel(0)).toBe("waiting since today");
  });
});

describe("longestWaiting", () => {
  const now = new Date("2026-08-28T12:00:00.000Z");

  it("returns the oldest first — the inverse of the board's own order", () => {
    const newest = need({ id: 1, createdAt: "2026-08-27T00:00:00.000Z" });
    const oldest = need({ id: 2, createdAt: "2026-07-01T00:00:00.000Z" });
    const middle = need({ id: 3, createdAt: "2026-08-10T00:00:00.000Z" });

    // Supplied newest-first, exactly as the backend serves it.
    const ordered = longestWaiting([newest, middle, oldest], undefined, now);

    expect(ordered.map(r => r.id)).toEqual([2, 3, 1]);
  });

  it("honours the limit", () => {
    const rows = [
      need({ id: 1, createdAt: "2026-08-01T00:00:00.000Z" }),
      need({ id: 2, createdAt: "2026-07-01T00:00:00.000Z" }),
      need({ id: 3, createdAt: "2026-06-01T00:00:00.000Z" }),
    ];

    expect(longestWaiting(rows, 2, now).map(r => r.id)).toEqual([3, 2]);
  });

  it("drops rows whose wait cannot be stated", () => {
    // Sorting them to one end would put a request with no date at the top of a
    // list whose entire purpose is to say how long each one has waited.
    const rows = [
      need({ id: 1, createdAt: "2026-08-01T00:00:00.000Z" }),
      need({ id: 2, createdAt: "" }),
      need({ id: 3, createdAt: "not a date" }),
    ];

    expect(longestWaiting(rows, undefined, now).map(r => r.id)).toEqual([1]);
  });

  it("does not mutate the array it was given", () => {
    // It is the same array HomeClient holds in state; sorting it in place would
    // silently reorder every other surface reading from it.
    const rows = [
      need({ id: 1, createdAt: "2026-08-01T00:00:00.000Z" }),
      need({ id: 2, createdAt: "2026-07-01T00:00:00.000Z" }),
    ];
    const before = rows.map(r => r.id);

    longestWaiting(rows, undefined, now);

    expect(rows.map(r => r.id)).toEqual(before);
  });

  it("returns an empty list for empty, null or undefined input", () => {
    expect(longestWaiting([], undefined, now)).toEqual([]);
    expect(longestWaiting(null, undefined, now)).toEqual([]);
    expect(longestWaiting(undefined, undefined, now)).toEqual([]);
  });
});
