# CauseKind frontend

## Generated files

`src/lib/staticSlugs.ts` is auto-generated on every build — never edit it by hand.

It lists the valid blog, initiative and category slugs so `src/proxy.ts` can answer an unknown one with a real 404. `scripts/generate-static-slugs.mjs` rewrites it from `src/data/blogData.ts`, `src/lib/initiatives.ts` and `src/lib/inKindCategories.ts` before every build and dev start (the `prebuild`/`predev` scripts, and again from `next.config.ts`). To add a post, initiative or category, edit only its source file. If the generator cannot read a source file it stops the build with an error.

## /scan: Diwali QR donation page

`/scan` is reached only from the QR code in the Diwali video ad. It is `noindex` and not in the sitemap.

Set `NEXT_PUBLIC_API_BASE_URL` to the Spring Boot API origin. It falls back to `NEXT_PUBLIC_API_URL` if unset. The page holds no secrets: the Razorpay key ID comes from the order response, and a donation counts as successful only when `POST /api/donations/qr/verify` returns `PAID`.

The code is in `src/features/scan-donation`.
