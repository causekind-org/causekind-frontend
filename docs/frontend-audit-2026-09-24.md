# CauseKind Frontend — Codebase Audit

**Date:** 24 September 2026
**Commit:** `59f9db2` (branch `feature/doneesidefixes`, merged up to date with `origin/main`)
**Scope:** `causekind-frontend` — 306 `.tsx`, 99 `.ts`, 12 `.css`, ~97,000 lines under `src/`, 44 routes, 147 MB of `public/` assets.
**Method:** static read of the whole tree, plus a real `next build`, a full `vitest run`, `tsc --noEmit`, and `npm run lint`.

---

## 1. Verdict

This is a well-built codebase with an unusually high standard of *written reasoning*. Comments explain why a decision was made, not what the line does — the request cache's cross-user hazard, the build-cache clearing incident of 2026-09-11, the `isLoading` vs `isRestoring` distinction in `useAuth`. Zero `console.log`, zero `TODO`/`FIXME`, only 18 `any` in 97k lines, and a genuinely sound auth model (httpOnly cookie, no token in web storage). Very few teams at this stage get those right.

The problems are not in the code that was carefully written. They are in the **gaps around it**: nothing enforces quality automatically, a compliance switch is flipped to "off" in production, the i18n design silently costs both SEO and rendering, and seasonal campaign code accretes faster than it is removed.

**Three things matter more than everything else in this document:**

1. Analytics consent is hard-bypassed in production. Three trackers fire on every visitor with no banner.
2. There is no CI. No workflow runs tests, typecheck, or build on any push — and the suite is currently red.
3. Every one of 44 routes renders dynamically. Nothing is static, including `/terms` and `/faq`.

---

## 2. Health snapshot

| Check | Command | Result |
|---|---|---|
| Typecheck | `tsc --noEmit` | ✅ clean |
| Production build | `npm run build` | ✅ succeeds (16.6 s compile, Next 16.3.4 + Turbopack) |
| Tests | `npx vitest run` | ❌ **8 failed / 520 passed** (2 files) |
| Lint | `npm run lint` | ❌ **broken** — script does not run at all |
| CI | — | ❌ **none exists** |

Two of those five are red and a third does not exist. That is the headline.

---

## 3. Findings

### P0 — Fix now

---

#### P0-1 · Analytics consent is bypassed for all production traffic

`TESTING_BYPASS = true` is hardcoded in three components, each disabling its own consent gate:

- `src/components/MetaPixel.tsx:90`
- `src/components/ClarityAnalytics.tsx:11`
- `src/components/GoogleTagManagerGated.tsx:49`

All three are mounted unconditionally in the root layout (`src/app/layout.tsx:147-149`), above a comment that says the consent banner is "coming back". No banner is mounted, so `consent` can never become `"accepted"` on its own — the bypass is the only reason tracking works.

Meta Pixel, Microsoft Clarity (a **session recorder**) and GTM therefore load for every visitor to causekind.com with no notice and no opt-out. Clarity is the sharpest edge: it records session replays, and CauseKind's flows carry donor and recipient PII — names, phone numbers, addresses, uploaded ID documents in the NGO verification wizard.

This is a live compliance exposure under India's DPDP Act and, for any EU visitor, GDPR. The consent infrastructure already exists and is tested (`src/lib/cookieConsent.ts`, `src/hooks/useCookieConsent.ts`) — only the banner and the three constants are missing.

> **The failing tests are this finding.** All 8 failures are the consent-gate specs in `MetaPixel.test.tsx` and `GoogleTagManagerGated.test.tsx`. They encode the correct behaviour, they went red the moment the bypass landed, and with no CI nothing reported it. The guardrail worked; nobody was listening.

**Fix:** restore the banner, delete the three constants, confirm the 8 tests go green. Until the banner ships, at minimum gate Clarity off — session recording is the highest-risk of the three.

---

#### P0-2 · No CI pipeline

`causekind-frontend` has no `.github/` directory. Nothing runs `vitest`, `tsc --noEmit`, or `next build` on push or PR.

The direct consequence is P0-1's red suite sitting unnoticed on `main`. The structural consequence is that every quality signal in this repo is advisory.

**Fix:** one workflow, ~20 lines, on `pull_request` and `push`:

```yaml
- npm ci
- npx tsc --noEmit
- npx vitest run
- npm run build
```

Make it a required status check. This is the single highest-leverage change in this document — it converts every other finding from "someone must remember" into "the machine refuses".

---

#### P0-3 · `npm run lint` is broken; the project has no linter at all

```
$ npm run lint
Invalid project directory provided, no such directory: D:\causekind\causekind-frontend\lint
```

`next lint` was removed in Next 16. The bare word `lint` is now parsed as a directory argument. There is also no ESLint config anywhere (`.eslintrc*`, `eslint.config.*` — none) and no `eslint` in `node_modules`.

Meanwhile **39 `eslint-disable` comments** across `src/` are suppressing a linter that has not run in this project for some time — including one in `src/i18n/request.ts` disabling `@typescript-eslint/no-explicit-any`.

That the code is nonetheless clean is a credit to the authors, but it is discipline standing in for tooling.

**Fix:** `npm i -D eslint eslint-config-next@16 @eslint/eslintrc`, add a flat `eslint.config.mjs`, change the script to `eslint .`. Expect a first-run backlog; fix what it finds and wire it into the CI job above. `eslint-plugin-jsx-a11y` (bundled with `eslint-config-next`) will catch the accessibility items in P2 automatically.

---

### P1 — High

---

#### P1-1 · Every route is dynamically rendered

The build output shows `ƒ (Dynamic) server-rendered on demand` for all 44 routes. The only `○ (Static)` entry is `sitemap.xml`.

`/terms`, `/privacy`, `/refund`, `/faq`, `/about`, `/give-safely` and every `/blog/[slug]` are fixed content. They are being rendered per request, on a backend whose own docs describe a deliberately cold Neon pool.

The cause is `src/i18n/request.ts`, which calls `cookies()` to read `ck_locale`. That makes the root layout dynamic, which makes the entire route tree dynamic. Nothing else in the app is responsible.

**Fix:** this is the same root cause as P1-2 and P1-3 — see the i18n note below. Short of that redesign, a partial win is available by moving the locale read out of the root layout for the static-content subtree.

---

#### P1-2 · The full translation bundle ships on every page load

`src/app/layout.tsx:109,150` does:

```tsx
const messages = await getMessages();
// ...
<NextIntlClientProvider messages={messages}>
```

That serialises **every message for the active locale** into the RSC payload of **every page**. And because `request.ts` deep-merges each locale over English so partial translations degrade gracefully (a genuinely good design), the payload is the merged superset:

| Locale | Raw file |
|---|---|
| `en` | 75 KB |
| `hi` | 103 KB |
| `ta` | 126 KB |
| `ml` | 124 KB |

A Tamil-speaking visitor on `/terms` downloads ~126 KB of JSON, essentially all of it for pages they are not on. `en.json` alone holds 1,550 keys.

**Fix:** narrow the provider per route. `next-intl` supports passing a subset:

```tsx
<NextIntlClientProvider messages={pick(messages, ['Nav', 'Footer', 'Home'])}>
```

Keep the full set only where a page genuinely needs it. Expect a 60–90 KB reduction on most routes — the largest single payload win available.

---

#### P1-3 · Locale lives in a cookie, so translated content is invisible to search

Locale is resolved from the `ck_locale` cookie, not the URL. There are no `/hi/...` routes, no `hreflang` tags, and no per-locale canonicals.

For a platform whose audience is Indian donors and recipients, and which has paid to translate 1,550 keys into 13 languages, **none of that translated content can be indexed**. Google crawls one URL per page and gets English. The whole translation investment is invisible to organic search.

**Fix:** adopt `next-intl`'s routing integration with a `[locale]` segment. This is a meaningful refactor — but it resolves P1-1, P1-2 and P1-3 together, since URL-based locale removes the `cookies()` call that forces dynamic rendering, allows `generateStaticParams` per locale, and lets each route load only its own namespace. If the full migration is too large right now, sequence it: P1-2 (cheap, immediate) → P1-3 (unlocks P1-1).

---

#### P1-4 · `<html lang="en">` is hardcoded, and RTL is broken

`src/app/layout.tsx:117`:

```tsx
<html lang="en" suppressHydrationWarning>
```

The active locale is already known server-side at this point. Two consequences:

**Accessibility.** A screen reader announces Hindi, Tamil, Bengali and Malayalam content with English pronunciation rules. This is a WCAG 3.1.1 (Language of Page) failure across 13 of 14 locales.

**RTL is non-functional.** `ur` (Urdu) and `ar` (Arabic) are both in `LANGUAGE_OPTIONS` and both are right-to-left. `<html>` carries no `dir`, and only `src/components/MobileUI.tsx:171` sets one locally. Several components already carry Tailwind `rtl:` variants — `rtl:rotate-180` in `src/app/requests/new/page.tsx:1379`, `md:rtl:-scale-x-100` in `AudiencePathwaysSection.tsx:208` — and **none of them ever activate**, because `rtl:` compiles to a `[dir="rtl"]` ancestor selector that no element satisfies. Someone wrote correct RTL handling that is dead code.

**Fix:** low effort, high value.

```tsx
const locale = await getLocale();
const dir = locale === 'ur' || locale === 'ar' ? 'rtl' : 'ltr';
return <html lang={locale} dir={dir} suppressHydrationWarning>
```

---

#### P1-5 · ~90 MB of unprocessed WhatsApp video exports served from `public/`

`src/components/money-donation/ImpactCarousel.tsx:8-15` references seven files by their raw export names:

```
/videos/WhatsApp Video 2026-09-05 at 3.20.14 PM.mp4   →  32.1 MB
/videos/WhatsApp Video 2026-09-05 at 3.23.16 PM.mp4   →  28.3 MB
/videos/WhatsApp Video 2026-09-05 at 3.25.11 PM.mp4   →  24.5 MB
                                                  (+4 more)
```

`public/` totals **147 MB**, and these seven are ~90 MB of it. All seven `<video>` elements carry `autoPlay` (line 406). `preload="metadata"` limits the initial fetch, but `autoPlay` means the browser begins streaming each one as it becomes eligible. On `/donate/money`, on an Indian mobile connection, that is a punishing page.

Three distinct problems, worth separating:

- **Weight** — a 32 MB source for a carousel card that renders at ~400 px wide.
- **Filenames** — spaces and periods in URLs, requiring encoding at every use, and `WhatsApp Video 2026-09-05 at 3.25.13 PM.mp4` tells a future reader nothing about what is in it.
- **Git history** — 90 MB of binaries in the repo, permanently, on every clone.

**Fix:** transcode to web H.264/VP9 at display resolution (expect 200–600 KB each, a ~99% reduction), rename descriptively, move to S3/CDN alongside the other user media, and set `preload="none"` with `autoPlay` only on the active card.

---

#### P1-6 · No error boundaries anywhere

The entire 44-route app has **two** boundary files, both under one route:

```
src/app/requests/category/[slug]/error.tsx
src/app/requests/category/[slug]/loading.tsx
```

No `global-error.tsx`, no root `error.tsx`, no root `not-found.tsx`, and no `componentDidCatch` / React error boundary class anywhere in `src/`.

With 235 client components, 289 `useEffect` calls and pervasive network fetching, a single render throw in `/dashboard` (2,288 lines) or `/admin/dashboard` (2,198 lines) drops the user on Next's unstyled default error page with no recovery path.

**Fix:** add `src/app/global-error.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`, then per-section `error.tsx` for `/dashboard`, `/admin`, `/super-admin`, `/profile`. Each is ~20 lines with a retry button.

---

### P2 — Medium

---

#### P2-1 · ~20 hand-rolled modals bypass the Radix Dialog already installed

`@radix-ui/react-dialog` is a dependency and `src/components/ui/dialog.tsx` exists — but only **5 files import it**. Meanwhile **36 hand-rolled `fixed inset-0 z-…` overlays** span at least 20 files, including `admin/dashboard`, `super-admin`, `VerificationQueuePanel`, `GlobalSearch`, `MatchChatPopup`, `CameraCaptureDialog` and `LocationGate`.

Each hand-rolled overlay independently lacks focus trapping, focus restoration on close, `aria-modal`/`role="dialog"`, background scroll locking, and `inert` on the rest of the page. `"Escape"` is handled in 22 separate places, each slightly differently.

For a keyboard or screen-reader user, most of the admin console's dialogs are unusable: focus stays behind the overlay, Tab walks the page underneath, and nothing announces that a dialog opened.

**Fix:** migrate to `ui/dialog.tsx`. Radix handles all of the above. Prioritise the admin and super-admin consoles, where the density is highest.

---

#### P2-2 · Click handlers on non-interactive elements

25 `<div>`/`<span>` elements carry `onClick` with no `role`, `tabIndex` or `onKeyDown`. Most are benign `stopPropagation` guards, but several are real controls:

- `src/app/requests/RequestsClient.tsx:1227` — the file-upload dropzone, keyboard-unreachable
- `src/app/admin/dashboard/page.tsx:1021` — expandable queue row
- `src/components/Navbar.tsx:361` — `<div onClick={onClick}>` wrapper

**Fix:** use `<button type="button">` with reset styling. `eslint-plugin-jsx-a11y` (P0-3) flags all of these.

---

#### P2-3 · Fetches are not cancelled on unmount

`AbortController` appears exactly **once** in the whole codebase — `src/hooks/useAuth.tsx:116` — against 289 `useEffect` calls, many of which fetch.

`api.ts` is set up for this correctly: `request()` honours a caller-supplied `signal` and only applies its own timeout when none is given (`src/lib/api.ts:174`). The plumbing exists and is unused.

The real symptom is not the React warning (React 18 removed it) but **response races**: change a filter twice quickly on `/requests` and whichever request returns last wins, not whichever was asked for last.

**Fix:** standard pattern in fetching effects:

```ts
useEffect(() => {
  const ac = new AbortController();
  load({ signal: ac.signal }).catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => ac.abort();
}, [deps]);
```

Prioritise the filter-driven lists: `RequestsClient`, `CampaignsClient`, `BlogIndexClient`, `GlobalSearch`.

---

#### P2-4 · The GET cache grows without bound

`src/lib/api.ts:57-58`:

```ts
const inFlightGetRequests = new Map<string, Promise<any>>();
const getCacheMap = new Map<string, { data: any; timestamp: number }>();
```

Entries are added on every successful GET and removed only by `getCacheMap.clear()` on a mutation. There is no TTL sweep and no size cap — an expired entry is skipped on read but never deleted.

A read-heavy session that never mutates — an admin paging the verification queue, or type-ahead search where the query string is part of the key — accumulates full response payloads for the lifetime of the tab.

The surrounding doc comment is excellent on the *correctness* hazard (cross-user leakage if this ever ran server-side) and the guard is right. The lifecycle is the loose end.

**Fix:** cap it. An LRU bounded at ~50 entries, or sweep expired keys on write:

```ts
if (getCacheMap.size > 50) {
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [k, v] of getCacheMap) if (v.timestamp < cutoff) getCacheMap.delete(k);
}
```

---

#### P2-5 · Font loading is heavier than it needs to be

Nine families are loaded through `next/font`:

- Root layout: Plus Jakarta Sans, Nunito, Source Serif 4, Inter, Lora, Roboto Mono
- `HeroSection.tsx`: Anton
- `certificate/page.tsx`: Dancing Script, Playfair Display

Six of those are declared on `<body>` in the root layout, so `next/font` emits a `<link rel="preload">` for each on **every route** — the layout's own comment acknowledges this.

On top of that, `src/styles.css:1` opens with a remote import:

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:...&display=swap');
```

A CSS `@import` of a third-party stylesheet is the worst case for this: render-blocking, discoverable only after the main stylesheet parses, un-preloadable, and it bypasses the self-hosting and subsetting `next/font` exists to provide. It also loads for every visitor including the English-only majority who never render Devanagari.

The Material Symbols `<link>` in `<head>`, by contrast, is handled well — subset to eight named glyphs with pinned axes, `display=swap`, and a `preconnect`. That is the model the Devanagari font should follow.

**Fix:** move Noto Sans Devanagari to `next/font/google` so it is self-hosted and subset, and load it only for locales that need it. Audit whether six body-level families are all in use; each one removed is a preload removed from every page.

---

#### P2-6 · Seasonal campaign code accumulates faster than it is removed

28 files still reference the Independence Day (15 Aug) and Raksha Bandhan (27 Aug – 1 Sep) campaigns. Both are expired as of today. The merge that opened this session removed the Ganpati campaign — 32 asset files and 3 modules — which confirms the pattern is recognised, just reactively.

Still present:

- `src/lib/independence-day.ts`, `src/lib/raksha-bandhan.ts` (+ 4 test files)
- `RakshaBandhanIntro/Strip/NavAdornment/Wordmark`, `RakhiMotif`, `ThreadOfProtection`, `UnclaimedSection` (+ 7 test files)
- Conditional branches threaded into `HomeClient.tsx`, `Navbar.tsx`, `DoorSwapReveal.tsx`
- `public/rakhi-intro-1080p.mp4` (4.2 MB) and `public/rakhi-intro-720p.mp4` (1.6 MB)
- Two `NEXT_PUBLIC_*` env vars and two docs

11 of the 50 test files — **22% of the entire suite** — test expired seasonal features. That is a meaningful share of maintenance attention going to code that cannot run.

**Fix:** two parts. Remove the expired campaigns now (the Ganpati commit is the template). Then make the next one cheaper to remove: a single `src/campaigns/<name>/` directory with one registry entry, one env flag and one mount point, so retirement is a directory deletion rather than an archaeology exercise.

---

### P3 — Low / hygiene

---

#### P3-1 · Twenty unused dependencies

Confirmed by import-statement search — zero references in `src/` or `scripts/`:

| Package | Note |
|---|---|
| `pg` | **A Postgres driver in a frontend.** Node-only, and the frontend talks to the Spring backend over HTTP. Most likely a copy-paste from the backend's manifest. Remove first. |
| `embla-carousel-react` | shadcn `carousel.tsx` was never added |
| `cmdk` | shadcn `command.tsx` was never added |
| `react-resizable-panels` | shadcn `resizable.tsx` was never added |
| `date-fns` | |
| 15 × `@radix-ui/react-*` | `accordion`, `aspect-ratio`, `avatar`, `checkbox`, `collapsible`, `context-menu`, `menubar`, `navigation-menu`, `radio-group`, `scroll-area`, `separator`, `slider`, `toggle`, `toggle-group`, `tooltip` |

To be precise about impact: **none of these ship to the browser bundle** — unimported packages are not bundled. The cost is install time, `package-lock.json` churn, supply-chain surface, and the false impression that the project uses them. `pg` is the one worth removing on principle rather than on size.

---

#### P3-2 · Seven `.jsx` files are outside the type checker

```
src/components/{CardGlow,ClickSpark,DotGrid,GradualBlur,MagicBento,SpecularButton,StaggeredMenu}.jsx
```

`tsconfig.json` sets `"allowJs": false`, so `tsc --noEmit` never sees them — the clean typecheck reported in section 2 excludes these seven files entirely. Next.js still compiles them via SWC, so they ship untyped and unchecked.

Several are not trivial: `MagicBento.jsx` and `DotGrid.jsx` drive GSAP animations with `InertiaPlugin`, `SpecularButton.jsx` runs a WebGL shader through `ogl`. These look like vendored React Bits components — more may be incoming.

**Fix:** convert to `.tsx`. Even `any`-typed props beat invisibility, and it puts them under the CI typecheck from P0-2.

---

#### P3-3 · `npm run build:ds` cannot work

`tsup.config.ts:20` declares `entry: { index: "src/design-system-entry.ts" }`. **That file does not exist** — `src/design-system/` contains only `entry.css` and `fonts.css`.

`package.json` also points `main`, `module` and `types` at `dist/`, which is never produced.

The config itself is remarkable — ~90 lines of comments documenting a real, unresolved `next/image` crash in the design-sync preview bundle, complete with the hypotheses that were tried and disproved. That knowledge is worth keeping. The build it belongs to is broken.

**Fix:** restore the missing entry file, or move the config into `.design-sync/` and drop the `dist`-pointing fields from `package.json` so the package does not advertise an artefact it never builds.

---

#### P3-4 · JSON-LD is injected without escaping

Nine files do `dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}` inside a `<script type="application/ld+json">` — `app/page.tsx`, `about`, `contact`, `faq`, `blog/[slug]`, and others.

Current risk is negligible: every input is static local data from `blogData.ts` and hardcoded strings. But `JSON.stringify` does not escape `<`, so a string containing `</script>` closes the tag and everything after it becomes executable markup. The moment schema content is sourced from the API or a CMS, this becomes live XSS in nine places at once.

Blog body HTML is handled properly by comparison — `BlogPostClient.tsx:179` runs `DOMPurify.sanitize` during render, with a comment explaining why it must happen before paint.

**Fix:** one shared helper, nine call sites.

```ts
const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');
```

---

#### P3-5 · Client-side role gating is cosmetic

`AdminRedirect` and `SuperAdminRedirect` read `user.role` from `useAuth`, which hydrates from the `ck_user` localStorage entry. 29 call sites branch on `role === "ADMIN"` / `"SUPER_ADMIN"`.

Anyone can set `localStorage.ck_user = '{"email":"x","role":"SUPER_ADMIN"}'` and render the admin shell. No data leaks — the backend rejects the requests with 403, and `api.ts` handles `SESSION_REVOKED` and friends correctly (`src/lib/api.ts:23-30`) — but the console's structure, panel names and action labels are exposed, and the admin route code is in the client bundle regardless.

This is defence-in-depth, not a breach. Worth a confirmation pass that **every** admin and super-admin endpoint enforces server-side, since the frontend provides no barrier.

---

#### P3-6 · Component organisation has drifted

- `src/components/` holds **88 loose `.tsx` files** at its root plus 17 subdirectories. Finding the right one means knowing it already.
- `src/app/components/` exists separately with 2 files (`AnimatedWrapper.tsx`, `StaggerContainer.tsx`) — a second, near-empty components root inside the route tree.
- **235 of 306 components (77%) are `"use client"`**, and 25 of 44 `page.tsx` files are fully client-side. High for App Router; some is genuine interactivity, but pages like `/items/[id]` being client-only also costs them `generateMetadata`.
- `src/styles.css` is **3,999 lines** of global CSS in a Tailwind 4 project, with ~60 hand-written animation and utility sections.
- `src/lib/api.ts` is **4,382 lines** — every endpoint in the app in one module. Excellently documented, but a single file no one can hold in their head.

None of this is broken. All of it is friction that compounds.

**Fix (incremental, no big bang):** move the 2 files out of `src/app/components/`; split `api.ts` by domain (`api/auth.ts`, `api/listings.ts`, `api/admin.ts`, sharing the `request()` core) as files are touched; group the 88 loose components by feature the same way; and when a global CSS section is next edited, ask whether it belongs in the component.

---

## 4. What is genuinely good

Worth recording, because an audit that only lists problems misrepresents the codebase.

- **Auth.** httpOnly cookie for the JWT, only non-secret `{email, role}` in localStorage, legacy `ck_token` keys actively cleaned up, and the `isLoading` vs `isRestoring` split (`useAuth.tsx:22-36`) shows someone thought hard about the guest-flash-versus-false-logout tradeoff and documented the conclusion.
- **`api.ts` error handling.** Per-status messages written for humans, `readJsonBody` tolerating all five legitimate ways a backend says "no content", non-JSON gateway errors surfaced as readable text, `AbortSignal.timeout` tuned differently for server (8 s) and browser (20 s) with the reasoning written out.
- **The cache-scope guard.** `canUseRequestCache()` correctly identifies that a module-level Map on the Next server is process-global and would be a cross-user data leak — and blocks it *before* anyone hit the bug. It has its own test file.
- **`clear-build-cache.mjs`.** A post-incident fix with the incident written into the comment: the date, the exact symptom, the commit hash of the stale CSS, the occurrence counts that proved it, and explicit instructions for what to verify before removing it. This is what a good defect comment looks like.
- **Reduced-motion coverage.** 26 CSS `prefers-reduced-motion` blocks and 64 components checking it. For a site this animation-heavy, that is thorough.
- **Sitemap.** Derived from `blogData` and `IN_KIND_CATEGORIES` rather than hand-listed, with documented exclusion rules for redirecting and auth-gated routes. It cannot drift.
- **i18n fallback merge.** Deep-merging each locale over English so a missing key degrades to readable English rather than a raw dotted path — and the comment notes the second-order benefit, that shipping a feature no longer requires 14 simultaneous translations.
- **Security headers.** `vercel.json` carries a real CSP with a specific allowlist, HSTS with preload, `object-src 'none'`, `base-uri 'self'`, and a scoped `Permissions-Policy`. Most projects this age have none of it.
- **Code hygiene.** Zero `console.log`. Zero `TODO`/`FIXME`/`HACK`. 18 `any` and 9 `@ts-expect-error` in 97,000 lines.

---

## 5. Recommended sequence

**Week 1 — stop the bleeding**

1. Restore the consent banner, delete the three `TESTING_BYPASS` constants, get the 8 tests green *(P0-1)*
2. Add the CI workflow: typecheck + test + build, as a required check *(P0-2)*
3. Install and configure ESLint; fix the script *(P0-3)*
4. Set `lang` and `dir` on `<html>` — a two-line change that fixes WCAG 3.1.1 across 13 locales and activates the RTL code already written *(P1-4)*

**Weeks 2–3 — the measurable wins**

5. Narrow `NextIntlClientProvider` per route — 60–90 KB off most pages *(P1-2)*
6. Transcode and relocate the impact videos — ~90 MB → under 5 MB *(P1-5)*
7. Add root and per-section error boundaries *(P1-6)*
8. Remove the expired Independence Day and Raksha Bandhan campaigns *(P2-6)*
9. Drop the 20 unused dependencies, `pg` first *(P3-1)*

**Month 2 — the structural one**

10. Migrate to `[locale]` URL routing. Resolves P1-3 (translated content becomes indexable), P1-1 (routes can be static again) and completes P1-2. This is the largest item here and the one with the highest ceiling — 13 languages of paid translation currently earn zero organic traffic.

**Ongoing**

11. Migrate hand-rolled modals to Radix Dialog, admin console first *(P2-1, P2-2)*
12. Add `AbortController` to filter-driven fetches *(P2-3)*
13. Split `api.ts` and regroup `src/components/` opportunistically, as files are touched *(P3-6)*
