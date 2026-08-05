/**
 * Explicit theme tokens for the Super Admin console.
 *
 * The console does NOT participate in the app's shadcn theme. It manages dark
 * mode itself with an `isDark` flag and inline classes on its own wrapper —
 * nothing ever toggles a `.dark` class on `<html>`. So semantic utilities like
 * `bg-background`, `bg-muted` and `text-muted-foreground`, and any shadcn
 * `<Button variant="outline">`, resolve against the *light* palette no matter
 * which console theme is active. On the dark ground that renders as a pale
 * block with invisible text, which is exactly how the Phase 2 controls shipped
 * before this existed.
 *
 * Every Phase 2 component therefore takes `isDark` and styles through these
 * tokens. Same approach DisputesPanel and EntityTable already use; this just
 * puts one copy in a shared place instead of a fourth private one.
 *
 * Palette matches the console shell in app/super-admin/page.tsx: amber
 * `#f0b97a` on `#05070d` dark, rust `#b04a15` on `#faf7f2` light.
 */
export type SaTheme = ReturnType<typeof saTheme>;

export function saTheme(isDark: boolean) {
  return isDark
    ? {
        accent: "#f0b97a",
        heading: "text-white",
        text: "text-stone-200",
        muted: "text-stone-400",
        dim: "text-stone-500",
        card: "border-white/10 bg-white/[0.03]",
        cardFlat: "border-white/10",
        divide: "divide-white/10",
        tableHead: "bg-white/[0.04] border-white/10",
        rowHover: "hover:bg-white/[0.05]",
        input:
          "border-white/10 bg-[#0b0f1a] text-stone-200 placeholder:text-stone-600 " +
          "focus:border-[#f0b97a]/50 focus:outline-none",
        btn:
          "border-white/10 bg-white/[0.04] text-stone-300 " +
          "hover:bg-white/[0.08] hover:text-white " +
          "disabled:opacity-35 disabled:pointer-events-none",
        btnAccent: "bg-[#f0b97a] text-stone-950 hover:bg-[#e0a96a] border-[#f0b97a]",
        chipActive: "bg-[#f0b97a] text-stone-950 border-[#f0b97a]",
        chipInactive:
          "border-white/10 text-stone-400 hover:border-white/25 hover:text-white",
        badge: "border-white/10 bg-white/[0.06] text-stone-300",
        badgeAccent: "border-[#f0b97a]/30 bg-[#f0b97a]/10 text-[#f0b97a]",
        badgeDanger: "border-red-500/30 bg-red-500/10 text-red-400",
        badgeOk: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        tabActive: "border-[#f0b97a] text-white",
        tabInactive: "border-transparent text-stone-400 hover:text-white",
        tabLocked: "border-transparent text-stone-600",
        dangerPanel: "border-red-500/25 bg-red-500/[0.07] text-stone-300",
        accentPanel: "border-[#f0b97a]/25 bg-[#f0b97a]/[0.04]",
        overlay: "bg-black/70",
        surface: "border-white/10 bg-[#0b0f1a]",
        surfaceAlt: "bg-white/[0.05]",
        kbd: "border-white/15 bg-white/[0.06] text-stone-400",
        // A literal string, not composed from another token. Tailwind's scanner
        // only sees class names that appear verbatim in source, so building one
        // like `placeholder:${t.dim}` at runtime silently produces no CSS.
        placeholder: "placeholder:text-stone-600",
      }
    : {
        accent: "#b04a15",
        heading: "text-stone-900",
        text: "text-stone-700",
        muted: "text-stone-500",
        dim: "text-stone-400",
        card: "border-stone-200 bg-white",
        cardFlat: "border-stone-200",
        divide: "divide-stone-200",
        tableHead: "bg-stone-100 border-stone-200",
        rowHover: "hover:bg-stone-50",
        input:
          "border-stone-300 bg-white text-stone-800 placeholder:text-stone-400 " +
          "focus:border-[#b04a15]/50 focus:outline-none",
        btn:
          "border-stone-300 bg-white text-stone-700 " +
          "hover:bg-stone-100 hover:text-stone-900 " +
          "disabled:opacity-40 disabled:pointer-events-none",
        btnAccent: "bg-[#b04a15] text-white hover:bg-[#963e11] border-[#b04a15]",
        chipActive: "bg-[#b04a15] text-white border-[#b04a15]",
        chipInactive:
          "border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-900",
        badge: "border-stone-200 bg-stone-100 text-stone-600",
        badgeAccent: "border-[#b04a15]/30 bg-[#b04a15]/10 text-[#b04a15]",
        badgeDanger: "border-red-300 bg-red-50 text-red-700",
        badgeOk: "border-emerald-300 bg-emerald-50 text-emerald-700",
        tabActive: "border-[#b04a15] text-stone-900",
        tabInactive: "border-transparent text-stone-500 hover:text-stone-900",
        tabLocked: "border-transparent text-stone-400",
        dangerPanel: "border-red-200 bg-red-50 text-stone-700",
        accentPanel: "border-[#b04a15]/20 bg-[#b04a15]/[0.04]",
        overlay: "bg-stone-900/40",
        surface: "border-stone-200 bg-white",
        surfaceAlt: "bg-stone-100",
        kbd: "border-stone-300 bg-stone-100 text-stone-500",
        placeholder: "placeholder:text-stone-400",
      };
}
