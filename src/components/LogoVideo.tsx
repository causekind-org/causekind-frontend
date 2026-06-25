"use client";

import { useId } from "react";

export function LogoVideo({ size = 32 }: { size?: number }) {
  const filterId = useId().replace(/:/g, "");

  return (
    <>
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={`key-out-bg-${filterId}`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                1   0   0   0   0
                0   1   0   0   0
                0   0   1   0   0
               -3  -3  -3   0   6.8
              "
            />
          </filter>
        </defs>
      </svg>
      <div
        className="relative overflow-hidden bg-transparent shrink-0"
        style={{ width: size, height: size }}
      >
        <video
          src="/logo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[178%] min-h-[178%] object-cover pointer-events-none scale-[0.65]"
          style={{ filter: `url(#key-out-bg-${filterId})` }}
        />
      </div>
    </>
  );
}
