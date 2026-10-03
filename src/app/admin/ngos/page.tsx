"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NgoReviewPanel } from "./NgoReviewPanel";

/** Standalone NGO review page — the same panel as the dashboard's "NGO Applications" tab. */
export default function NgoReviewPage() {
  return <Suspense fallback={<p role="status">Loading NGO application…</p>}><NgoReviewContent /></Suspense>;
}

function NgoReviewContent() {
  const params = useSearchParams();
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 dark:bg-zinc-950 dark:text-stone-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/admin/dashboard?tab=ngo-applications" className="text-sm underline">Back to admin dashboard</Link>
        <h1 className="text-3xl font-bold">NGO applications</h1>
        <NgoReviewPanel initialApplicationId={params.get("application")} />
      </div>
    </main>
  );
}
