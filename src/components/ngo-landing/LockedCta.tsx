"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerNgoLockedToast, useNgoStatus } from "./useNgoStatus";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface LockedCtaProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  href?: string;
}

/**
 * A shared component for locked CTAs (like "Start a Drive") that
 * consistently triggers the correct locked reason toast based on current NGO status.
 */
export function LockedCta({ className, children, variant = "secondary", size = "default", href = "/ngo/drives/new" }: LockedCtaProps) {
  const router = useRouter();
  const status = useNgoStatus();
  
  const isTestMode = 
    process.env.NODE_ENV === "development" && 
    process.env.NEXT_PUBLIC_NGO_LOCAL_TEST_MODE === "true";

  const isUnlocked = isTestMode || (status.isVerified && status.photosDue === 0 && status.canStartDrive);

  const handleClick = (e: React.MouseEvent) => {
    if (isUnlocked) return;
    
    e.preventDefault();
    triggerNgoLockedToast(
      status.status, 
      status.isPhotosDue, 
      status.photosDueRequestName, 
      router
    );
  };

  if (isUnlocked) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("relative group", className)}
        asChild
      >
        <Link href={href}>
          {children || "Start a Drive"}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("opacity-75 relative group", className)}
      onClick={handleClick}
    >
      <span className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-stone-500 group-hover:text-stone-700 transition-colors" />
        {children || "Start a Drive"}
      </span>
    </Button>
  );
}
