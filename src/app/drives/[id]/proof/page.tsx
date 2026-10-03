"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getNgoDrive, getNgoDriveProof, type NgoDrive, type NgoDriveProofResponse } from "@/lib/api";
import { PageSkeleton } from "@/components/skeletons";

export default function DriveProofPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();

  const [drive, setDrive] = useState<NgoDrive | null>(null);
  const [proof, setProof] = useState<NgoDriveProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(id)) return;
    Promise.all([
      getNgoDrive(id),
      getNgoDriveProof(id).catch(() => null)
    ])
      .then(([d, p]) => {
        setDrive(d);
        if (p) setProof(p);
        else setError("Proof not available yet.");
      })
      .catch(() => setError("Failed to load drive."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSkeleton><div className="h-96" /></PageSkeleton>;

  if (error || !drive || !proof) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h2 className="text-xl font-bold text-stone-700">{error || "Impact report not available."}</h2>
        <Link href={`/drives/${id}`} className="mt-6 px-6 py-2 bg-stone-200 text-stone-700 font-bold rounded-full hover:bg-stone-300">
          Back to Drive
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-ngo-900 text-ngo-50 py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white mb-2">Impact Report</h1>
          <p className="text-ngo-200 text-lg">
            Thank you for supporting <strong>{drive.title}</strong>
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
          <Link href={`/drives/${id}`} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 mb-6 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Drive
          </Link>

          <div className="mb-8 text-center border-b border-stone-100 pb-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex-1 bg-stone-50 rounded-xl p-4 border border-stone-100 w-full">
              <div className="text-3xl font-black text-emerald-600 mb-1">
                {drive.quantityReceived} of {drive.quantityNeeded}
              </div>
              <div className="text-stone-500 font-medium uppercase tracking-wide text-xs">
                {drive.itemName} received
              </div>
            </div>
            <div className="flex-1 bg-stone-50 rounded-xl p-4 border border-stone-100 w-full">
              <div className="text-3xl font-black text-emerald-600 mb-1">
                {drive.beneficiaryCount}
              </div>
              <div className="text-stone-500 font-medium uppercase tracking-wide text-xs">
                Reached {drive.beneficiaryGroup}
              </div>
            </div>
          </div>

          {proof.ngoStatement && (
            <div className="mb-8 bg-stone-50 p-6 rounded-xl border border-stone-100 relative">
              <span className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold uppercase text-stone-400 tracking-wider">A message from {(drive as any).ngoName}</span>
              <p className="text-stone-700 italic leading-relaxed">"{proof.ngoStatement}"</p>
            </div>
          )}

          {proof.media && proof.media.length > 0 && (
            <div>
              <h3 className="font-bold text-stone-900 mb-4">Photos from the distribution</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proof.media.map((m, idx) => (
                  <div key={idx} className="aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 relative border border-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.mediaUrl} alt={`Distribution photo ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
