# CauseKind frontend

## /scan: Diwali QR donation page

`/scan` is reached only from the QR code in the Diwali video ad. It is `noindex` and not in the sitemap.

Set `NEXT_PUBLIC_API_BASE_URL` to the Spring Boot API origin. It falls back to `NEXT_PUBLIC_API_URL` if unset. The page holds no secrets: the Razorpay key ID comes from the order response, and a donation counts as successful only when `POST /api/donations/qr/verify` returns `PAID`.

The code is in `src/features/scan-donation`.
