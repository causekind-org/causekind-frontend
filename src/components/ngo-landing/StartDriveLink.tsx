"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "@/lib/toast";
import { useNgoStatus } from "./useNgoStatus";

/**
 * A link to the drive form that is greyed out and inert while the NGO may not start a
 * drive (not verified, photos due, or an earlier drive not finished), with the reason.
 */
export function StartDriveLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const { canPostRequest, lockReason } = useNgoStatus();
  if (canPostRequest) return <Link href={href} className={className}>{children}</Link>;
  return (
    <span
      role="link"
      aria-disabled="true"
      title={lockReason}
      tabIndex={0}
      className={`${className ?? ""} inline-block opacity-50 grayscale cursor-not-allowed`}
      onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); if (lockReason) toast.info(lockReason); }}
    >
      {children}
    </span>
  );
}
