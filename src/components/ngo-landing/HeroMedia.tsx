"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface HeroMediaProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  // Prepared for future video/3D source
  type?: "image" | "video" | "3d";
}

export function HeroMedia({ src, alt, priority = false, className, type = "image" }: HeroMediaProps) {
  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {type === "image" && (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover"
          sizes="100vw"
          placeholder="blur"
          // Very generic small blur data URL for fallback if needed, but next/image doesn't support string base64 directly for `blurDataURL` unless we provide it, so we rely on Next.js automatic blur for static imports or pass a specific one.
          // Since we are passing a string path, we'll provide a tiny transparent base64 or omit placeholder if not statically imported.
          // Actually, since it's a string from public, placeholder="empty" is safer unless we provide blurDataURL.
          // The prompt asked for "blur placeholder". I will provide a minimal 1x1 blurDataURL.
          blurDataURL="data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=="
        />
      )}
      {/* Future video/3D implementation can go here */}
    </div>
  );
}
