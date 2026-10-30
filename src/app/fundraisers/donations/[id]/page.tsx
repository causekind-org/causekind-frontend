"use client";
import { useTranslations } from "next-intl";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "@/components/AppLink";
import { fundraisers, type Donation } from "@/lib/api";
import { Icon, formatINR } from "@/features/fundraising/ui";
import { DonationDocuments } from "@/features/fundraising/DonationDocuments";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
/**
 * F26 — payment result. Only the server's status counts: COMPLETED shows
 * "Donation confirmed"; INITIATED is pending (or "you left checkout"); FAILED is
 * failed. A status read that fails never claims success or failure.
 */
export default function DonationResultPage() {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const { id } = useParams<{ id: string }>();
  const left = useSearchParams().get("left") === "1";
  const [d, setD] = useState<Donation | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const tries = useRef(0);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      // The server asks Razorpay itself; the browser never decides the outcome.
      const mine = await fundraisers.checkDonation(Number(id));
      setD(mine);
      setCheckFailed(false);
      return mine;
    } catch {
      setCheckFailed(true);
      return null;
    } finally {
      setChecking(false);
    }
  }, [id]);

  // Poll while pending: the webhook usually lands within seconds.
  useEffect(() => {
    let stop = false;
    const loop = async () => {
      const r = await check();
      tries.current += 1;
      if (!stop && (!r || r.status === "INITIATED") && tries.current < 30) setTimeout(loop, 4000);
    };
    void loop();
    return () => { stop = true; };
  }, [check]);

  const status = d?.status;
  const icon = (bg: string, fg: string, name: "check" | "clock" | "x" | "alert" | "arrow") => (
    <span style={{ width: 56, height: 56, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={name} className={s.icon} /></span>
  );
  const back = d ? <Link href={`/fundraisers/${d.campaignId}`} className={`${s.btn} ${s.bs}`}><UiText>Back to fundraiser</UiText></Link> : <Link href="/fundraisers" className={`${s.btn} ${s.bs}`}><UiText>See fundraisers</UiText></Link>;
  const ref = d ? <p className={`${s.small} ${s.muted}`}>{t("reference", { reference: d.razorpayOrderId })}</p> : null;

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 56, paddingBottom: 72, maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
        {status === "COMPLETED" ? (
          <>
            {icon("#e6f2ea", "#1d5b3a", "check")}
            <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Donation confirmed</UiText></h1>
            <p>{t.rich("donationReceived", { amount: formatINR(d!.amount), title: d!.campaignTitle ?? "", strong: (chunks) => <strong>{chunks}</strong> })}</p>
            {ref}
            {/* The payment is confirmed whatever happens to the documents; they have their own status below. */}
            <DonationDocuments d={d!} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link href="/fundraisers/my-donations" className={`${s.btn} ${s.bp}`}><UiText>View donation</UiText></Link>{back}</div>
          </>
        ) : status === "FAILED" ? (
          <>
            {icon("#fbeaea", "#8f1d1d", "x")}
            <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Payment didn&apos;t go through</UiText></h1>
            <p><UiText>Your bank declined or the payment failed. You haven&apos;t been charged.</UiText></p>
            {ref}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{d && <Link href={`/fundraisers/${d.campaignId}/donate`} className={`${s.btn} ${s.bp}`}><UiText>Try again</UiText></Link>}{back}</div>
          </>
        ) : checkFailed ? (
          <>
            {icon("#fdf3e1", "#7a4a00", "alert")}
            <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>We couldn&apos;t check your payment just now</UiText></h1>
            <p><UiText>This is a problem reading the status — it doesn&apos;t mean the payment failed.</UiText>{d ? ` ${t("lastKnown", { status: d.status === "INITIATED" ? ui("not confirmed yet") : d.status.toLowerCase() })}` : ""}</p>
            {ref}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void check()} disabled={checking}><UiText>Try again</UiText></button>{back}</div>
          </>
        ) : left ? (
          <>
            {icon("#f1ece6", "#5c4f45", "arrow")}
            <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>You left checkout</UiText></h1>
            <p><UiText>If you completed payment, it may still be confirming. We&apos;ll update your donations either way —</UiText> <strong><UiText>please don&apos;t pay twice.</UiText></strong></p>
            {ref}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void check()} disabled={checking}>{checking ? ui("Checking…") : ui("Check status")}</button>{back}</div>
            {d && <p className={`${s.small} ${s.muted}`}><Link href={`/fundraisers/${d.campaignId}/donate`}><UiText>Start a new payment</UiText></Link> <UiText>— the earlier one may still go through.</UiText></p>}
          </>
        ) : (
          <>
            {icon("#eaf0f8", "#1e3a60", "clock")}
            <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Confirming your payment</UiText></h1>
            <p><UiText>Your bank is still processing it. This can take a little while.</UiText> <strong><UiText>Please don&apos;t pay again</UiText></strong> <UiText>— this page updates by itself.</UiText></p>
            {ref}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void check()} disabled={checking}>{checking ? ui("Checking…") : ui("Check status")}</button>{back}</div>
          </>
        )}
      </main>
    </div>
  );
}
