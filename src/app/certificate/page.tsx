"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Award, Download, Heart, ShieldCheck } from "lucide-react";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Thank-you certificate</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost">Back to dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-4 border-primary/20 bg-white p-10 shadow-sm">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent" />

        <div className="relative text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Award className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Certificate of Gratitude
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Thank you, Anita Desai</h2>
          <p className="mt-4 max-w-xl text-muted-foreground sm:mx-auto">
            For your kind in-kind donation that has reached the donee and made
            a meaningful difference in someone&apos;s life.
          </p>

          <div className="mx-auto mt-8 grid max-w-xl gap-4 rounded-2xl bg-accent/40 p-6 text-left sm:grid-cols-2">
            <Detail label="Item donated" value="Winter jackets x 6" />
            <Detail label="Donee" value="Shelter For Hope (Reshma P.)" />
            <Detail label="Delivered on" value="14 May 2026" />
            <Detail label="Certificate ID" value="CK-IK-2026-00482" />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Verified by CauseKind admin · Delivery proof on file
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-lg font-semibold">
            <Heart className="h-5 w-5 text-primary" /> CauseKind
          </div>
          <p className="text-xs text-muted-foreground">India&apos;s verified giving platform</p>
        </div>
      </div>
    </div>
  );
}
