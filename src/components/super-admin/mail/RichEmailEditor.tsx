"use client";

/**
 * Rich / HTML email body editor for the Mail Center (Phase 1b, 2026-11-23).
 *
 * Rich mode is tiptap; HTML mode is a plain textarea over the same string, so
 * switching never loses the stored HTML. Bodies tiptap cannot represent
 * faithfully (tables, layout divs, <center>, <style>) open in HTML mode and
 * Rich mode asks before converting them. The server sanitises on save
 * (MailHtmlSanitizer) — this component is not the security boundary.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent, Extension, type Editor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, BackgroundColor, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import {
  Undo2, Redo2, Bold, Italic, Underline as UIcon, Strikethrough, Subscript as SubIcon, Superscript as SupIcon,
  TextAlignStart, TextAlignCenter, TextAlignEnd, TextAlignJustify, List, ListOrdered, ListIndentIncrease, ListIndentDecrease,
  Quote, Link2, Unlink, Minus, RemoveFormatting, ImagePlus,
} from "lucide-react";
import { ImageLibraryDialog, type ImageInsert } from "./ImageLibraryDialog";

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Email-safe <img> (optionally wrapped in a link) for the chosen library image. */
export function imageHtml({ src, width, alt, href }: ImageInsert): string {
  const style = width ? "max-width:100%;height:auto;border:0;" : "width:100%;max-width:100%;height:auto;border:0;";
  const img = `<img src="${attr(src)}" alt="${attr(alt)}"${width ? ` width="${width}"` : ""} style="${style}">`;
  return href ? `<a href="${attr(href)}" target="_blank" rel="noopener">${img}</a>` : img;
}

export const FONT_FAMILIES = ["Arial", "Helvetica", "Verdana", "Tahoma", "Trebuchet MS", "Georgia", "Times New Roman", "Courier New"];
export const FONT_SIZES = [10, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 40];

/** Tags/blocks the rich editor would flatten — open these in HTML mode. */
const RICH_UNSAFE = /<(table|center|style|div[^>]*style|td|font)\b/i;

const MAX_INDENT = 6;
const INDENT_PX = 32;

/** Paragraph/heading indent as inline margin-left (email-safe). */
const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (el) => Math.min(MAX_INDENT, Math.round((parseInt(el.style.marginLeft, 10) || 0) / INDENT_PX)),
          renderHTML: (a) => (a.indent ? { style: `margin-left:${a.indent * INDENT_PX}px` } : {}),
        },
      },
    }];
  },
});

/** Keep width/style on images so 600/400/… px sizes survive a round trip. */
const EmailImage = Image.configure({ inline: true }).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      style: { default: null },
    };
  },
});

function changeIndent(editor: Editor, delta: 1 | -1) {
  if (editor.isActive("listItem")) {
    if (delta > 0) editor.chain().focus().sinkListItem("listItem").run();
    else editor.chain().focus().liftListItem("listItem").run();
    return;
  }
  const type = editor.isActive("heading") ? "heading" : "paragraph";
  const cur = (editor.getAttributes(type).indent as number) || 0;
  editor.chain().focus().updateAttributes(type, { indent: Math.max(0, Math.min(MAX_INDENT, cur + delta)) }).run();
}

export type RichEmailEditorHandle = {
  /** Insert text (e.g. a {{tag}}) at the caret, in whichever mode is active. */
  insertText: (text: string) => void;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  isDark: boolean;
  inputClass: string;
  btnClass: string;
  id?: string;
  /** Merge columns offered as per-person image sources. */
  imageColumns?: string[];
};

export const RichEmailEditor = forwardRef<RichEmailEditorHandle, Props>(function RichEmailEditor(
  { value, onChange, onFocus, isDark, inputClass, btnClass, id, imageColumns = [] }, ref,
) {
  const [imagesOpen, setImagesOpen] = useState(false);
  const [mode, setMode] = useState<"rich" | "html">(() => (RICH_UNSAFE.test(value) ? "html" : "rich"));
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: ["mailto"], HTMLAttributes: { rel: "noopener", target: "_blank" } },
      }),
      TextStyle, Color, BackgroundColor, FontFamily, FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript, Superscript, EmailImage, Indent,
    ],
    content: mode === "rich" ? value : "",
    onUpdate: ({ editor: e }) => { const html = e.getHTML(); lastEmitted.current = html; onChange(html); },
    onFocus: () => onFocus?.(),
    editorProps: { attributes: { class: "mc-rich min-h-[260px] px-3 py-2.5 text-sm focus:outline-none", "aria-label": "Message", role: "textbox", "aria-multiline": "true" } },
  });

  // External value changes (template load) reach the editor; our own echoes don't.
  useEffect(() => {
    if (!editor || mode !== "rich" || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value, mode]);

  useImperativeHandle(ref, () => ({
    insertText: (text) => {
      if (mode === "rich" && editor) { editor.chain().focus().insertContent(text).run(); return; }
      const el = textRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      onChange(value.slice(0, start) + text + value.slice(end));
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length); });
    },
    focus: () => (mode === "rich" ? editor?.commands.focus() : textRef.current?.focus()),
  }), [editor, mode, value, onChange]);

  const toRich = () => {
    if (RICH_UNSAFE.test(value) && !window.confirm(
      "This message uses layout (tables, boxes or embedded styles) that the rich editor can't keep. Switching will simplify it. Continue?",
    )) return;
    lastEmitted.current = value;
    editor?.commands.setContent(value, { emitUpdate: true });
    setMode("rich");
  };

  const setLink = () => {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string) ?? "";
    const url = window.prompt("Link address (https://… or mailto:…, or a tag like {{cta_url}})", prev);
    if (url === null) return;
    const u = url.trim();
    if (!u) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    if (!/^(https?:\/\/|mailto:|\{\{\s*\w+\s*\}\}$)/i.test(u)) { window.alert("Use an https://, mailto: or {{tag}} address."); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: u }).run();
  };

  const tb = `inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-xs ${btnClass}`;
  const on = (active: boolean) => (active ? (isDark ? " ring-2 ring-sky-400/60" : " ring-2 ring-sky-600/50") : "");
  const sel = `h-8 rounded-md border px-1.5 text-xs ${inputClass}`;
  const e = editor;

  return (
    <div>
      <div role="tablist" aria-label="Editor mode" className="mb-2 inline-flex rounded-lg border p-0.5">
        {(["rich", "html"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m}
            onClick={() => (m === "rich" ? (mode === "html" && toRich()) : setMode("html"))}
            className={`rounded-md px-3 py-1 text-xs font-bold ${mode === m ? (isDark ? "bg-white/15" : "bg-black/10") : "opacity-70"}`}>
            {m === "rich" ? "Text editor" : "HTML"}
          </button>
        ))}
      </div>

      {mode === "rich" ? (
        <div className={`overflow-hidden rounded-xl border ${inputClass}`}>
          {e && (
            <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b p-1.5">
              <button type="button" className={tb} aria-label="Undo" title="Undo (Ctrl+Z)" onClick={() => e.chain().focus().undo().run()} disabled={!e.can().undo()}><Undo2 className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Redo" title="Redo (Ctrl+Y)" onClick={() => e.chain().focus().redo().run()} disabled={!e.can().redo()}><Redo2 className="h-3.5 w-3.5" /></button>
              <select aria-label="Paragraph style" className={sel}
                value={e.isActive("heading", { level: 1 }) ? "1" : e.isActive("heading", { level: 2 }) ? "2" : e.isActive("heading", { level: 3 }) ? "3" : e.isActive("heading", { level: 4 }) ? "4" : "p"}
                onChange={(ev) => { const v = ev.target.value; if (v === "p") e.chain().focus().setParagraph().run(); else e.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 }).run(); }}>
                <option value="p">Normal</option><option value="1">Heading 1</option><option value="2">Heading 2</option>
                <option value="3">Heading 3</option><option value="4">Small heading</option>
              </select>
              <select aria-label="Font" className={sel} value={(e.getAttributes("textStyle").fontFamily as string) ?? ""}
                onChange={(ev) => (ev.target.value ? e.chain().focus().setFontFamily(ev.target.value).run() : e.chain().focus().unsetFontFamily().run())}>
                <option value="">Font</option>
                {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select aria-label="Font size" className={sel} value={(e.getAttributes("textStyle").fontSize as string) ?? ""}
                onChange={(ev) => (ev.target.value ? e.chain().focus().setFontSize(ev.target.value).run() : e.chain().focus().unsetFontSize().run())}>
                <option value="">Size</option>
                {FONT_SIZES.map((s) => <option key={s} value={`${s}px`}>{s}</option>)}
              </select>
              <button type="button" className={tb + on(e.isActive("bold"))} aria-label="Bold" aria-pressed={e.isActive("bold")} title="Bold (Ctrl+B)" onClick={() => e.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("italic"))} aria-label="Italic" aria-pressed={e.isActive("italic")} title="Italic (Ctrl+I)" onClick={() => e.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("underline"))} aria-label="Underline" aria-pressed={e.isActive("underline")} title="Underline (Ctrl+U)" onClick={() => e.chain().focus().toggleUnderline().run()}><UIcon className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("strike"))} aria-label="Strikethrough" aria-pressed={e.isActive("strike")} onClick={() => e.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("subscript"))} aria-label="Subscript" aria-pressed={e.isActive("subscript")} onClick={() => e.chain().focus().toggleSubscript().run()}><SubIcon className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("superscript"))} aria-label="Superscript" aria-pressed={e.isActive("superscript")} onClick={() => e.chain().focus().toggleSuperscript().run()}><SupIcon className="h-3.5 w-3.5" /></button>
              <label className={tb} title="Text colour">
                <span className="sr-only">Text colour</span><span aria-hidden className="font-black">A</span>
                <input type="color" className="ml-1 h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                  value={(e.getAttributes("textStyle").color as string) || "#111111"}
                  onChange={(ev) => e.chain().focus().setColor(ev.target.value).run()} />
              </label>
              <label className={tb} title="Highlight colour">
                <span className="sr-only">Highlight colour</span><span aria-hidden className="rounded bg-yellow-300 px-0.5 font-black text-black">H</span>
                <input type="color" className="ml-1 h-4 w-4 cursor-pointer border-0 bg-transparent p-0" defaultValue="#fff59d"
                  onChange={(ev) => e.chain().focus().setHighlight({ color: ev.target.value }).run()} />
              </label>
              {([["left", TextAlignStart], ["center", TextAlignCenter], ["right", TextAlignEnd], ["justify", TextAlignJustify]] as const).map(([a, Icon]) => (
                <button key={a} type="button" className={tb + on(e.isActive({ textAlign: a }))} aria-label={`Align ${a}`} aria-pressed={e.isActive({ textAlign: a })}
                  onClick={() => e.chain().focus().setTextAlign(a).run()}><Icon className="h-3.5 w-3.5" /></button>
              ))}
              <button type="button" className={tb + on(e.isActive("bulletList"))} aria-label="Bulleted list" aria-pressed={e.isActive("bulletList")} onClick={() => e.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("orderedList"))} aria-label="Numbered list" aria-pressed={e.isActive("orderedList")} onClick={() => e.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Increase indent" onClick={() => changeIndent(e, 1)}><ListIndentIncrease className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Decrease indent" onClick={() => changeIndent(e, -1)}><ListIndentDecrease className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("blockquote"))} aria-label="Quote" aria-pressed={e.isActive("blockquote")} onClick={() => e.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb + on(e.isActive("link"))} aria-label="Insert link" onClick={setLink}><Link2 className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Remove link" disabled={!e.isActive("link")} onClick={() => e.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Insert image" title="Insert image" onClick={() => setImagesOpen(true)}><ImagePlus className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Divider line" onClick={() => e.chain().focus().setHorizontalRule().run()}><Minus className="h-3.5 w-3.5" /></button>
              <button type="button" className={tb} aria-label="Clear formatting" onClick={() => e.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <EditorContent editor={editor} id={id} className={isDark ? "text-white" : "text-slate-900"} />
        </div>
      ) : (
        <>
        <button type="button" className={`${tb} mb-1.5 gap-1`} onClick={() => setImagesOpen(true)}><ImagePlus className="h-3.5 w-3.5" aria-hidden /> Insert image</button>
        <textarea id={id} ref={textRef} rows={14} className={`w-full rounded-xl border px-3 py-2.5 font-mono text-xs ${inputClass}`}
          value={value} onFocus={onFocus} onChange={(ev) => { lastEmitted.current = ""; onChange(ev.target.value); }} aria-label="Message HTML" />
        </>
      )}
      <ImageLibraryDialog open={imagesOpen} onOpenChange={setImagesOpen} columns={imageColumns} isDark={isDark}
        onInsert={(img) => {
          const html = imageHtml(img);
          if (mode === "rich" && editor) editor.chain().focus().insertContent(html).run();
          else {
            const el = textRef.current;
            const start = el?.selectionStart ?? value.length;
            const end = el?.selectionEnd ?? value.length;
            onChange(value.slice(0, start) + html + value.slice(end));
          }
        }} />
    </div>
  );
});
