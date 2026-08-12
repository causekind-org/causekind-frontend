"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

export type RaysOrigin =
  | "top-center" | "top-left" | "top-right"
  | "right" | "left"
  | "bottom-center" | "bottom-left" | "bottom-right";

/**
 * Blend mode for the canvas.
 *
 * - `screen` — for dark grounds. The shader emits black where there is no ray,
 *   and screen leaves the backdrop untouched there. This is the mode every
 *   React Bits demo runs in, because every demo is on black.
 * - `multiply` — for light grounds. Here the shader is **inverted**: it emits
 *   white where there is no ray and the ray colour where there is, so multiply
 *   leaves cream alone and tints only the shafts. Emitting the normal (black)
 *   output under multiply would turn the whole section black except the rays,
 *   which is the obvious trap with this effect on light backgrounds.
 */
export type RaysBlend = "screen" | "multiply";

export type LightRaysProps = {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  blendMode?: RaysBlend;
  /** Overall canvas opacity — the cheapest dial if the effect reads too strong. */
  opacity?: number;
  className?: string;
};

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;

uniform float  iTime;
uniform vec2   iResolution;
uniform vec2   rayPos;
uniform vec2   rayDir;
uniform vec3   raysColor;
uniform float  raysSpeed;
uniform float  lightSpread;
uniform float  rayLength;
uniform float  pulsating;
uniform float  fadeDistance;
uniform float  saturation;
uniform vec2   mousePos;
uniform float  mouseInfluence;
uniform float  noiseAmount;
uniform float  distortion;
uniform float  uInvert;   // 1.0 = light-ground (multiply) output
uniform float  uOpacity;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(vec2 source, vec2 refDir, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 toCoord = coord - source;
  vec2 dirNorm = normalize(toCoord);
  float cosAngle = dot(dirNorm, refDir);

  float wobbled = cosAngle + distortion * sin(iTime * 2.0 + length(toCoord) * 0.01) * 0.2;
  float spread  = pow(max(wobbled, 0.0), 1.0 / max(lightSpread, 0.001));

  float dist = length(toCoord);
  float maxDist = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDist - dist) / maxDist, 0.0, 1.0);
  float fadeFalloff = clamp(
    (iResolution.x * fadeDistance - dist) / (iResolution.x * fadeDistance), 0.5, 1.0);

  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float base = clamp(
      (0.45 + 0.15 * sin(wobbled * seedA + iTime * speed))
    + (0.30 + 0.20 * cos(-wobbled * seedB + iTime * speed)),
    0.0, 1.0);

  return base * lengthFalloff * fadeFalloff * spread * pulse;
}

void main() {
  // Flip Y: gl_FragCoord is bottom-up, the ray origin is expressed top-down.
  vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);

  vec2 dir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreen = mousePos * iResolution.xy;
    dir = normalize(mix(rayDir, normalize(mouseScreen - rayPos), mouseInfluence));
  }

  // Two passes at different seeds so the shafts do not read as a clean fan.
  float s = rayStrength(rayPos, dir, coord, 36.2214, 21.11349, 1.5 * raysSpeed) * 0.5
          + rayStrength(rayPos, dir, coord, 22.3991, 18.02340, 1.1 * raysSpeed) * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    s *= (1.0 - noiseAmount + noiseAmount * n);
  }

  // Rays are strongest near their origin and thin out across the surface.
  s *= 0.15 + (1.0 - coord.y / iResolution.y) * 0.85;
  s = clamp(s, 0.0, 1.0) * uOpacity;

  vec3 tint = raysColor;
  if (saturation != 1.0) {
    float gray = dot(tint, vec3(0.299, 0.587, 0.114));
    tint = clamp(mix(vec3(gray), tint, saturation), 0.0, 1.0);
  }

  if (uInvert > 0.5) {
    // Multiply path: white = "leave the backdrop alone".
    gl_FragColor = vec4(mix(vec3(1.0), tint, s), 1.0);
  } else {
    // Screen path: black = "leave the backdrop alone".
    gl_FragColor = vec4(tint * s, 1.0);
  }
}`;

/** "#ff7700" → [1, 0.466, 0]. Falls back to white on anything unparseable. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

/** Origin point (in pixels) and outward direction for each preset. */
function originFor(o: RaysOrigin, w: number, h: number): { pos: [number, number]; dir: [number, number] } {
  switch (o) {
    case "top-left":      return { pos: [0, 0],        dir: [ 0.7,  0.7] };
    case "top-right":     return { pos: [w, 0],        dir: [-0.7,  0.7] };
    case "left":          return { pos: [0, h * 0.5],  dir: [ 1,    0  ] };
    case "right":         return { pos: [w, h * 0.5],  dir: [-1,    0  ] };
    case "bottom-left":   return { pos: [0, h],        dir: [ 0.7, -0.7] };
    case "bottom-center": return { pos: [w * 0.5, h],  dir: [ 0,   -1  ] };
    case "bottom-right":  return { pos: [w, h],        dir: [-0.7, -0.7] };
    case "top-center":
    default:              return { pos: [w * 0.5, 0],  dir: [ 0,    1  ] };
  }
}

/**
 * WebGL light-ray background (React Bits' LightRays, implemented on the `ogl`
 * renderer this project already ships for `SpecularButton`).
 *
 * Three gates the stock component does not carry, all of which matter on a long
 * landing page:
 *
 * - **IntersectionObserver** stops the render loop when the section scrolls out
 *   of view. Otherwise this is a permanent background job burning GPU for
 *   something nobody is looking at.
 * - **prefers-reduced-motion** renders exactly one frame and never loops.
 * - **Coarse pointer** keeps the rays but drops mouse-following, since there is
 *   no cursor and the uniform would just sit at its initial value.
 *
 * The WebGL context is explicitly released on unmount. Browsers cap live
 * contexts at roughly sixteen, `SpecularButton` already holds one on this page,
 * and a context leaked per mount is a real way to break the whole route.
 */
export default function LightRays({
  raysOrigin = "top-center",
  raysColor = "#ffffff",
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1,
  saturation = 1,
  followMouse = false,
  mouseInfluence = 0.1,
  noiseAmount = 0,
  distortion = 0,
  blendMode = "screen",
  opacity = 1,
  className = "",
}: LightRaysProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  // Latest props for the render loop to read, so changing a prop retunes the
  // shader instead of tearing down and rebuilding the GL context.
  const propsRef = useRef({
    raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, pulsating,
    fadeDistance, saturation, followMouse, mouseInfluence, noiseAmount,
    distortion, blendMode, opacity,
  });
  propsRef.current = {
    raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, pulsating,
    fadeDistance, saturation, followMouse, mouseInfluence, noiseAmount,
    distortion, blendMode, opacity,
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // Cap DPR: this is decoration, and a 3x phone would otherwise shade nine
    // times the pixels for it.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, dpr });
    } catch {
      // No WebGL (old browser, blocklisted driver, headless). The section is
      // fully designed without this layer, so failing silently is correct.
      return;
    }

    const gl = renderer.gl;
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";
    host.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, 1] },
        raysColor: { value: hexToRgb(raysColor) },
        raysSpeed: { value: raysSpeed },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: pulsating ? 1 : 0 },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        mousePos: { value: [0.5, 0.5] },
        mouseInfluence: { value: mouseInfluence },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion },
        uInvert: { value: blendMode === "multiply" ? 1 : 0 },
        uOpacity: { value: opacity },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    let w = 1;
    let h = 1;
    const resize = () => {
      const r = host.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      renderer.setSize(w, h);
      program.uniforms.iResolution.value = [w * dpr, h * dpr];
      const { pos, dir } = originFor(propsRef.current.raysOrigin, w * dpr, h * dpr);
      program.uniforms.rayPos.value = pos;
      program.uniforms.rayDir.value = dir;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // Mouse target is smoothed toward, never snapped — a jumping light source
    // reads as a glitch rather than as following.
    const mouse = { x: 0.5, y: 0.5 };
    const smooth = { x: 0.5, y: 0.5 };
    const onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / Math.max(r.width, 1);
      mouse.y = (e.clientY - r.top) / Math.max(r.height, 1);
    };
    const wantsMouse = followMouse && !coarse;
    if (wantsMouse) window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf = 0;
    let visible = true;
    const start = performance.now();

    const applyProps = () => {
      const p = propsRef.current;
      program.uniforms.raysColor.value = hexToRgb(p.raysColor);
      program.uniforms.raysSpeed.value = p.raysSpeed;
      program.uniforms.lightSpread.value = p.lightSpread;
      program.uniforms.rayLength.value = p.rayLength;
      program.uniforms.pulsating.value = p.pulsating ? 1 : 0;
      program.uniforms.fadeDistance.value = p.fadeDistance;
      program.uniforms.saturation.value = p.saturation;
      program.uniforms.mouseInfluence.value = wantsMouse ? p.mouseInfluence : 0;
      program.uniforms.noiseAmount.value = p.noiseAmount;
      program.uniforms.distortion.value = p.distortion;
      program.uniforms.uInvert.value = p.blendMode === "multiply" ? 1 : 0;
      program.uniforms.uOpacity.value = p.opacity;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      smooth.x += (mouse.x - smooth.x) * 0.08;
      smooth.y += (mouse.y - smooth.y) * 0.08;
      program.uniforms.mousePos.value = [smooth.x, smooth.y];
      program.uniforms.iTime.value = (now - start) * 0.001;
      applyProps();
      renderer.render({ scene: mesh });
    };

    const renderOnce = () => {
      program.uniforms.iTime.value = 0;
      applyProps();
      renderer.render({ scene: mesh });
    };

    if (reduced) {
      // One composed frame, no loop. The rays are still there; they just do not move.
      renderOnce();
    } else {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !visible) {
            visible = true;
            raf = requestAnimationFrame(frame);
          } else if (!entry.isIntersecting && visible) {
            visible = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0 }
      );
      io.observe(host);
      raf = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        if (wantsMouse) window.removeEventListener("pointermove", onPointerMove);
        if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (wantsMouse) window.removeEventListener("pointermove", onPointerMove);
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Intentionally mount-once: props are applied through propsRef inside the
    // loop, so none of them belong in this dependency list. Rebuilding the GL
    // context on every prop change would be both slow and leaky.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ mixBlendMode: blendMode }}
    />
  );
}
