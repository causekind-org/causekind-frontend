"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

const ASSET_ROOT = "/brand/diwali-video";

/** Gold wordmark and diya animation sized to the existing Navbar logo area. */
export function DiwaliVideoLogo() {
  const containerRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const [expandedFrame, setExpandedFrame] = useState<{
    topSpace: number; bottomSpace: number; sideSpace: number; width: number; height: number; left: number; bottom: number;
  } | null>(null);
  const [animate, setAnimate] = useState(false);
  const [transparentFrameReady, setTransparentFrameReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const header = frame?.closest("header");
    if (!frame || !header) return;

    const updateFrame = () => {
      const bounds = frame.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      // Preserve the old crop's scale and position while revealing 200 source
      // rows above, 248 below and 104 on each side, without resizing the logo.
      const scale = Math.min(bounds.width / 1088, bounds.height / 288) * 1.44;
      const headerBounds = header.getBoundingClientRect();
      const bottomSpace = Math.max(0, headerBounds.bottom - bounds.bottom);
      setExpandedFrame({
        topSpace: Math.max(0, bounds.top - headerBounds.top),
        bottomSpace,
        sideSpace: 104 * scale,
        width: 1296 * scale,
        height: 736 * scale,
        left: (bounds.width - 1088 * scale) / 2,
        bottom: bottomSpace + (bounds.height - 288 * scale) / 2 - 248 * scale,
      });
    };
    updateFrame();
    const observer = new ResizeObserver(updateFrame);
    observer.observe(frame);
    observer.observe(header);
    window.addEventListener("resize", updateFrame);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFrame);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      setAnimate(visible && !reducedMotion.matches);
      setTransparentFrameReady(false);
    };
    // Only mount the video in the visible desktop/mobile copy of the Navbar.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(container);
    reducedMotion.addEventListener("change", update);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  function showTransparentVideo(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      // The padded corner must decode as transparent. An opaque decoder keeps
      // the PNG fallback rather than showing a black rectangle in the Navbar.
      context.drawImage(video, 0, 0, 1, 1, 0, 0, 1, 1);
      const supportsAlpha = context.getImageData(0, 0, 1, 1).data[3] === 0;
      setTransparentFrameReady(supportsAlpha);
      if (!supportsAlpha) video.pause();
    } catch {
      video.pause();
      setTransparentFrameReady(false);
    }
  }

  return (
    <span
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none block w-[min(160px,calc(100vw-176px))] shrink-0 py-1"
    >
      <span ref={frameRef} className="relative block h-9 w-full sm:h-10">
      <span className="absolute [clip-path:inset(0_-100vmax)]" style={{ top: -(expandedFrame?.topSpace ?? 0), bottom: -(expandedFrame?.bottomSpace ?? 0), left: -(expandedFrame?.sideSpace ?? 0), right: -(expandedFrame?.sideSpace ?? 0) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Preserve the keyed PNG alpha without an optimization request. */}
      <img
        src={`${ASSET_ROOT}/causekind-diwali-c99c327b${expandedFrame ? "-full-frame" : ""}-poster.png`}
        alt=""
        width={expandedFrame ? 1296 : 1088}
        height={expandedFrame ? 736 : 288}
        style={expandedFrame ? { width: expandedFrame.width, height: expandedFrame.height, left: expandedFrame.left, bottom: expandedFrame.bottom } : { inset: 0, width: "100%", height: "100%" }}
        className={`absolute object-contain ${animate && transparentFrameReady ? "invisible" : ""}`}
      />
      {animate && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          width={expandedFrame ? 1296 : 1088}
          height={expandedFrame ? 736 : 288}
          tabIndex={-1}
          onLoadedData={showTransparentVideo}
          onError={() => setTransparentFrameReady(false)}
          style={expandedFrame ? { width: expandedFrame.width, height: expandedFrame.height, left: expandedFrame.left, bottom: expandedFrame.bottom } : { inset: 0, width: "100%", height: "100%" }}
          className={`absolute object-contain ${transparentFrameReady ? "" : "invisible"}`}
        >
          <source src={`${ASSET_ROOT}/causekind-diwali-c99c327b-full-frame.webm`} type="video/webm" />
        </video>
      )}
      </span>
      </span>
    </span>
  );
}
