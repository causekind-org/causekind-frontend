/**
 * Role-aware theming: terracotta for donors, blue for recipients.
 *
 * <p>One module, two consumers. CSS reads the `--ck-role-*` custom properties
 * defined in `styles.css`; JavaScript that paints (ClickSpark, particle fields,
 * canvas effects, gradient props) reads the literals here. They are kept in the
 * same file so a palette change cannot land in one and miss the other.
 *
 * <p><b>Scope.</b> Only DONOR and DONEE are themed. ADMIN, SUPER_ADMIN, logged-out
 * visitors and the public marketing pages keep the existing terracotta identity —
 * the blue says "this is your recipient workspace", and painting an admin console
 * or a marketing page with it would say something untrue.
 *
 * <p><b>Not the same thing as `--handover-*`.</b> Those are chosen from
 * *transaction participation* (`viewerRole` on a specific offer/match), so a donor
 * looking at a handover where they happen to be the recipient still sees the
 * recipient colour. These `--ck-role-*` tokens come from the account role. Do not
 * merge them; see Decisions and Gotchas.
 */

export const ROLE_THEMES = ["donor", "donee"] as const;
export type RoleTheme = (typeof ROLE_THEMES)[number];

/** The DOM attribute. Lives on <html> so portalled overlays inherit it. */
export const ROLE_THEME_ATTR = "data-ck-role-theme";

/**
 * Account role → theme, or null for "don't theme this".
 *
 * <p>Deliberately a whitelist. An unknown or absent role must fall through to
 * null and leave the public palette in place, never guess a theme.
 */
export function themeForRole(role: string | null | undefined): RoleTheme | null {
  if (role === "DONOR") return "donor";
  if (role === "DONEE") return "donee";
  return null;   // ADMIN, SUPER_ADMIN, unknown, logged out
}

/**
 * Literals for JavaScript that paints.
 *
 * <p>Anything drawing to a canvas, generating particles or passing a colour as a
 * prop cannot read a CSS custom property without a `getComputedStyle` round trip
 * per frame. Those callers use `roleColors(theme)`; everything expressible in CSS
 * should use the `--ck-role-*` tokens instead.
 */
export type RolePalette = {
  accent: string;
  hover: string;
  secondary: string;
  highlight: string;
  onAccent: string;
};

const LIGHT: Record<RoleTheme, RolePalette> = {
  donor: { accent: "#b04a15", hover: "#c45520", secondary: "#e07b3a", highlight: "#f0b97a", onAccent: "#ffffff" },
  donee: { accent: "#1e3a60", hover: "#2d5a96", secondary: "#4a7fc1", highlight: "#7fb0e8", onAccent: "#ffffff" },
};

const DARK: Record<RoleTheme, RolePalette> = {
  donor: { accent: "#e07b3a", hover: "#f0955a", secondary: "#e07b3a", highlight: "#f0b97a", onAccent: "#1a1207" },
  // Navy on a dark surface is unreadable, so dark mode lifts to a clear sky blue.
  // Same role signal, inverted for the surface it sits on.
  donee: { accent: "#7fb0e8", hover: "#a3c8f2", secondary: "#4a7fc1", highlight: "#a3c8f2", onAccent: "#0b1929" },
};

/** Public/neutral palette — what an admin, or a logged-out visitor, sees. */
export const PUBLIC_PALETTE: RolePalette = LIGHT.donor;

export function roleColors(theme: RoleTheme | null, dark = false): RolePalette {
  if (!theme) return dark ? DARK.donor : PUBLIC_PALETTE;
  return (dark ? DARK : LIGHT)[theme];
}

/**
 * Reads the theme currently on <html>. For JS painters that need the active
 * palette without threading auth state through props.
 */
export function currentRoleTheme(): RoleTheme | null {
  if (typeof document === "undefined") return null;
  const v = document.documentElement.getAttribute(ROLE_THEME_ATTR);
  return (ROLE_THEMES as readonly string[]).includes(v ?? "") ? (v as RoleTheme) : null;
}

export function isDarkMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Convenience for painters: the palette matching both current role and mode. */
export function currentRoleColors(): RolePalette {
  return roleColors(currentRoleTheme(), isDarkMode());
}

/**
 * The pre-paint script, inlined into <head>.
 *
 * <p>Without it, DONEE users see a terracotta flash: `useAuth` hydrates from
 * `localStorage` inside a `useEffect`, which runs *after* first paint, so the
 * public palette renders first and then swaps. This runs before the browser
 * paints anything.
 *
 * <p>It reads only the non-secret `{email, role}` metadata the app already
 * caches, parses it inside try/catch, and passes the role through the same
 * whitelist as `themeForRole` — an attacker-controlled localStorage value can
 * therefore only ever produce "donor", "donee", or no attribute at all. It grants
 * nothing: the attribute is decorative, and every permission check remains
 * server-side.
 */
export const ROLE_THEME_BOOT_SCRIPT = `(function(){try{
var r=JSON.parse(localStorage.getItem("ck_user")||"null");
var t=r&&r.role==="DONOR"?"donor":r&&r.role==="DONEE"?"donee":null;
if(t)document.documentElement.setAttribute("${ROLE_THEME_ATTR}",t);
}catch(e){}})();`;
