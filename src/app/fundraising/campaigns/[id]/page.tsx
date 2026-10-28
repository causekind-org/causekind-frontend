"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/AppLink";
import { fundraisingCampaigns, type FundraisingCampaign } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { CampaignWizard } from "@/features/fundraising/CampaignWizard";
import { CampaignStatusView } from "@/features/fundraising/CampaignStatusView";
import { ManageWorkspace } from "@/features/fundraising/ManageWorkspace";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText } from "@/components/UiText";
/** A draft or changes-requested campaign opens the wizard (F13–F17); anything else shows its status (F18). */
export default function FundraisingCampaignPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DoneeGate path={`/fundraising/campaigns/${id}`}>
      <CampaignScreen id={Number(id)} />
    </DoneeGate>
  );
}

function CampaignScreen({ id }: { id: number }) {
  const [c, setC] = useState<FundraisingCampaign | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => { fundraisingCampaigns.get(id).then(setC).catch(() => setMissing(true)); }, [id]);

  if (missing) {
    return (
      <main className={s.wrap} style={{ paddingTop: 64, paddingBottom: 64 }}>
        <h1 className={s.serif} style={{ fontSize: 28 }}><UiText>Campaign not found</UiText></h1>
        <p className={s.muted} style={{ marginTop: 8 }}><Link href="/fundraising"><UiText>Back to your fundraisers</UiText></Link></p>
      </main>
    );
  }
  if (!c) return <main className={s.wrap} aria-busy="true" style={{ minHeight: 400 }} />;
  if (["APPROVED", "PAUSED", "COLLECTIONS_CLOSED", "OUTCOME_REPORTING"].includes(c.status)) return <ManageWorkspace c={c} />;
  if (c.status === "DRAFT" || c.status === "CHANGES_REQUESTED") return <CampaignWizard initial={c} onSubmitted={setC} />;
  return <CampaignStatusView c={c} />;
}
