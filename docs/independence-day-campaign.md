# Independence Day Campaign Control

The homepage includes a **temporary, reversible Independence Day presentation**: one full-width announcement strip with a seamless celebratory greeting ticker. Its desktop action area provides a primary **Browse Needs** route and a secondary **List an Item** route, and it does not change donation, listing, verification, or navigation logic.

## Activation

By default, the campaign renders from **10 August 2026, 00:00 IST** through **18 August 2026, 00:00 IST**. The dates are represented in UTC in `src/lib/independence-day.ts` to avoid server/runtime timezone ambiguity.

| Requirement | Configuration | Result |
| --- | --- | --- |
| Use the scheduled campaign period | Leave `NEXT_PUBLIC_INDEPENDENCE_DAY_CAMPAIGN` unset | Banner is displayed only during the default date window. |
| Launch early or extend the campaign | `NEXT_PUBLIC_INDEPENDENCE_DAY_CAMPAIGN=on` | Banner is always displayed after the application is rebuilt and deployed. |
| Remove the campaign immediately | `NEXT_PUBLIC_INDEPENDENCE_DAY_CAMPAIGN=off` | Banner is hidden after the application is rebuilt and deployed. |

Add the optional public variable to the deployment environment or `.env.local`; the documented placeholder is in `.env.example`. Because this is a `NEXT_PUBLIC_` variable, it is compiled into the frontend build and must never contain a secret.

## Files

| File | Responsibility |
| --- | --- |
| `src/lib/independence-day.ts` | Campaign copy, date window, and override logic. |
| `src/components/IndependenceDayStrip.tsx` | Full-width announcement strip, decorative tricolour treatment, seamless greeting ticker, balanced desktop action pair, and reduced-motion fallback. |
| `src/app/HomeClient.tsx` | Renders the full-width strip once above the separate desktop and mobile homepage trees. |
| `src/lib/independence-day.test.ts` | Verifies date-window and manual-override behavior. |
| `src/components/IndependenceDayStrip.test.tsx` | Verifies the balanced desktop action pair, duplicated seamless ticker runs, and compact accessible mobile composition. |

## Mobile and Accessibility Guardrails

The **full-width strip** is deliberately shallow and uses an uncapped full-width inner layout: its action pair aligns against responsive page-edge padding rather than a centred maximum-width container. It uses a 48 px minimum height on narrow screens and a 56 px minimum height at `sm` and above. Its left decoration is a full saffron-white-green tricolour field with a restrained chakra detail; a dark translucent overlay, a dark date tile, and text shadow preserve the greeting’s readability over the white flag band. Below 480 px it removes the date tile; below 720 px it removes the paired strip actions together, leaving the greeting ticker uncluttered and allowing the existing homepage content to begin immediately below. The greeting runs continuously at a linear 26-second pace and uses two identical tracks to avoid a visible reset. Under `prefers-reduced-motion`, it remains static.

The strip remains mobile-first: its decorative tricolour elements and the one moving ticker track are hidden from assistive technology, while one concise screen-reader message remains available. The ticker lettering uses one solid navy-black colour throughout; no duplicate layer, gradient, or clipped overlay is used. Under `prefers-reduced-motion`, the ticker becomes static. The desktop action pair has visible keyboard focus rings and disables its nonessential transitions under `prefers-reduced-motion`.

## Validation Completed

The targeted strip and activation tests pass, including the full tricolour field, chakra detail, paired action destinations, and the single solid navy-black ticker track. After the card removal, the full frontend test suite passes with **133 tests**, and the production `next build` continues to complete successfully, including TypeScript and Tailwind compilation.
