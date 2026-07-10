"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { VerificationQueuePanel } from "./VerificationQueuePanel";

export default function AdminVerificationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
  }, [user, isLoading, router]);

  if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="size-8 animate-spin text-stone-400" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <div className="border-b bg-white dark:bg-zinc-900 px-4 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Donee Verification Queue</h1>
            <p className="text-sm text-stone-500 mt-1">Tiered verification — documents, need assessment, fraud flags, admin checklist</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm font-semibold text-stone-500 hover:text-[#b04a15]">Back to Dashboard</Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <VerificationQueuePanel />
      </div>
    </div>
  );
}
