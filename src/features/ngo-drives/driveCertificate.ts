import type { NgoDriveOfferResponse } from "@/lib/api";

/** Statuses after the handover completed (code confirmed + first photo): the certificate exists. */
const DONATED = new Set(["ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"]);

type CertFields = Pick<NgoDriveOfferResponse, "status"> & Partial<Pick<NgoDriveOfferResponse, "certificateIssued">>;

// TODO later: admin issue ruling + revoke

/** The handover completed, so the offer counts as donated and its certificate is issued. */
export function driveOfferDonated(o: CertFields): boolean {
  return DONATED.has(o.status) || o.certificateIssued === true;
}

/** The donor can download the certificate. */
export const driveCertificateIssued = driveOfferDonated;
