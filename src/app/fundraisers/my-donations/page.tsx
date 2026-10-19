"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { getMyDonations, type Donation } from "@/lib/api";
import { formatDate, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

/** F27 — the donor's fundraiser donations. Trust donations live in their own section. */
export default function MyFundraiserDonationsPage() {
  const router = useRouter();
  const { user, isLoading, isRestoring } = useAuth();
  const [rows, setRows] = useState<Donation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isRestoring && !user) { router.replace(loginUrlFor("/fundraisers/my-donations")); return; }
    if (user) getMyDonations().then((all) => setRows(all.filter((d) => d.campaignId != null))).catch(() => setFailed(true));
  }, [isLoading, isRestoring, user, router]);

  const chip = (st: string) =>
    st === "COMPLETED" ? <span className={`${s.chip} ${s.cOk}`}>Confirmed</span>
      : st === "FAILED" ? <span className={`${s.chip} ${s.cM}`}>Failed · not charged</span>
      : <span className={`${s.chip} ${s.cN}`}>Pending</span>;

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 36, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 className={s.serif} style={{ fontSize: 34 }}>Your fundraiser donations</h1>
        {failed && <p role="alert" className={s.errText}>Couldn&apos;t load your donations. Refresh to try again.</p>}
        {rows && rows.length === 0 && (
          <div className={s.card} style={{ padding: 20 }}><strong>You haven&apos;t donated to a fundraiser yet.</strong><p className={`${s.small} ${s.muted}`}><Link href="/fundraisers">Browse fundraisers</Link></p></div>
        )}
        {rows && rows.length > 0 && (
          <div className={s.card} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr className={`${s.small} ${s.muted}`} style={{ textAlign: "left" }}><th style={{ padding: "12px 18px" }}>Fundraiser</th><th style={{ textAlign: "right" }}>Amount</th><th style={{ paddingLeft: 16 }}>Date</th><th>Payment</th><th /></tr></thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} style={{ borderTop: "1px solid #efe7de" }}>
                    <td style={{ padding: "14px 18px" }}><strong>{d.campaignTitle}</strong><div className={`${s.small} ${s.muted}`}>{d.razorpayOrderId}</div></td>
                    <td className={s.tabular} style={{ textAlign: "right" }}>{formatINR(d.amount)}</td>
                    <td className={s.small} style={{ paddingLeft: 16 }}>{formatDate(d.createdAt)}</td>
                    <td>{chip(d.status)}</td>
                    <td style={{ paddingRight: 18 }}><Link href={d.status === "INITIATED" ? `/fundraisers/donations/${d.id}` : `/fundraisers/${d.campaignId}`} className={s.small}>{d.status === "INITIATED" ? "Check status" : "Open fundraiser"}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={`${s.small} ${s.muted}`}>Fundraiser donations are not refundable and don&apos;t get an 80G receipt. Donations to the CauseKind trust are listed separately.</p>
      </main>
    </div>
  );
}
