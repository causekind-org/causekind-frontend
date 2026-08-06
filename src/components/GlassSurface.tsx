"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./GlassSurface.css";

/**
 * Liquid-glass surface.
 *
 * <p>Adapted from the React Bits `GlassSurface` component (JavaScript + CSS
 * variant), converted to a typed client component for this repository
 * (`allowJs: false`, `strict: true`) and hardened — see the notes below.
 *
 * <p><b>How it works.</b> A displacement map is generated as a data-URI SVG
 * sized to the element's real box, then fed to three `feDisplacementMap` passes,
 * one per colour channel at slightly different scales. That per-channel offset
 * is what produces the chromatic fringing real glass has. The finished filter is
 * referenced by `backdrop-filter: url(#id)`.
 *
 * <p><b>Support.</b> `backdrop-filter: url()` is Chromium-only in practice.
 * WebKit parses it and paints nothing; Firefox does not implement it. Neither
 * fails in a way `@supports` can detect, so the check is a UA test plus a
 * property probe, run <i>after mount</i> so server and first client paint agree.
 * Until then — and permanently on WebKit/Firefox — the CSS fallback renders a
 * fully-styled CauseKind surface, so the caller never sees a transparent hole.
 *
 * <p><b>Hardening applied to the upstream source:</b>
 * <ol>
 *   <li>The upstream registers the <i>same</i> `ResizeObserver` twice. One here.</li>
 *   <li>Unmanaged `setTimeout(..., 0)` calls replaced with a single cancellable
 *       `requestAnimationFrame`, cancelled on cleanup, so a resize drag cannot
 *       queue one map regeneration per event.</li>
 *   <li>`ResizeObserver` availability guarded; without it the map is generated
 *       once and the component still renders.</li>
 *   <li>Fixed SVG ids (`redchannel`, `greenchannel`, `bluechannel`) removed —
 *       they were duplicated for every instance on the page. All remaining ids
 *       derive from a sanitised `useId()`.</li>
 *   <li>No React state is set from the observer, so a resize cannot re-render
 *       the parent (or loop).</li>
 *   <li>Nothing touches `window`/`document`/`navigator` or measures an element
 *       during render.</li>
 *   <li>A `mounted` ref stops any queued frame writing to a detached node.</li>
 *   <li>CSS namespaced `ck-glass-*` rather than the generic `.glass-surface`.</li>
 * </ol>
 */

export type GlassChannel = "R" | "G" | "B";

export type GlassSurfaceProps = {
  children?: ReactNode;
  /** Number → px, string → used verbatim (e.g. "100%"). */
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: GlassChannel;
  yChannel?: GlassChannel;
  mixBlendMode?: CSSProperties["mixBlendMode"];
  className?: string;
  style?: CSSProperties;
};

/** CSS custom properties are not part of CSSProperties, so widen explicitly. */
type GlassCssVars = CSSProperties & {
  "--ck-glass-frost"?: number | string;
  "--ck-glass-saturation"?: number | string;
  "--ck-glass-filter"?: string;
};

function detectSvgBackdropSupport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const ua = navigator.userAgent;
  // "Safari" appears in nearly every UA; the absence of "Chrome" is what
  // identifies WebKit. iOS Chrome reports "CriOS", so it lands here correctly —
  // every iOS browser is WebKit and none of them can run this filter.
  const isWebkit = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  if (isWebkit || isFirefox) return false;

  const probe = document.createElement("div");
  probe.style.backdropFilter = "url(#ck-glass-probe)";
  return probe.style.backdropFilter !== "";
}

export default function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = "R",
  yChannel = "G",
  mixBlendMode = "difference",
  className = "",
  style = {},
}: GlassSurfaceProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "-");
  const filterId = `ck-glass-filter-${uid}`;
  const redGradId = `ck-glass-red-${uid}`;
  const blueGradId = `ck-glass-blue-${uid}`;

  // Starts false so the server render and the first client paint agree; the
  // fallback is fully styled, so this is an upgrade rather than a flash.
  const [svgSupported, setSvgSupported] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueRef = useRef<SVGFEDisplacementMapElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);

  const frameRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    setSvgSupported(detectSvgBackdropSupport());
  }, []);

  const buildDisplacementMap = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect?.width ?? 400));
    const h = Math.max(1, Math.round(rect?.height ?? 200));
    const edge = Math.min(w, h) * (borderWidth * 0.5);

    const svg =
      `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs>` +
      `<linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">` +
      `<stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>` +
      `<linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>` +
      `</defs>` +
      `<rect x="0" y="0" width="${w}" height="${h}" fill="black"/>` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}" fill="url(#${redGradId})"/>` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode:${mixBlendMode}"/>` +
      `<rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${borderRadius}" ` +
      `fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)"/>` +
      `</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [borderWidth, borderRadius, brightness, opacity, blur, mixBlendMode, redGradId, blueGradId]);

  /** Writes every filter attribute. Never sets React state — see hardening note 5. */
  const applyFilter = useCallback(() => {
    if (!mountedRef.current) return;

    feImageRef.current?.setAttribute("href", buildDisplacementMap());

    const channels: readonly [typeof redRef, number][] = [
      [redRef, redOffset],
      [greenRef, greenOffset],
      [blueRef, blueOffset],
    ];
    for (const [ref, offset] of channels) {
      const node = ref.current;
      if (!node) continue;
      node.setAttribute("scale", String(distortionScale + offset));
      node.setAttribute("xChannelSelector", xChannel);
      node.setAttribute("yChannelSelector", yChannel);
    }

    blurRef.current?.setAttribute("stdDeviation", String(displace));
  }, [buildDisplacementMap, distortionScale, redOffset, greenOffset, blueOffset, xChannel, yChannel, displace]);

  /** At most one regeneration per frame, and cancellable. */
  const scheduleApply = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      applyFilter();
    });
  }, [applyFilter]);

  // Prop-driven updates.
  useEffect(() => {
    if (!svgSupported) return;
    scheduleApply();
  }, [svgSupported, scheduleApply, width, height]);

  // Size-driven updates — one observer, guarded, coalesced to a frame.
  useEffect(() => {
    if (!svgSupported) return;
    const el = containerRef.current;
    if (!el) return;

    if (typeof ResizeObserver === "undefined") {
      // Still render correctly; just no live re-measure.
      scheduleApply();
      return;
    }

    const observer = new ResizeObserver(() => scheduleApply());
    observer.observe(el);
    return () => observer.disconnect();
  }, [svgSupported, scheduleApply]);

  const containerStyle: GlassCssVars = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--ck-glass-frost": backgroundOpacity,
    "--ck-glass-saturation": saturation,
    "--ck-glass-filter": `url(#${filterId})`,
  };

  return (
    <div
      ref={containerRef}
      className={`ck-glass ${svgSupported ? "ck-glass--svg" : "ck-glass--fallback"} ${className}`.trim()}
      style={containerStyle}
    >
      {/* Never painted: it exists purely to be referenced by backdrop-filter. */}
      <svg className="ck-glass__filter" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

            <feDisplacementMap ref={redRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix in="dispRed" type="matrix" result="red"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0" />

            <feDisplacementMap ref={greenRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix in="dispGreen" type="matrix" result="green"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0" />

            <feDisplacementMap ref={blueRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix in="dispBlue" type="matrix" result="blue"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0" />

            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={blurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>

      {children != null && <div className="ck-glass__content">{children}</div>}
    </div>
  );
}
