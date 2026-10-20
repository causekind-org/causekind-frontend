"use client";

import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/AppLink";

/**
 * Lets the fundraising admin pages run inside the admin dashboard's right-hand
 * panel (owner request 2026-10-19). When embedded, links between those pages
 * switch the panel instead of navigating, and route params come from the panel.
 * Outside the dashboard (direct URL) everything behaves as normal pages.
 */
type Embed = { go: (href: string) => void; params: Record<string, string> };
export const AdminFrEmbedContext = createContext<Embed | null>(null);

const INTERNAL = /^\/admin\/fundraising(\/|$)/;

export function FrLink({ href, children, ...rest }: { href: string; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const embed = useContext(AdminFrEmbedContext);
  if (embed && INTERNAL.test(href)) {
    return <a href={href} {...rest} onClick={(e) => { e.preventDefault(); embed.go(href); }}>{children}</a>;
  }
  return <Link href={href} {...rest}>{children}</Link>;
}

/** Route params: from the panel when embedded, from the URL otherwise. */
export function useFrParams<T extends Record<string, string>>(): T {
  const embed = useContext(AdminFrEmbedContext);
  const url = useParams<T>();
  return (embed ? embed.params : url) as T;
}

export function useFrEmbedded() {
  return useContext(AdminFrEmbedContext) !== null;
}
