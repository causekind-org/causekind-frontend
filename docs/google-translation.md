# Google Translation

## Local implementation status — 2026-10-13

Phases 1 and 2 are implemented locally, **changed, not tested**. No tests,
TypeScript check, build, browser check, cache-warming command, or Google API
request was initiated by the agent. No credentials were read or configured,
and no backend/database changes, commits, pushes or deployments were made.

The existing language selector, its 14 languages, and `ck_locale` cookie remain.
Google Translate powers translation through
[Cloud Translation Basic v2](https://cloud.google.com/translate).

## Interface messages

`messages/en.json` is the source. `src/i18n/request.ts` obtains messages from
`getInterfaceCatalogue`, which **reads `messages/<locale>.json` first** (fix
2026-10-13): every key present there is used as-is, free, with any hand
corrections. Google is asked only for keys the file lacks (newer features). A
namespace fully covered by the file makes no Google call or cache lookup.
With no API key the result is exactly the old loader: locale file over English.
Editing a locale file changes the namespace cache key, so it shows without a
cache-version bump. The paragraphs below describe the Google path for the
missing keys only.

The server parses ICU messages into an AST and translates only literal text.
Placeholders, rich-text tag names, plural/select branches, offsets, pound signs,
and number/date formatting skeletons stay in code. The ICU printer escapes
translated literals and the result must parse before it can be cached. Text
around placeholders is translated as separate literal segments, so translations
can still need editorial review for natural phrasing. This does not add plural
forms that were absent from the English source.

Successful messages and complete namespaces use the persistent Next Data Cache.
Keys include English source, target language and `GOOGLE_TRANSLATE_CACHE_VERSION`.
Changing English invalidates the affected entries naturally. A failed message
falls back to English; incomplete namespaces are not cached as complete.

Cold renders may wait for translation and may show a mix of translated and
English messages when the provider/queue/budget fails. Warm the cache before
release. Google requests have a 10-second timeout, queued misses expire after
15 seconds, and at most four batches run per process. Pages allow a 60-second
server duration where the hosting plan supports it. These bounds are not a
promise of cold-page latency; cache I/O and hosting also contribute.

The document language identifies machine-translated interface output. The
selector behavior is retained; this work does not fix the existing RTL layout
limitations. Hardcoded landing text uses the separate client path below; other
application routes are not automatically covered.

## Hardcoded landing text

`LandingTranslation.tsx` connects hardcoded visible copy in the home/NGO landing
trees and shared navigation/footer/menu/dialog surfaces to the dynamic Google
client. It runs only on `/` and `/ngo`, so shared components retain their prior
behavior elsewhere. This includes seasonal heroes, donation CTAs, role-specific
sections, cinematic captions and accessible labels/placeholders/alt text.

The helpers render React text and clone elements for attributes; they do not
mutate the DOM outside React. Cloned controls preserve refs and composed handlers
from Radix `asChild`. Form values, URLs, identifiers, explicit account/reviewer
names and standalone protected brands stay original. Existing next-intl messages
are still served through the catalogue. No translated JSON files are added.

**No double translation (fix 2026-10-13).** Many wrapped strings come from
`t(...)` and are already translated on the server. The helpers skip any text
that is a value in the active next-intl catalogue, and any text containing a
non-Latin letter, so only genuinely hardcoded English reaches
`/api/translate`. Without this, every landing visit re-sent already-Hindi copy
to Google. Interpolated `t(...)` output in Spanish/French is not in the
catalogue verbatim and may still be re-sent; it is rare and cached.

Animated labels translate complete phrases before splitting. Joined scripts
render as whole runs, and focus brackets remeasure after translated copy changes.
Initial English is displayed until the asynchronous translation arrives; failures
keep English. The existing warmer covers the catalogue/blog, not these landing
literals. Successful on-page translations reuse the normal caches.

This follow-up is **changed, not tested**. No Google calls, credentials access,
browser checks, tests, typecheck or build were initiated by the agent. Translation
layout and interactive controls still need explicitly authorized verification.

## Every other page — `AutoPageTranslator` (2026-10-13)

`src/components/AutoPageTranslator.tsx` is mounted once in the root layout
(only when the API key is set). On a non-English locale it scans `document.body`
and translates leftover English through the same client queue and
`/api/translate`, then keeps a `MutationObserver` running so lists, tabs and
dialogs that render later are covered too.

- **It never adds, removes or wraps nodes.** It only rewrites existing text
  node values and the `title`/`alt`/`placeholder`/`aria-label` attributes. If
  React re-renders a node in English, it is translated again.
- **Skipped:** `/admin`, `/super-admin`; `script/style/noscript/code/pre/svg`;
  `translate="no"`, `data-no-translate`, contenteditable; text inside
  `textarea/select/option` (user values); text with any non-Latin letter
  (already translated); URLs, emails, phone numbers, codes/OTPs and numeric
  values; brand names (CauseKind, NGO, Google Maps, …); strings over 1,000 chars.
- Switching back to English restores the originals it changed.
- Handover pages are not excluded: OTP/handover codes are digits and are
  skipped by the numeric rule. Add `data-no-translate` to anything else that
  must stay verbatim.
- Text appears in English first and switches about a second later. Database
  content (need titles, descriptions) is translated wherever it is shown.

## Blog behavior

`src/data/blogTranslations/index.ts` **reads
`public/blog-translations/<locale>.json` first** (fix 2026-10-13). A post or
insider tip present there is served from the file with no Google call. Google
covers only posts/tips missing from it. For those, listing pages translate only
card/tip metadata. The reader passes only the current article's English HTML into the
Google-backed text-node translator; it does not load every article's body.

Only text nodes are replaced. Markup, attributes, links and media are preserved;
`script`, `style`, `noscript`, `code`, `pre`, and `translate="no"` are skipped.
Translated spans carry machine-translation language tags. The reader still
sanitizes the assembled HTML before displaying it. Failures show the English
article and are not saved as a successful assembled translation. Successful
individual nodes remain cached, so later attempts reuse completed work.

Post metadata and article cache keys include English source content. A locale
or article switch immediately stops displaying the previous translation.

## Dynamic content and storage

The existing dynamic hooks use same-origin `POST /api/translate`; MyMemory is
removed. Google detects source language for this path. Selecting English still
shows original user content, including content originally written in another
language. This retains the existing product behavior.

Plain text is split at up to 4,000 UTF-16 code units without dropping content or
splitting surrogate pairs. Splitting can reduce translation context. The client
batches up to 32 strings/20,000 code units per request and caches only successful
results in bounded memory plus tab session storage. New namespacing prevents
reuse of old MyMemory/legacy blog caches. Open tabs retain their successful
client translations until the session ends; bumping the server cache revision
does not clear already-open browser caches.

Persistent server storage is **Next Data Cache**, not a database or editorial
translation-management system. Hosting determines persistence/eviction. Manual
correction workflows and durable database-owned translations remain outside
this implementation.

## Configuration

Set these server-only variables in the frontend's gitignored `.env.local` and
hosting environment. Never prefix the API key with `NEXT_PUBLIC_`:

- `GOOGLE_TRANSLATE_API_KEY`: a key restricted to Cloud Translation API, with
  that API and billing enabled in its Google project.
- `GOOGLE_TRANSLATE_MAX_CHARACTERS_PER_DAY=100000`: attempted uncached characters
  per process/UTC day. Warming multiple languages and blogs can exceed this;
  choose an allowance deliberately before warming.
- `GOOGLE_TRANSLATE_CACHE_VERSION=1`: bump to invalidate all server translation
  cache layers after a translation-policy/quality change.

### Required before go-live: a daily cap in Google Cloud

The code cannot cap spending: every Vercel instance keeps its own counters.
Only Google can enforce one limit for the whole site. Set it before adding the
key to any deployment:

1. Google Cloud Console → select the project that owns the key.
2. **APIs & Services → Enabled APIs & services → Cloud Translation API → Quotas & System Limits.**
3. Find **"v2 and v3 general model characters per day"** (wording may vary
   slightly) → tick it → **Edit quota**.
4. Enter a daily character limit you are willing to pay for (for example
   500,000 = about US$10/day at the US$20 per million list price) → **Submit**.
5. Optionally also lower **"characters per minute"** to blunt bursts.
6. **Billing → Budgets & alerts**: add a budget on the project with e-mail
   alerts at 50% / 90% / 100%. A budget alerts only; the quota is what stops calls.

When the quota is hit, Google returns errors and the site falls back to the
original text. Nothing breaks.

### What the endpoints enforce themselves (per instance, a backstop only)

Both endpoints require same-origin browser requests (`Origin` plus
`Sec-Fetch-Site: same-origin`) and allow 60 requests/minute/IP.

`POST /api/translate` additionally splits each request into:

- **Site text** — text found in the blog source (titles, descriptions,
  article text). Translated and cached permanently, as before.
- **Free text** — anything else (need titles, user content, hardcoded landing
  copy). At most 32 items (the browser's batch size) of ≤1,000 characters per
  request, 60 such requests per minute per IP (120/min overall), and the cache entry expires after 7 days so junk cannot pile
  up. Refused items come back untranslated; the rest of the batch still works.

Scripts can fake these headers, so they stop casual abuse only — the Google
quota above is the real limit. A provider failure opens a short circuit
breaker; cached successes remain usable. Hosting must overwrite forwarded-IP
headers.

Do not send identity documents, OTPs, or secrets through public-content hooks.
Text sent through them is processed by Google and cached. A footer note links
to Google Translate for configured non-English sessions.

## Manual cache warming — not run

Use Node with TypeScript stripping support (Node 22.6+). Start the normal Next
server yourself, then run against the exact deployment/cache you intend to warm:

```powershell
npm run translate:warm -- --url http://localhost:3000 --locales hi,mr
# Optionally also warm blog metadata and article text:
npm run translate:warm -- --url http://localhost:3000 --locales hi,mr --blogs
```

This is a **potentially billable operation**, not a build step. The command does
not load credentials or call Google directly: it calls the running server with
known interface keys in batches, using `POST /api/translate/messages`. Optional
blog warming extracts the same text nodes/chunks as the client and uses the
plain-text endpoint. Requests are paced below the local rate limit. It stops
on any failed/incomplete batch, preserving successes for the next run. Use
source files matching the target deployment. Local warming does not warm a
remote deployment. A protected deployment needs authorized access configured
separately; the command does not bypass deployment protection.

`npm run translate` is an alias for this warmer. The former
`generate-translations.mjs`, `generate-blog-translations.mjs`, and
`translate-missing-blogs.mjs` scripts now exit with migration instructions;
they make no calls and write no files.

## Retained files and next checkpoint

The 13 non-English `messages/<locale>.json` files and
`public/blog-translations/<locale>.json` are **live again** and take priority
over Google. Do not delete them. To correct a translation, edit the file. The
warmer skips every key/post they already cover, so warming pays only for gaps.
Verification still needed: typecheck/tests/build, a configured Google request,
language switching and placeholders/plurals/rich text, blog markup, fallback on
missing key/quota/errors, and visual review including existing RTL limitations.
No claim of tested behavior is made here.

References: [REST API](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate),
[ICU syntax](https://formatjs.github.io/docs/core-concepts/icu-syntax/),
[attribution](https://docs.cloud.google.com/translate/attribution),
[machine-translation markup](https://docs.cloud.google.com/translate/markup).
