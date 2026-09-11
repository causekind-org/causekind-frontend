import { rmSync } from "node:fs";

/**
 * Delete `.next/cache` before every build.
 *
 * <p><b>Why this exists.</b> On 2026-09-11 production served today's JavaScript
 * with yesterday's CSS. One deployment, verified: the JS bundle contained
 * `ck-mobile-hero-trust` and `ck-doors-heading` — markup from that very commit —
 * while the stylesheet it shipped had no rule for `ck-mobile-hero-trust` at all,
 * and matched commit `793e62a`'s `styles.css` exactly (4 occurrences of
 * `ck-showcase-hero` against 27, zero of `ck-mobile-hero-trust` against 10).
 *
 * <p>The result on a phone was the whole mobile hero falling back: the CTAs
 * restacked full width, the category rail reappeared where it should be hidden,
 * and the trust band went back to clipping its own labels. Every one of those
 * rules was in the repo and in the local production build — they just never
 * reached the browser.
 *
 * <p>`.next/cache` is the only thing Vercel restores between builds, so it is
 * the only place that staleness can survive. Clearing it costs build time and
 * buys a build that cannot disagree with the source.
 *
 * <p><b>Before removing this</b>, confirm the underlying bug is gone: deploy,
 * then check that the served stylesheet actually contains a rule you changed in
 * that same commit. A green build proves nothing here — the broken deployment
 * built cleanly too.
 */
rmSync(".next/cache", { recursive: true, force: true });
