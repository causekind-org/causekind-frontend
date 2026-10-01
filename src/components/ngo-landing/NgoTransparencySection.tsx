"use client";

import Link from "next/link";
import { GiftJourneyTracker } from "./GiftJourneyTracker";

export function NgoTransparencySection() {
  return <section className="px-4 py-16 text-stone-900 dark:text-stone-100"><div className="mx-auto max-w-6xl space-y-12">
    <GiftJourneyTracker />
    <div className="rounded-3xl border border-stone-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
      <h2 className="text-2xl font-bold">Keep a clear record of each handover</h2>
      <p className="mt-3 text-sm leading-relaxed">Confirm receipt after the items arrive. Then upload a clear photo of the items, without showing people or private documents. Your handover page shows which confirmations and photos are still needed.</p>
      <Link className="mt-5 inline-block font-semibold underline" href="/ngo/handovers">View your handovers and photos</Link>
    </div>
  </div></section>;
}
