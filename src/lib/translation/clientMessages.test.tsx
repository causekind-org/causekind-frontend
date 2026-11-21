import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import en from "../../../messages/en.json";
import hi from "../../../messages/hi.json";
import { useUiText } from "@/components/UiText";
import { uiKey } from "@/lib/uiText/key";
import { clientMessagesFor } from "./clientMessages";

vi.unmock("next-intl");

// Every context string written in code: <UiText context="x"> or ui("…", "x").
function contextsInSource(): string[] {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) {
        const src = fs.readFileSync(full, "utf8");
        for (const m of src.matchAll(/context=\{?"([^"]+)"/g)) found.add(m[1]);
        for (const m of src.matchAll(/ui\([^,()]+,\s*"([^"]+)"\)/g)) found.add(m[1]);
      }
    }
  };
  walk(path.join(process.cwd(), "src"));
  return [...found];
}

// The English source text (and context) of every catalogue entry, recovered
// from the formatted value and proven by re-deriving the key from it.
function sources() {
  const t = createTranslator({ locale: "en", messages: en, namespace: "ui" });
  const contexts = contextsInSource();
  return Object.keys(en.ui).map((key) => {
    const text = t(key as never) as string;
    const context = uiKey(text) === key ? undefined : contexts.find((c) => uiKey(text, c) === key);
    return { key, text, context };
  });
}

function All({ items }: { items: { text: string; context?: string }[] }) {
  const ui = useUiText();
  return <>{items.map((it, i) => <span key={i}>{ui(it.text, it.context)}</span>)}</>;
}

function renderAll(messages: Record<string, unknown>, items: { text: string; context?: string }[], onError = vi.fn()) {
  const { container } = render(
    <NextIntlClientProvider locale="en" messages={messages} onError={onError}>
      <All items={items} />
    </NextIntlClientProvider>,
  );
  return [...container.querySelectorAll("span")].map((s) => s.textContent);
}

describe("clientMessagesFor", () => {
  it("drops only `ui`, and only for English", () => {
    const trimmed = clientMessagesFor("en", en);
    expect("ui" in trimmed).toBe(false);
    expect(Object.keys(trimmed).sort()).toEqual(Object.keys(en).filter((k) => k !== "ui").sort());
    expect(clientMessagesFor("hi", hi)).toBe(hi);
  });

  it("every catalogue entry has a known source text and context", () => {
    const unexplained = sources().filter((s) => uiKey(s.text, s.context) !== s.key);
    expect(unexplained).toEqual([]);
  });

  it("English UiText output is identical with and without `ui`, with no errors", () => {
    const items = sources();
    const onError = vi.fn();
    const full = renderAll(en, items);
    const without = renderAll(clientMessagesFor("en", en), items, onError);
    expect(without).toEqual(full);
    expect(without).toEqual(items.map((i) => i.text));
    expect(onError).not.toHaveBeenCalled();
  });
});
