"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { translateTextStrict } from "@/lib/translation/client";

/**
 * Page-wide fallback translator for hardcoded English that next-intl does not
 * cover. Mounted once in the root layout.
 *
 * Safety rule: it never inserts, removes or wraps DOM nodes (what makes
 * Chrome's built-in translator crash React). It only rewrites the value of
 * existing text nodes and four display attributes. If React re-renders a node
 * back to English, the observer sees the change and translates it again.
 * Originals are remembered so switching back to English restores them.
 */

const EXCLUDED_PATHS = ["/admin", "/super-admin"];
const ATTRIBUTES = ["title", "alt", "placeholder", "aria-label"] as const;
// Never touched at all, text or attributes.
const SKIP_SELECTOR =
  'script, style, noscript, code, pre, svg, [translate="no"], [contenteditable=""], [contenteditable="true"], [data-no-translate]';
// Text inside these is what people typed or chose: attributes such as a
// placeholder may translate, the content never does.
const USER_VALUE_SELECTOR = "textarea, select, option";
const PRESERVED = new Set(["CauseKind", "Cause", "Kind", "Google", "Google Maps", "Google Translate", "NGO", "NGOs", "WhatsApp", "OTP", "RMH Advisors", "Sahas Charitable Trust"]);
const MAX_LENGTH = 1_000;

const latinLetter = /\p{Script=Latin}/u;
const nonLatinLetter = /(?!\p{Script=Latin})\p{L}/u;

function shouldTranslate(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH || PRESERVED.has(trimmed)) return false;
  if (!latinLetter.test(trimmed) || nonLatinLetter.test(trimmed)) return false; // already translated / no words
  if (/^(?:https?:\/\/|www\.)\S+$/i.test(trimmed) || /^\S+@\S+\.\S+$/.test(trimmed)) return false;
  if (/^[+\d\s()./:-]*[A-Za-z]{0,2}[+\d\s()./:-]*$/.test(trimmed) && /\d/.test(trimmed)) return false; // codes, phones, "10 km"
  if (/^[a-z]+(?:_[a-z]+)+$/.test(trimmed)) return false; // icon ligatures
  return true;
}

function isSkipped(element: Element | null): boolean {
  return !element || Boolean(element.closest(SKIP_SELECTOR));
}

type TranslationRecord = { source: string; shown: string };

export function AutoPageTranslator() {
  const locale = useLocale();
  const pathname = usePathname();
  const excluded = EXCLUDED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (locale === "en" || excluded) return;
    let active = true;
    const texts = new Map<Text, TranslationRecord>();
    const attributes = new Map<Element, Map<string, TranslationRecord>>();

    async function translateValue(value: string): Promise<string | null> {
      const leading = value.match(/^\s*/)![0];
      const trailing = value.match(/\s*$/)![0];
      try { return leading + await translateTextStrict(value.trim(), locale) + trailing; }
      catch { return null; } // stays original; failures are never cached
    }

    function handleText(node: Text) {
      const value = node.nodeValue ?? "";
      const record = texts.get(node);
      if (record && value === record.shown) return; // our own write
      if (isSkipped(node.parentElement) || node.parentElement?.closest(USER_VALUE_SELECTOR) || !shouldTranslate(value)) return;
      void translateValue(value).then((translated) => {
        // Apply only if React has not changed the node meanwhile.
        if (!active || translated === null || node.nodeValue !== value || translated === value) return;
        texts.set(node, { source: value, shown: translated });
        node.nodeValue = translated;
      });
    }

    function handleAttributes(element: Element) {
      if (isSkipped(element)) return;
      for (const name of ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (value === null) continue;
        const record = attributes.get(element)?.get(name);
        if (record && value === record.shown) continue;
        if (!shouldTranslate(value)) continue;
        void translateValue(value).then((translated) => {
          if (!active || translated === null || element.getAttribute(name) !== value || translated === value) return;
          let records = attributes.get(element);
          if (!records) attributes.set(element, records = new Map());
          records.set(name, { source: value, shown: translated });
          element.setAttribute(name, translated);
        });
      }
    }

    function scan(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) { handleText(root as Text); return; }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const element = root as Element;
      handleAttributes(element);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).matches(SKIP_SELECTOR)
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) handleText(node as Text);
        else handleAttributes(node as Element);
      }
    }

    // Batch mutations: the client queue groups the resulting strings into
    // shared /api/translate requests.
    const pending = new Set<Node>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      for (const node of pending) if (node.isConnected) scan(node);
      pending.clear();
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") mutation.addedNodes.forEach((node) => pending.add(node));
        else pending.add(mutation.target);
      }
      if (!timer) timer = setTimeout(flush, 150);
    });

    scan(document.body);
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES],
    });

    return () => {
      active = false;
      observer.disconnect();
      if (timer) clearTimeout(timer);
      // Restore English (or the previous language's source) for anything still
      // showing our translation, so a language switch never leaves stale text.
      for (const [node, record] of texts) if (node.nodeValue === record.shown) node.nodeValue = record.source;
      for (const [element, records] of attributes) {
        for (const [name, record] of records) if (element.getAttribute(name) === record.shown) element.setAttribute(name, record.source);
      }
    };
    // pathname is deliberately not a dependency: client navigation is picked up
    // by the observer, and re-running would flash shared chrome back to English.
  }, [locale, excluded]);

  return null;
}
