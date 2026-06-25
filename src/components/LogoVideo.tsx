"use client";

export function LogoVideo({ size = 32 }: { size?: number }) {
  return (
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
      />
    </div>
  );
}
