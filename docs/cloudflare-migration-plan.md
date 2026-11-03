# Cloudflare Migration Plan — causekind.com frontend

**Decided:** 2026-11-03. Move the **production** frontend from Vercel Hobby to **Cloudflare Workers (Paid, $5/month)** using the OpenNext adapter. **Staging stays on Vercel** for now.

This document is self-contained: everything found during research and the test build is written down here, so work can start at any time without re-investigating. Before starting, only re-check the items marked **(re-verify)**, because they can change over time.

---

## 1. Why we are moving

| Fact (2026-11-03) | Value |
|---|---|
| Vercel Hobby CDN request limit | 1,000,000 per **rolling 30 days** (there is no reset date) |
| Our usage | **1,009,245**: over the limit |
| Production traffic | ~21K requests / 12h ≈ **40K/day** (budget to stay under the limit ≈ 33K/day) |
| Staging (Preview) traffic | 48 requests / 12h, negligible |
| Requests per homepage visit | ~15–20 (JS chunks, images, fonts, API) |
| Trend | Jumped on Oct 15 (65–90K/day), still 40–90K/day; will not drop on its own |

Other reasons:
- Vercel Hobby is for **non-commercial use only**. CauseKind takes donations and runs ads, so staying on Hobby is not a long-term option.
- Cloudflare: static files are free and unlimited; $5 covers 10M Worker requests/month (~50× current use); many Indian edge locations; free bot/DDoS protection.
- The alternative was Vercel Pro at $20/month plus usage overage. We rejected it on cost.

## 2. Cost

| Item | Cost |
|---|---|
| Cloudflare account, DNS, CDN, SSL | Free |
| Static assets (JS/CSS/images/fonts) | Free, unlimited |
| **Workers Paid**: required, because our bundle is 8.6 MB (free limit is 3 MB) | **$5/month** |
| R2 (cache storage): 10 GB + 1M writes/month free | Free at our size |
| D1 (tag cache): 5 GB free | Free at our size |
| Cloudflare Images: 5,000 unique transformations/month free | Free at first, then $0.50 per 1,000 |
| Vercel Hobby (staging only) | Free |

## 3. Test build results (done 2026-11-03)

The test ran in a throwaway copy (scratchpad), not in the repo. Source commit: FE `staging` `b0ed8b0a`.

| Check | Result |
|---|---|
| `@opennextjs/cloudflare` version | 1.20.15 (with latest wrangler) |
| Next.js | 16.2.x, React 19 |
| `next build` | ✅ passes |
| OpenNext Cloudflare build | ✅ passes. **On Windows, Developer Mode must be on** (it is needed for symlinks). Without it the build fails with `EPERM symlink`. |
| Worker upload size | **45.2 MB raw / 8.6 MB gzipped**. Paid limit is 10 MB, so 86% is used |
| Static assets | 87 MB (these don't count toward the Worker limit) |
| Local `wrangler dev` | `/` `/about` `/faq` `/blog` `/donate/money` `/login` all return 200 |
| `/hi` | 404. **Expected:** the locale comes from the `ck_locale` cookie, not the URL (see `src/proxy.ts`). Test Hindi by setting the cookie. |
| Build warning | "Node.js middleware support is experimental in cloudflare" (it applies to `src/proxy.ts`) |

Test config used (it is the starting point; section 6 extends it):

```ts
// open-next.config.ts (minimal; NOT enough for production, see 6.1)
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```
```jsonc
// wrangler.jsonc (minimal)
{
  "name": "causekind-frontend-test",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
}
```

Commands:
```bash
npm i -D @opennextjs/cloudflare@latest wrangler@latest
npx opennextjs-cloudflare build                               # build
npx wrangler deploy --dry-run --outdir dist-dry               # prints "Total Upload ... / gzip ..."
npx wrangler dev --port 8799                                  # local Workers preview
npx opennextjs-cloudflare deploy                              # real deploy
```

## 4. Compatibility audit: what breaks and what is fine

### 🔴 Must fix before go-live

| # | Problem | Where | Effect if ignored | Fix (section) |
|---|---|---|---|---|
| R1 | `unstable_cache` translation cache does not persist | `src/lib/translation/server.ts`, `src/lib/translation/messages.ts` | Every Hindi view could call Google Translate again, so **the bill spikes** | R2 incremental cache + D1 tag cache (6.1) |
| R2 | Security headers live in `vercel.json`, which Cloudflare ignores | `vercel.json` | CSP, HSTS, Permissions-Policy (camera, Razorpay), nosniff and the staging noindex are all **lost** | Move them to `next.config.ts` `headers()` + `public/_headers` (6.2) |
| R3 | ISR `revalidate` needs the same cache | `src/app/[locale]/page.tsx` (60), `requests/page.tsx` (60), `ngos/[slug]` (3600), `sitemap.ts` (3600), `src/lib/api.ts:209` fetch revalidate 60 | Pages re-render on every visit, putting **more load on EB** | Same as R1, plus the DO queue (6.1) |
| R4 | `next/image` optimiser (used in 48 files) | `next.config.ts` images, remotePatterns S3/unsplash | Images fail or aren't optimised | Cloudflare Images binding `IMAGES` (6.3) |

### 🟡 Should fix

| # | Problem | Where | Fix |
|---|---|---|---|
| Y1 | Client IP read from `x-forwarded-for` | `src/proxy.ts` `getClientIp`, `src/lib/translation/request.ts:24` | Prefer `cf-connecting-ip` and fall back to the old headers (6.4). It affects the internal-traffic Pixel exclusion, the staging gate lockout and the per-IP translate limit. |
| Y2 | `isomorphic-dompurify` pulls in `jsdom` (large and Workers-unfriendly) | `src/app/[locale]/blog/[slug]/BlogPostClient.tsx` | Replace with `dompurify` (client-only) or `sanitize-html`; it saves bundle space (6.5) |
| Y3 | `maxDuration` exports are Vercel-only | `api/translate/*`, `[locale]/layout.tsx` | Harmless and ignored; leave them |
| Y4 | Staging gate failed-attempt map is in memory | `src/stagingGate.ts` | Same as on Vercel (best effort). No change; staging stays on Vercel anyway. |

### ✅ Checked and fine
- Server actions (2 files) work.
- Notifications SSE (`src/hooks/useNotifications.tsx`) connect straight to the backend, so they're unaffected.
- `getHeroImages.ts` (uses `fs.readdir`) is **not used anywhere**. Delete it or leave it.
- Backend (EB), Neon DB, Razorpay (webhook goes to the backend), SES and S3 aren't affected.
- Google OAuth and Maps: the domain stays `causekind.com`, so no origin changes for prod. Only the temporary `workers.dev` test URL would need adding (see 7.2).
- `sharp` in package.json is not used at runtime on Workers (Images binding replaces it).

## 5. Long-term risks we accepted, and how we manage them

| Risk | Mitigation |
|---|---|
| **10 MB Worker size ceiling** (we're at 8.6 MB, and there is no bigger plan) | Remove jsdom (Y2). Add a **CI size check that fails above 9.0 MB gzipped** (6.7). Review big dependencies when it's close. |
| OpenNext lags new Next.js releases | **Pin `next` to an exact version** (no `^`). Upgrade only after the OpenNext changelog lists support, and test on the preview Worker first. |
| Node.js middleware is "experimental" on Cloudflare | `proxy.ts` is small (locale rewrite + IP cookie). If an upgrade breaks it, move the locale logic into an edge-runtime middleware or the layout. |
| Staging (Vercel) ≠ prod (Cloudflare) | Every release is checked on the **Cloudflare preview Worker** before `main` deploys (8). Move staging to Cloudflare later (phase 9). |
| Weaker logs than Vercel Observability | Enable **Workers Logs** (`observability.enabled`). Backend logs stay the source for payments. |
| Builds need Linux or Developer Mode | CI builds on GitHub Actions (ubuntu). Locally, keep Windows Developer Mode on. |

## 6. Code changes (one branch, from `staging`)

Branch: `cloudflare-migration` from `staging`. Follow the repo rules: push to `staging` only after approval; `main` only via a `--no-ff` merge; no PRs via API; no co-author tag.

### 6.1 Cache: R2 + D1 + Durable Object queue (fixes R1, R3)

```ts
// open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
```
**(re-verify)** the override import paths and binding names against the OpenNext Cloudflare "Caching" docs at the time, because they occasionally rename.

Create the resources:
```bash
npx wrangler r2 bucket create causekind-next-cache
npx wrangler d1 create causekind-next-tag-cache     # copy the database_id into wrangler.jsonc
```

### 6.2 Security headers (fixes R2)
- Copy every header from `vercel.json` into `next.config.ts` → `headers()` with `source: "/:path*"`. Keep the existing `/volunteer-handover` entry, and add the staging-host noindex rule (`has: [{ type: "host", value: "staging.causekind.com" }]`).
- Also create `public/_headers` with the same CSP/HSTS/nosniff for static assets, because Next `headers()` doesn't apply to files served straight from assets.
- Keep `vercel.json` too (staging still runs on Vercel). Long-term, `next.config.ts` becomes the single source and `vercel.json` headers get removed.
- Verify with `curl -sI https://www.causekind.com/ | grep -i -E "content-security|strict-transport"`. Check `www.`, because the apex redirects and the redirect carries no CSP.

### 6.3 Images (fixes R4)
- Add the `"images": { "binding": "IMAGES" }` binding. OpenNext routes `/_next/image` through it.
- Keep `qualities` and `remotePatterns` as they are in `next.config.ts`.
- After go-live, watch Cloudflare Images usage. If it goes over 5K/month and cost matters, set `unoptimized: true` for S3 user photos only.

### 6.4 Client IP (fixes Y1)
In `src/proxy.ts` `getClientIp` and `src/lib/translation/request.ts`:
```ts
request.headers.get("cf-connecting-ip")
  ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? request.headers.get("x-real-ip")
```
Update the comment ("Behind a proxy/CDN (Vercel, etc.)") to mention Cloudflare.

### 6.5 Drop jsdom (Y2)
`BlogPostClient.tsx` is a client component. Use plain `dompurify` (browser), or `sanitize-html` if it must run on the server. Remove `isomorphic-dompurify` and `jsdom` from package.json. Re-measure the bundle size.

### 6.6 Final `wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "causekind-frontend",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-10-01",          // (re-verify) set to the date you start
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "observability": { "enabled": true },
  "images": { "binding": "IMAGES" },
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "causekind-frontend" }],
  "r2_buckets": [{ "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "causekind-next-cache" }],
  "d1_databases": [{ "binding": "NEXT_TAG_CACHE_D1", "database_name": "causekind-next-tag-cache", "database_id": "<from wrangler d1 create>" }],
  "durable_objects": { "bindings": [{ "name": "NEXT_CACHE_DO_QUEUE", "class_name": "DOQueueHandler" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["DOQueueHandler"] }],
  "env": {
    "preview": { "name": "causekind-frontend-preview" }   // the pre-release check Worker (section 8)
  }
}
```
Also: add `.open-next/` and `.wrangler/` to `.gitignore`; add package.json scripts `"cf:build": "opennextjs-cloudflare build"`, `"cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`, `"cf:deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`.

### 6.7 CI: GitHub Actions deploy + size guard
`.github/workflows/cloudflare-deploy.yml`:
- On push to `main`: deploy to prod Worker `causekind-frontend`.
- On push to `staging`: deploy to `causekind-frontend-preview` (with the staging API URL).
- Steps: checkout → Node 24 → `npm ci` → write `NEXT_PUBLIC_*` env (from GitHub Secrets) → `npx opennextjs-cloudflare build` → `npx wrangler deploy --dry-run --outdir dist` → **fail if gzip > 9000 KiB** → `npx opennextjs-cloudflare deploy`.
- GitHub Secrets: `CLOUDFLARE_API_TOKEN` (template "Edit Cloudflare Workers"), `CLOUDFLARE_ACCOUNT_ID`, and every `NEXT_PUBLIC_*` value.
- Then turn off Vercel production deploys from `main`: Vercel → Settings → Git → Ignored Build Step `if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 0; else exit 1; fi`.

### 6.8 Environment variables
**`NEXT_PUBLIC_*` are baked in at BUILD time,** so they go in GitHub Secrets (CI build env), not only in Cloudflare.

| Variable | Kind | Prod value source |
|---|---|---|
| NEXT_PUBLIC_API_URL | build | `https://api.causekind.com` |
| NEXT_PUBLIC_GOOGLE_CLIENT_ID | build | copy from Vercel Production |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | build | copy from Vercel |
| NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID | build | copy from Vercel |
| NEXT_PUBLIC_GTM_ID | build | copy from Vercel |
| NEXT_PUBLIC_META_PIXEL_ID | build | copy from Vercel (if still used) |
| NEXT_PUBLIC_DISABLE_TRACKING | build | as in Vercel prod (probably unset) |
| NEXT_PUBLIC_DIWALI_CAMPAIGN / NAVRATRI_CAMPAIGN / FORCE_RAKHI_INTRO | build | as in Vercel prod |
| NEXT_PUBLIC_FUNDRAISING_ENABLED | build | as in Vercel prod |
| NEXT_PUBLIC_NGO_ENABLED / NGO_DEMO_MODE / NGO_SAMPLE_DRIVES / NGO_LOCAL_TEST_MODE | build | **must stay UNSET in prod** (NGO is on hold) |
| GOOGLE_TRANSLATE_API_KEY | runtime secret | `wrangler secret put` |
| GOOGLE_TRANSLATE_CACHE_VERSION | runtime | as in Vercel |
| GOOGLE_TRANSLATE_MAX_CHARACTERS_PER_DAY | runtime | as in Vercel |
| GOOGLE_PLACES_API_KEY | runtime secret | `wrangler secret put` |
| GOOGLE_REVIEWS_PLACE_ID | runtime | as in Vercel |
| INTERNAL_TRAFFIC_IPS | runtime | as in Vercel |
| STAGING_PASSWORD | runtime | preview Worker only |

**(re-verify)** Export the real list from Vercel → Settings → Environment Variables (Production) on the day, and get the code's list with:
`grep -rhoE "process\.env\.[A-Z_0-9]+" src | sort -u`

## 7. Testing on `workers.dev`, before touching DNS

### 7.1 Deploy
`npm run cf:deploy` gives a URL like `https://causekind-frontend.<account>.workers.dev`.

### 7.2 Things that block a workers.dev test (temporary changes only)
- **Backend CORS:** the API only allows causekind.com origins. For testing, build against the **staging API** and temporarily add the workers.dev origin to staging backend CORS (Cloud Run env). Remove it afterwards.
- **Google login:** add the workers.dev origin to the OAuth client's Authorized JavaScript origins (staging client), and remove it afterwards.
- **Auth cookies:** if the backend sets cookies for `.causekind.com`, login may not stick on workers.dev. In that case do the full login test at phase 5 (preview subdomain) instead.

### 7.3 Test checklist (all must pass)
- [ ] Home, About, FAQ, Blog list + a blog post (jsdom replacement), Contact
- [ ] Hindi: set the `ck_locale=hi` cookie and reload. The page is Hindi, and the **second** load does not call Google Translate (check the Google Cloud API metrics: no new requests)
- [ ] Login (email OTP + Google), logout, register
- [ ] Donate item flow end to end; listing with photo upload (S3)
- [ ] Donate money: Razorpay checkout opens (₹1 test on staging keys)
- [ ] Requests page; NGO pages hidden (flags unset)
- [ ] Location picker (Google Maps loads, suggestions work)
- [ ] Notifications appear (SSE)
- [ ] Admin / super-admin dashboard, Command Center modals
- [ ] Images: hero, logos, S3 user photos render via `/_next/image`
- [ ] Headers: CSP, HSTS, Permissions-Policy present (`curl -sI`)
- [ ] Mobile check (real phone)
- [ ] Workers Logs show no errors and no "CPU time exceeded"
- [ ] Wait 2 minutes, change a request in the DB, and confirm the homepage updates (ISR revalidate works)

## 8. Release flow after migration

1. Push to `staging` → Vercel staging (as now) **and** the Cloudflare preview Worker.
2. Test on staging.causekind.com as usual, and click through the preview Worker for anything touching middleware, caching, images or headers.
3. Merge `staging` → `main` with `--no-ff`; CI deploys to the prod Worker.
4. Rollback for a bad release: `npx wrangler rollback` (instant, to the previous version), or Cloudflare dashboard → Workers → Deployments.

## 9. DNS cutover (the risky step, so do it slowly)

**Current state:** registrar = **GoDaddy**; DNS = **Vercel nameservers** (`ns1/ns2.vercel-dns.com`).

### 9.1 Before
- [ ] **(re-verify)** Export the live zone from Vercel → Domains → causekind.com → DNS (screenshot + list). The 08-26 copy is below; records may have changed since (e.g. Google verification, staging).
- [ ] Check the 7.3 checklist is fully green.
- [ ] Pick a low-traffic time (late night IST), not during a campaign.

### 9.2 Records to create in Cloudflare (from the 2026-08-26 zone; set every one to **DNS only / grey cloud** unless stated otherwise)

| Name | Type | Value | Proxy |
|---|---|---|---|
| @ | (Worker custom domain) | attach `causekind.com` to Worker `causekind-frontend` | orange (automatic) |
| www | (Worker custom domain) | attach `www.causekind.com` to the Worker; keep the apex/www redirect behaviour as today | orange |
| staging | CNAME | `cname.vercel-dns.com` (staging stays on Vercel) **(re-verify)** the target Vercel shows for the domain | **grey** |
| api | CNAME | `d1i0bvy7lacpnh.cloudfront.net` | **grey** (CloudFront has its own cert) |
| api-staging | (re-verify, if it exists in the live zone) | | grey |
| @ | MX 0 | `mail.causekind.com` | — |
| mail | MX 10 | `feedback-smtp.us-east-1.amazonses.com` | — |
| mail | A | `3.6.127.24` | grey |
| webmail | A | `3.6.127.24` | grey |
| @ | TXT | `v=spf1 +mx +a +ip4:3.6.127.24 ~all` | — |
| @ | TXT | `google-site-verification=SNKqTtUgyeCwx-V-idEZvuUX-R1wV33oZ6byf4YV54w` | — |
| mail | TXT | `v=spf1 include:amazonses.com ~all` | — |
| _dmarc | TXT | `v=DMARC1; p=none;` | — |
| causekindgsc | TXT | `google-site-verification=eOeIvOCW9o4XMPmzhcRHJngjtehxUaiYO3ghdu6bFaw` | — |
| pnnjaq2tcz3ai6mq4xb6rhrk4a4mwp2w._domainkey | CNAME | `pnnjaq2tcz3ai6mq4xb6rhrk4a4mwp2w.dkim.amazonses.com` | grey |
| 6x4xlc5ccrsgfvdeozi6tmh5ai7h6xss._domainkey | CNAME | `6x4xlc5ccrsgfvdeozi6tmh5ai7h6xss.dkim.amazonses.com` | grey |
| 5tbc4yod4pyzzq7qzemitfujuqr5houn._domainkey | CNAME | `5tbc4yod4pyzzq7qzemitfujuqr5houn.dkim.amazonses.com` | grey |
| _85eec1e9221198ef27b80c859a5aaec5 | CNAME | `_de2a4676212feed689382f0fbb5e43fd.jkddzztszm.acm-validations.aws` | grey |
| _c17a4cdf85718e0335095d7edd39282a.api | CNAME | `_3d7bfc254a879575d4246b7997d70a25.jkddzztszm.acm-validations.aws` | grey |
| y6xs2vf4ycrz | CNAME | `gv-dmcde2f24hzf7q.dv.googlehosted.com` | grey |
| blog | CNAME | `causekind.com` | orange |
| @ | CAA | `0 issue "amazon.com"` | — |
| @ | CAA | `0 issue "pki.goog"` | — |
| @ | CAA | `0 issue "sectigo.com"` | — |
| @ | CAA | `0 issue "letsencrypt.org"` | — |
| @ | CAA | **add** `0 issue "comodoca.com"`, `0 issue "digicert.com"`, `0 issue "ssl.com"` (Cloudflare's CAs) **(re-verify)** the CA list in Cloudflare's CAA docs | — |

Notes:
- **Today there is a wildcard `*` ALIAS to Vercel.** Do **not** copy the wildcard to Vercel. Create the explicit records above instead (www, staging, blog). Anything else stops resolving, which is fine.
- `mail` deliberately serves as both the inbound mail host and the SES MAIL FROM. Keep both.
- The ACM validation CNAMEs must stay forever, or the CloudFront cert renewal for `api` fails.
- **CAA matters:** without Cloudflare's CAs in CAA, Cloudflare can't issue the edge certificate and the site shows SSL errors.

### 9.3 Switch
1. Cloudflare dashboard → Add site `causekind.com` (Free plan for DNS is fine; Workers Paid is the account subscription). Let it scan, then **compare record by record** with 9.2 and fix any differences.
2. Attach the Worker custom domains (`causekind.com`, `www.causekind.com`).
3. SSL/TLS mode: **Full (strict)**. Always Use HTTPS: on.
4. GoDaddy → causekind.com → Nameservers → **Change to the two Cloudflare nameservers** shown.
5. Wait for propagation (minutes to a few hours). Check with `nslookup -type=NS causekind.com 8.8.8.8`.

### 9.4 Verify right after
- [ ] `curl -sI https://www.causekind.com` → 200, a `server: cloudflare` header, CSP present
- [ ] `curl -s https://api.causekind.com/health` → 200 (and the API still answers 401 JSON on protected routes)
- [ ] `https://staging.causekind.com` still opens the Vercel staging (password gate)
- [ ] Send a password-reset email → it arrives in Gmail inbox (SES DKIM/SPF pass)
- [ ] Inbound mail to the `@causekind.com` mailbox still arrives (MX)
- [ ] Rerun the 7.3 checklist on the real domain, including a **₹10 real donation** (Razorpay prod → receipt email)
- [ ] Google Search Console still verified

### 9.5 Rollback (if something is badly wrong)
- Fastest: in Cloudflare DNS, change `@`/`www` back to Vercel (remove the Worker custom domains, add CNAME `www` → `cname.vercel-dns.com`, apex A `76.76.21.21`, **grey**). The Vercel prod deployment is still there.
- Full: at GoDaddy, set the nameservers back to `ns1.vercel-dns.com` / `ns2.vercel-dns.com` (the Vercel zone is still intact).
- **Keep the Vercel production deployment and the Vercel DNS zone untouched for at least 30 days.**

## 10. After go-live

- [ ] Day 1–3: watch Workers Logs errors, CPU time, Google Translate spend (Google Cloud billing), EB load, Cloudflare Images usage.
- [ ] Week 1: check Search Console for crawl errors; check that Meta Pixel and GTM still fire.
- [ ] Day 30: if stable, remove `causekind.com` from the Vercel project's production domains and disconnect Vercel prod deploys. Keep Vercel for staging.
- [ ] Later (phase 11): move staging to Cloudflare too (`staging.causekind.com` → preview Worker with STAGING_PASSWORD), then retire Vercel entirely and delete the `vercel.json` headers.
- [ ] Update `causekind-backend/docs/project-file-guide.md` (hosting section) after go-live.

## 11. Phase checklist (overview)

| Phase | What | Who | Touches prod? |
|---|---|---|---|
| 0 | Create Cloudflare account, subscribe to Workers Paid ($5), create API token | User | No |
| 1 | Branch `cloudflare-migration`: sections 6.1–6.6 | Claude | No |
| 2 | Create R2 bucket + D1 DB; set secrets | Claude + user approval | No |
| 3 | Deploy to workers.dev; run the 7.3 checklist | Claude + user testing | No |
| 4 | CI workflow (6.7) + GitHub Secrets; merge to staging → preview Worker | Claude + user | No |
| 5 | Merge to main (Worker deploys, but DNS is still Vercel, so the site doesn't change) | Claude + user approval | No |
| 6 | DNS cutover (9) | User at GoDaddy + Claude checking | **Yes** |
| 7 | Monitor + 30-day cleanup (10) | Both | — |

## 12. Open decisions for the user
- Images: start with Cloudflare Images (free up to 5K/month), or serve unoptimised? **Default in this plan: Cloudflare Images.**
- Who holds the Cloudflare account login (use causekindorg@gmail.com, with 2FA on).
- Cutover date: avoid campaign windows.
