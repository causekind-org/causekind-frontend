"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { getMyDonations, type Donation } from "@/lib/api";
import { useFundraisingLabels, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
/** F27 — the donor's fundraiser donations. Trust donations live in their own section. */
export default function MyFundraiserDonationsPage() {
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const router = useRouter();
  const { user, isLoading, isRestoring } = useAuth();
  const [rows, setRows] = useState<Donation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isRestoring && !user) { router.replace(loginUrlFor("/fundraisers/my-donations")); return; }
    if (user) getMyDonations().then((all) => setRows(all.filter((d) => d.campaignId != null))).catch(() => setFailed(true));
  }, [isLoading, isRestoring, user, router]);

  const chip = (st: string) =>
    st === "COMPLETED" ? <span className={`${s.chip} ${s.cOk}`}><UiText>Confirmed</UiText></span>
      : st === "FAILED" ? <span className={`${s.chip} ${s.cM}`}><UiText>Failed · not charged</UiText></span>
      : <span className={`${s.chip} ${s.cN}`}><UiText>Pending</UiText></span>;

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 36, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 className={s.serif} style={{ fontSize: 34 }}><UiText>Your fundraiser donations</UiText></h1>
        {failed && <p role="alert" className={s.errText}><UiText>Couldn&apos;t load your donations. Refresh to try again.</UiText></p>}
        {rows && rows.length === 0 && (
          <div className={s.card} style={{ padding: 20 }}><strong><UiText>You haven&apos;t donated to a fundraiser yet.</UiText></strong><p className={`${s.small} ${s.muted}`}><Link href="/fundraisers"><UiText>Browse fundraisers</UiText></Link></p></div>
        )}
        {rows && rows.length > 0 && (
          <div className={s.card} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr className={`${s.small} ${s.muted}`} style={{ textAlign: "left" }}><th style={{ padding: "12px 18px" }}><UiText>Fundraiser</UiText></th><th style={{ textAlign: "right" }}><UiText>Amount</UiText></th><th style={{ paddingLeft: 16 }}><UiText>Date</UiText></th><th><UiText>Payment</UiText></th><th /></tr></thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} style={{ borderTop: "1px solid #efe7de" }}>
                    <td style={{ padding: "14px 18px" }}><strong>{d.campaignTitle}</strong><div className={`${s.small} ${s.muted}`}>{d.razorpayOrderId}</div></td>
                    <td className={s.tabular} style={{ textAlign: "right" }}>{formatINR(d.amount)}</td>
                    <td className={s.small} style={{ paddingLeft: 16 }}>{fmt.date(d.createdAt)}</td>
                    <td>{chip(d.status)}</td>
                    <td style={{ paddingRight: 18 }}>{d.campaignRemoved && d.status !== "INITIATED"
                      ? <span className={`${s.small} ${s.muted}`}><UiText>This fundraiser was removed. Your donation and receipt are kept.</UiText></span>
                      : <Link href={d.status === "INITIATED" ? `/fundraisers/donations/${d.id}` : `/fundraisers/${d.campaignId}`} className={s.small}>{d.status === "INITIATED" ? ui("Check status") : ui("Open fundraiser")}</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={`${s.small} ${s.muted}`}><UiText>Fundraiser donations are not refundable and don&apos;t get an 80G receipt. Donations to the CauseKind trust are listed separately.</UiText></p>
      </main>
    </div>
  );
}
