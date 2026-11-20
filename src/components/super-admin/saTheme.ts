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
 * Light branch = the staff console forest-glass palette (styles/staff-console.css).
 */
export type SaTheme = ReturnType<typeof saTheme>;

export function saTheme(isDark: boolean) {
  return isDark
    ? {
        accent: "#9fe0c8",
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
          "focus:border-[#9fe0c8]/50 focus:outline-none",
        btn:
          "border-white/10 bg-white/[0.04] text-stone-300 " +
          "hover:bg-white/[0.08] hover:text-white " +
          "disabled:opacity-35 disabled:pointer-events-none",
        btnAccent: "bg-[#9fe0c8] text-stone-950 hover:bg-[#e0a96a] border-[#9fe0c8]",
        chipActive: "bg-[#9fe0c8] text-stone-950 border-[#9fe0c8]",
        chipInactive:
          "border-white/10 text-stone-400 hover:border-white/25 hover:text-white",
        badge: "border-white/10 bg-white/[0.06] text-stone-300",
        badgeAccent: "border-[#9fe0c8]/30 bg-[#9fe0c8]/10 text-[#9fe0c8]",
        badgeDanger: "border-red-500/30 bg-red-500/10 text-red-400",
        badgeOk: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        tabActive: "border-[#9fe0c8] text-white",
        tabInactive: "border-transparent text-stone-400 hover:text-white",
        tabLocked: "border-transparent text-stone-600",
        dangerPanel: "border-red-500/25 bg-red-500/[0.07] text-stone-300",
        accentPanel: "border-[#9fe0c8]/25 bg-[#9fe0c8]/[0.04]",
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
        // Staff console "forest glass" palette (2026-11-19). The console has a
        // single theme now, so this branch is the one every panel renders.
        accent: "#1f6b55",
        heading: "text-[#12211c]",
        text: "text-[#24352d]",
        muted: "text-[#53665c]",
        dim: "text-[#6b7d73]",
        card: "border-white/80 bg-white/90 shadow-[0_16px_34px_-28px_rgba(16,30,24,0.45)]",
        cardFlat: "border-[#dfe8e3]",
        divide: "divide-[#e3ebe6]",
        tableHead: "bg-[#eef3f0] border-[#dfe8e3]",
        rowHover: "hover:bg-[#f2f7f4]",
        input:
          "border-[#cfdcd5] bg-white text-[#12211c] placeholder:text-[#8a9a91] " +
          "focus:border-[#2e8b70] focus:outline-none focus:ring-2 focus:ring-[#2e8b70]/20",
        btn:
          "border-[#cfdcd5] bg-white/90 text-[#24352d] " +
          "hover:bg-white hover:text-[#12211c] " +
          "disabled:opacity-40 disabled:pointer-events-none",
        btnAccent: "bg-[#12211c] text-white hover:bg-[#1f6b55] border-[#12211c]",
        chipActive: "bg-[#12211c] text-white border-[#12211c]",
        chipInactive:
          "border-white/80 bg-white/60 text-[#3a4a42] hover:bg-white hover:text-[#12211c]",
        badge: "border-[#dfe8e3] bg-[#e7ece9] text-[#44554c]",
        badgeAccent: "border-[#b9d9e0] bg-[#dcedf1] text-[#1f5f6d]",
        badgeDanger: "border-red-200 bg-[#fbe1dc] text-[#9a2a1b]",
        badgeOk: "border-emerald-200 bg-[#dcf1e7] text-[#1c6b4c]",
        tabActive: "border-[#2e8b70] text-[#12211c]",
        tabInactive: "border-transparent text-[#53665c] hover:text-[#12211c]",
        tabLocked: "border-transparent text-[#9aaaa1]",
        dangerPanel: "border-red-200 bg-red-50/90 text-[#24352d]",
        accentPanel: "border-[#b9d9e0] bg-[#eef6f8]/80",
        overlay: "bg-[#0b211b]/55 backdrop-blur-sm",
        surface: "border-white/80 bg-white",
        surfaceAlt: "bg-[#eef3f0]",
        kbd: "border-[#cfdcd5] bg-[#eef3f0] text-[#53665c]",
        placeholder: "placeholder:text-[#8a9a91]",
      };
}
