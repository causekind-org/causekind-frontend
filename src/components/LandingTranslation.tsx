"use client";

import { cloneElement, useMemo, type ReactElement, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMessages } from "next-intl";
import { useDynamicTranslation, useDynamicTranslations } from "@/hooks/useDynamicTranslation";

const preservedNames = new Set(["CauseKind", "Cause", "Kind", "Google", "Google Translate", "RMH Advisors", "Sahas Charitable Trust", "NGO", "NGOs", "WhatsApp"]);

// Every string value in the active next-intl catalogue. Text from t(...) was
// already translated on the server (static file or Google), so sending it to
// /api/translate again would only re-translate Hindi into Hindi and bill it.
const catalogueStrings = new WeakMap<object, Set<string>>();

function stringsOf(messages: object): Set<string> {
  let strings = catalogueStrings.get(messages);
  if (!strings) {
    strings = new Set();
    const walk = (value: unknown) => {
      if (typeof value === "string") strings!.add(value.trim());
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(messages);
    catalogueStrings.set(messages, strings);
  }
  return strings;
}

const EMPTY_MESSAGES = {};

function useMessagesOrEmpty(): object {
  // Many tests mock next-intl without useMessages; Vitest throws on access to
  // a missing mock export. The outcome is stable per module, so the hook
  // order never changes between renders.
  try { return useMessages() ?? EMPTY_MESSAGES; }
  catch { return EMPTY_MESSAGES; }
}

function usePathnameOrNull(): string | null {
  // Same as above for suites that mock next/navigation without usePathname.
  try { return usePathname(); }
  catch { return null; }
}

function useCatalogueStrings(): Set<string> {
  const messages = useMessagesOrEmpty();
  return useMemo(() => stringsOf(messages), [messages]);
}

// Any letter outside the Latin script means the text is not the English
// source (Devanagari, Tamil, Arabic, …): never translate it again.
const nonLatinLetter = /(?!\p{Script=Latin})\p{L}/u;

function shouldTranslate(text: string, catalogue: Set<string>): boolean {
  const trimmed = text.trim();
  return /\p{L}/u.test(trimmed) && !preservedNames.has(trimmed) &&
    !catalogue.has(trimmed) && !nonLatinLetter.test(trimmed) &&
    !/^(?:https?:\/\/|www\.|\S+@\S+\.\S+)/i.test(trimmed) &&
    !/^[a-z]+(?:_[a-z]+)+$/.test(trimmed); // Material icon ligatures
}

/** Shared components retain their existing behavior away from landing routes. */
export function useLandingTranslation(text: string): string {
  const pathname = usePathnameOrNull();
  const catalogue = useCatalogueStrings();
  const enabled = (pathname === "/" || pathname === "/ngo") && shouldTranslate(text, catalogue);
  const translated = useDynamicTranslation(enabled ? text : null);
  return enabled ? translated ?? text : text;
}

export function useLandingTranslations(texts: string[]): string[] {
  const pathname = usePathnameOrNull();
  const catalogue = useCatalogueStrings();
  const onLanding = pathname === "/" || pathname === "/ngo";
  const wanted = texts.map((text) => onLanding && shouldTranslate(text, catalogue));
  const translated = useDynamicTranslations(texts.map((text, index) => wanted[index] ? text : ""));
  return texts.map((text, index) => wanted[index] ? translated[index] ?? text : text);
}

/** Keep joined scripts intact instead of putting their individual glyphs in boxes. */
export function splitLandingHeading(text: string): string[] {
  return /[^\u0000-\u024f]/u.test(text) ? [text] : Array.from(text);
}

/** No extra DOM element: text stays valid in buttons, options and SVG labels. */
export function LandingText({ children }: { children: ReactNode }) {
  const source = typeof children === "string" ? children : "";
  const translated = useLandingTranslation(source);
  return typeof children === "string" ? translated : children;
}

/** Localize display/accessibility attributes, never values, URLs or handlers. */
export function LandingAttributes({ children, ...forwarded }: { children: ReactElement; [key: string]: unknown }) {
  const childProps = children.props as Record<string, unknown>;
  const props = { ...childProps, ...forwarded };
  // Radix `asChild` may inject handlers, attributes and a ref into this boundary.
  // Preserve those and compose the actual element's handlers instead of losing
  // the trigger behavior when localizing its title or accessible name.
  for (const [key, handler] of Object.entries(forwarded)) {
    const original = childProps[key];
    if (/^on[A-Z]/.test(key) && typeof original === "function" && typeof handler === "function") {
      props[key] = (...args: unknown[]) => {
        original(...args);
        if (!(args[0] as { defaultPrevented?: boolean } | undefined)?.defaultPrevented) handler(...args);
      };
    }
  }
  const childRef = childProps.ref;
  const forwardedRef = forwarded.ref;
  const mergedRef = useMemo(() => {
    if (!forwardedRef || forwardedRef === childRef) return childRef;
    if (!childRef) return forwardedRef;
    return (node: unknown) => {
      const cleanups = [childRef, forwardedRef].map((ref) => {
        if (typeof ref === "function") {
          const cleanup = ref(node);
          return typeof cleanup === "function" ? cleanup : () => ref(null);
        }
        const objectRef = ref as { current: unknown };
        objectRef.current = node;
        return () => { objectRef.current = null; };
      });
      return () => { cleanups.forEach((cleanup) => cleanup()); };
    };
  }, [childRef, forwardedRef]);
  const title = useLandingTranslation(typeof props.title === "string" ? props.title : "");
  const alt = useLandingTranslation(typeof props.alt === "string" ? props.alt : "");
  const placeholder = useLandingTranslation(typeof props.placeholder === "string" ? props.placeholder : "");
  const ariaLabel = useLandingTranslation(typeof props["aria-label"] === "string" ? props["aria-label"] : "");
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ...props,
    ...(mergedRef ? { ref: mergedRef } : {}),
    ...(typeof props.title === "string" ? { title } : {}),
    ...(typeof props.alt === "string" ? { alt } : {}),
    ...(typeof props.placeholder === "string" ? { placeholder } : {}),
    ...(typeof props["aria-label"] === "string" ? { "aria-label": ariaLabel } : {}),
  });
}
