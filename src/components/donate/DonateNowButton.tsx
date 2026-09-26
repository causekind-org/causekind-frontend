import Link from "@/components/AppLink";
import { DONATE_HREF } from "@/lib/donateScroll";

/**
 * The animated "Donate Now" call to action.
 *
 * <p>Deliberately a SERVER component — no "use client", no hooks, no auth read.
 * Everything that varies is CSS:
 *
 * <ul>
 *   <li><b>Colour</b> comes from the `--ck-role-*` tokens, which
 *       `ROLE_THEME_BOOT_SCRIPT` resolves before first paint. Guests and donors
 *       both land on terracotta (PUBLIC_PALETTE *is* the donor palette), and a
 *       logged-out visitor in dark mode is lifted in styles.css.</li>
 *   <li><b>Donees never see it.</b> A rule on `[data-ck-role-theme="donee"]`
 *       hides `.ck-donate-cta` outright. Doing it in CSS rather than with a
 *       `useAuth()` branch means a recipient never watches it render and then
 *       disappear, and no placement can forget the check.</li>
 * </ul>
 *
 * <p>That is why this ships no client JavaScript at all: five placements, one
 * of them in the navbar on every page, and none of them costs a hydration
 * boundary.
 *
 * <p>The motion lives in styles.css under "Donate Now". Idle motion is the
 * point — a phone has no hover, so breathe / sheen / heartbeat run unprompted
 * and hover adds to them. `prefers-reduced-motion` removes all of it.
 */
export function DonateNowButton({
  size = "md",
  variant = "solid",
  label = "Donate Now",
  showArrow = true,
  fullWidth = false,
  className = "",
  href = DONATE_HREF,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
  label?: string;
  showArrow?: boolean;
  fullWidth?: boolean;
  className?: string;
  /** Override only for a placement that must land somewhere else. */
  href?: string;
}) {
  const iconPx = size === "sm" ? 14 : size === "lg" ? 19 : 17;

  return (
    <Link
      href={href}
      data-donate-cta={size}
      className={[
        "ck-donate-cta",
        `ck-donate-${size}`,
        variant === "outline" ? "ck-donate-outline" : "",
        fullWidth ? "ck-donate-block" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Decorative layers. The sheen and ring are siblings of the label rather
          than pseudo-elements on it, so the label keeps its own stacking
          context and stays selectable and legible over both. */}
      <span className="ck-donate-sheen" aria-hidden="true" />
      <span className="ck-donate-ring" aria-hidden="true" />

      <span className="ck-donate-heart" aria-hidden="true">
        <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21s-7.5-4.6-9.6-9A5.3 5.3 0 0 1 12 6.5 5.3 5.3 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z" />
        </svg>
      </span>

      <span className="ck-donate-label">{label}</span>

      {showArrow && (
        <span className="ck-donate-arrow" aria-hidden="true">
          <svg
            width={iconPx - 2}
            height={iconPx - 2}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </Link>
  );
}
