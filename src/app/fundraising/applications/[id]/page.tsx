"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/AppLink";
import { fundraising, type FundraisingApplication } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { Wizard } from "@/features/fundraising/Wizard";
import { StatusView } from "@/features/fundraising/StatusView";
import s from "@/features/fundraising/fundraising.module.css";

/** A draft opens the wizard (F03–F07); anything else shows its status (F08). */
export default function FundraisingApplicationPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DoneeGate path={`/fundraising/applications/${id}`}>
      <ApplicationScreen id={Number(id)} />
    </DoneeGate>
  );
}

function ApplicationScreen({ id }: { id: number }) {
  const [app, setApp] = useState<FundraisingApplication | null>(null);
  const [missing, setMissing] = useState(false);
  const [submittedNow, setSubmittedNow] = useState(false);

  useEffect(() => {
    fundraising.get(id).then(setApp).catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <main className={s.wrap} style={{ paddingTop: 64, paddingBottom: 64 }}>
        <h1 className={s.serif} style={{ fontSize: 28 }}>Application not found</h1>
        <p className={s.muted} style={{ marginTop: 8 }}><Link href="/fundraising">Back to your fundraisers</Link></p>
      </main>
    );
  }
  if (!app) return <main className={s.wrap} aria-busy="true" style={{ minHeight: 400 }} />;
  if (app.status === "DRAFT") {
    return <WizardWithSubmit app={app} onSubmitted={(a) => { setSubmittedNow(true); setApp(a); }} />;
  }
  return <StatusView app={app} onChange={setApp} justSubmitted={submittedNow} />;
}

/** The wizard owns its state; this only notices when it leaves DRAFT. */
function WizardWithSubmit({ app, onSubmitted }: { app: FundraisingApplication; onSubmitted: (a: FundraisingApplication) => void }) {
  return <Wizard initial={app} onLeftDraft={onSubmitted} />;
}
