"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Loader2 } from "lucide-react";
import { OffersQueuePanel } from "./OffersQueuePanel";

export default function AdminOffersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") { router.push("/"); return; }
  }, [user, isLoading, router]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-[#b04a15]" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f1d30] via-[#1c0905] to-[#1e2d10] text-white py-8 px-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#f0b97a]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#f0b97a]">Admin Panel</span>
            </div>
            <h1 className="text-2xl font-black">Donation Offers Queue</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/admin/dashboard")} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <OffersQueuePanel />
      </div>
    </div>
  );
}
