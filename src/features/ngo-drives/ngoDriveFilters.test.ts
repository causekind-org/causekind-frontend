import { describe, expect, it } from "vitest";
import {
  formatDriveUrgency,
  driveUrgencyWeight,
  sortNgoDrives,
  filterNgoDrives,
  formatDaysLeft,
  formatBeneficiarySupport,
  mapNgoCategoryToRequestCategory,
  interleaveNeeds,
} from "./ngoDriveFilters";
import type { ItemRequest, PublicNgoDrive } from "@/lib/api";

describe("ngoDriveFilters unit tests", () => {
  describe("formatDriveUrgency", () => {
    it("maps CRITICAL and URGENT to 'Urgent'", () => {
      expect(formatDriveUrgency("CRITICAL")).toBe("Urgent");
      expect(formatDriveUrgency("URGENT")).toBe("Urgent");
    });

    it("maps HIGH to 'High'", () => {
      expect(formatDriveUrgency("HIGH")).toBe("High");
    });

    it("maps NORMAL and missing to 'Normal'", () => {
      expect(formatDriveUrgency("NORMAL")).toBe("Normal");
      expect(formatDriveUrgency(null)).toBe("Normal");
      expect(formatDriveUrgency(undefined)).toBe("Normal");
    });
  });

  describe("formatDaysLeft", () => {
    it("returns 'Ends today' and isAmber: true when target is today", () => {
      const today = new Date().toISOString();
      const res = formatDaysLeft(today);
      expect(res).not.toBeNull();
      expect(res?.label).toBe("Ends today");
      expect(res?.isAmber).toBe(true);
    });

    it("returns '1 day left' and isAmber: true when 1 day away", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const res = formatDaysLeft(tomorrow.toISOString());
      expect(res).not.toBeNull();
      expect(res?.label).toBe("1 day left");
      expect(res?.isAmber).toBe(true);
    });

    it("returns amber for 3 days left and non-amber for 5 days left", () => {
      const in3 = new Date();
      in3.setDate(in3.getDate() + 3);
      expect(formatDaysLeft(in3.toISOString())?.isAmber).toBe(true);

      const in5 = new Date();
      in5.setDate(in5.getDate() + 5);
      expect(formatDaysLeft(in5.toISOString())?.isAmber).toBe(false);
    });

    it("returns null when neededBy is missing or in the past", () => {
      expect(formatDaysLeft(null)).toBeNull();
      const past = new Date();
      past.setDate(past.getDate() - 2);
      expect(formatDaysLeft(past.toISOString())).toBeNull();
    });
  });

  describe("formatBeneficiarySupport", () => {
    it("handles count and group pluralization cleanly", () => {
      expect(formatBeneficiarySupport(100, "Students")).toBe("Support 100 Students");
      expect(formatBeneficiarySupport(1, "Students")).toBe("Support 1 Student");
      expect(formatBeneficiarySupport(50, "Children")).toBe("Support 50 Children");
      expect(formatBeneficiarySupport(1, "Children")).toBe("Support 1 Child");
      expect(formatBeneficiarySupport(1, null)).toBe("Support 1 person");
      expect(formatBeneficiarySupport(10, null)).toBe("Support 10 people");
      expect(formatBeneficiarySupport(null, null)).toBe("Support community");
    });
  });

  describe("mapNgoCategoryToRequestCategory", () => {
    it("maps exact matching categories directly", () => {
      expect(mapNgoCategoryToRequestCategory("Education")).toBe("Education");
      expect(mapNgoCategoryToRequestCategory("Livelihood")).toBe("Livelihood");
      expect(mapNgoCategoryToRequestCategory("Relief")).toBe("Relief");
      expect(mapNgoCategoryToRequestCategory("Clothing")).toBe("Clothing");
    });

    it("maps Medical alias to 'Medical aid'", () => {
      expect(mapNgoCategoryToRequestCategory("Medical")).toBe("Medical aid");
      expect(mapNgoCategoryToRequestCategory("Medical aid")).toBe("Medical aid");
    });

    it("returns null for unmapped categories", () => {
      expect(mapNgoCategoryToRequestCategory("Community")).toBeNull();
      expect(mapNgoCategoryToRequestCategory("Animals")).toBeNull();
      expect(mapNgoCategoryToRequestCategory("Environment")).toBeNull();
      expect(mapNgoCategoryToRequestCategory(null)).toBeNull();
    });
  });

  describe("sortNgoDrives", () => {
    it("places Urgent/CRITICAL drives first, then nearest neededBy", () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);

      const drives: PublicNgoDrive[] = [
        {
          id: 1,
          title: "Drive 1 - Normal Soon",
          urgency: "NORMAL",
          neededBy: nextWeek.toISOString(),
          status: "LIVE",
          category: "Education",
          quantityNeeded: 10,
          quantityReceived: 0,
          quantityPledged: 0,
          unit: "BAGS",
          itemName: "Bags",
          beneficiaryCount: 10,
          beneficiaryGroup: "Students",
          ngoOrganizationName: "NGO",
          ngoCity: "Mumbai",
          referencePhotoUrl: null,
          driveType: "ITEMS",
        },
        {
          id: 2,
          title: "Drive 2 - Urgent Later",
          urgency: "CRITICAL",
          neededBy: nextMonth.toISOString(),
          status: "LIVE",
          category: "Medical aid",
          quantityNeeded: 5,
          quantityReceived: 0,
          quantityPledged: 0,
          unit: "KITS",
          itemName: "Kits",
          beneficiaryCount: 5,
          beneficiaryGroup: "Patients",
          ngoOrganizationName: "NGO",
          ngoCity: "Pune",
          referencePhotoUrl: null,
          driveType: "ITEMS",
        },
        {
          id: 3,
          title: "Drive 3 - Urgent Soonest",
          urgency: "CRITICAL",
          neededBy: nextWeek.toISOString(),
          status: "LIVE",
          category: "Relief",
          quantityNeeded: 20,
          quantityReceived: 0,
          quantityPledged: 0,
          unit: "BOXES",
          itemName: "Ration",
          beneficiaryCount: 20,
          beneficiaryGroup: "Families",
          ngoOrganizationName: "NGO",
          ngoCity: "Thane",
          referencePhotoUrl: null,
          driveType: "ITEMS",
        },
      ];

      const sorted = sortNgoDrives(drives);
      expect(sorted[0].id).toBe(3); // Urgent & sooner
      expect(sorted[1].id).toBe(2); // Urgent & later
      expect(sorted[2].id).toBe(1); // Normal
    });
  });

  describe("interleaveNeeds", () => {
    it("places urgent items first and preserves relative ordering", () => {
      const requests: ItemRequest[] = [
        {
          id: 101,
          title: "Urgent Request A",
          urgency: "CRITICAL",
          isEmergency: true,
          category: "Medical aid",
          quantity: 1,
          city: "Mumbai",
          description: "urgent",
          createdAt: "2026-09-01T00:00:00Z",
          imageUrl: null,
          requesterType: "PERSON",
          organizationName: null,
          doneeName: "Raj",
          pincode: null,
          status: "OPEN",
          rejectionReason: null,
          doneeId: 1,
          pickupRadiusKm: null,
          latitude: null,
          longitude: null,
          verificationTier: null,
          emergencyNature: null,
          incidentDate: null,
          verificationDueAt: null,
        },
        {
          id: 102,
          title: "Regular Request B",
          urgency: "NORMAL",
          isEmergency: false,
          category: "Education",
          quantity: 2,
          city: "Delhi",
          description: "regular",
          createdAt: "2026-09-02T00:00:00Z",
          imageUrl: null,
          requesterType: "PERSON",
          organizationName: null,
          doneeName: "Amit",
          pincode: null,
          status: "OPEN",
          rejectionReason: null,
          doneeId: 2,
          pickupRadiusKm: null,
          latitude: null,
          longitude: null,
          verificationTier: null,
          emergencyNature: null,
          incidentDate: null,
          verificationDueAt: null,
        },
      ];

      const drives: PublicNgoDrive[] = [
        {
          id: 201,
          title: "Urgent Drive X",
          urgency: "CRITICAL",
          neededBy: null,
          status: "LIVE",
          category: "Relief",
          quantityNeeded: 10,
          quantityReceived: 0,
          quantityPledged: 0,
          unit: "KITS",
          itemName: "Kits",
          beneficiaryCount: 10,
          beneficiaryGroup: "Families",
          ngoOrganizationName: "NGO",
          ngoCity: "Pune",
          referencePhotoUrl: null,
          driveType: "ITEMS",
        },
        {
          id: 202,
          title: "Regular Drive Y",
          urgency: "NORMAL",
          neededBy: null,
          status: "LIVE",
          category: "Education",
          quantityNeeded: 15,
          quantityReceived: 0,
          quantityPledged: 0,
          unit: "BOOKS",
          itemName: "Books",
          beneficiaryCount: 15,
          beneficiaryGroup: "Students",
          ngoOrganizationName: "NGO",
          ngoCity: "Nagpur",
          referencePhotoUrl: null,
          driveType: "ITEMS",
        },
      ];

      const interleaved = interleaveNeeds(requests, drives);

      // First items must be the urgent ones (101 and 201)
      expect(interleaved[0].kind).toBe("request");
      expect(interleaved[0].data.id).toBe(101);
      expect(interleaved[1].kind).toBe("drive");
      expect(interleaved[1].data.id).toBe(201);

      // Followed by regular items (102 and 202)
      expect(interleaved[2].kind).toBe("request");
      expect(interleaved[2].data.id).toBe(102);
      expect(interleaved[3].kind).toBe("drive");
      expect(interleaved[3].data.id).toBe(202);
    });
  });
});
