import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Drop-in replacement for `next/link` with prefetching OFF by default.
 *
 * Every `<Link>` in the viewport prefetches its route, and on Vercel each
 * prefetch is an Edge Request plus a function invocation (our pages are
 * dynamic, because of the locale cookie). The homepage alone prefetched ~21
 * routes per visit, which is what exhausted the free plan's 1M Edge Requests
 * in September 2026.
 *
 * Only the routes below keep Next's default prefetch. An explicit `prefetch`
 * prop still wins, so a call site can opt in or out deliberately.
 */
const PREFETCH_PATHS = new Set(["/donate/money", "/register", "/login", "/requests"]);

type Props = ComponentProps<typeof NextLink>;

function pathOf(href: Props["href"]): string | undefined {
  const raw = typeof href === "string" ? href : href.pathname ?? undefined;
  return raw?.split(/[?#]/)[0];
}

export default function Link({ prefetch, ...props }: Props) {
  const path = pathOf(props.href);
  const resolved = prefetch !== undefined ? prefetch : path && PREFETCH_PATHS.has(path) ? undefined : false;
  return <NextLink prefetch={resolved} {...props} />;
}
