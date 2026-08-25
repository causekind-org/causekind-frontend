import { safeInternalPath } from "./safeRedirect";

/**
 * Where a user goes once they are authenticated.
 *
 * <p>This exists because login and register had drifted apart. Login read
 * `?next=` and honoured it; register ignored the parameter entirely and sent
 * everyone to `/`. A guest who clicked "offer help", chose "create account" and
 * completed registration therefore landed on the homepage, with nothing on
 * screen connecting them back to the request they had picked. The two pages now
 * resolve their destination through the same function, so a fix to one cannot
 * silently miss the other.
 *
 * <p>Every path out of here is either {@link safeInternalPath}-validated or a
 * literal defined in this file. A raw `next` value never reaches a router.
 */

/** Role-based landing page when there is no specific destination to return to. */
export function homeForRole(role: string | null | undefined): string {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/";
}

/**
 * The donor offer wizard: `/requests/{id}/offer`.
 *
 * <p>Anchored at both ends so it matches that route and nothing that merely
 * begins with it — a bare `startsWith` would treat an unrelated future
 * `/requests/123/offer-history` as the wizard.
 */
const OFFER_ROUTE = /^\/requests\/[^/]+\/offer\/?$/;

export type PostAuthDestination = {
  /** Always an internal path. Safe to hand straight to the router. */
  path: string;
  /**
   * Set only when the user is being sent somewhere other than what they asked
   * for, so the caller can say why instead of appearing to ignore the click.
   */
  notice?: string;
};

/**
 * Resolves where to send a freshly authenticated user.
 *
 * @param rawNext the untrusted `?next=` query value, or null
 * @param role    the role the account actually has, from the auth response
 *
 * <p>Role is checked here rather than left to the destination page because the
 * destination is the donor wizard: letting a donee route into it and bounce
 * back out means a redirect the user watches happen, and a moment where a
 * protected page has begun mounting for someone who may not use it.
 */
export function resolvePostAuthDestination(
  rawNext: string | null | undefined,
  role: string | null | undefined,
): PostAuthDestination {
  const next = safeInternalPath(rawNext);

  // No destination, or a hostile one that `safeInternalPath` rejected. Both
  // land on the role's normal home — a rejected value is never "fixed up" and
  // followed in some cleaned form.
  if (!next) return { path: homeForRole(role) };

  if (role === "DONEE" && OFFER_ROUTE.test(next)) {
    return {
      path: "/requests",
      notice:
        "Offering an item needs a donor account. You're signed in as a donee — " +
        "here are your requests instead.",
    };
  }

  return { path: next };
}

/**
 * The "create account" link from login, carrying the destination across.
 *
 * <p>`role=DONOR` because the only reason a guest is bounced to login with a
 * `next` is that they tried to give something. Encoded once, from the validated
 * value — never string-concatenated from the raw parameter.
 */
export function registerUrlPreserving(rawNext: string | null | undefined): string {
  return buildRegisterUrl(rawNext, false);
}

/**
 * Google sign-in that turned out to need profile completion, with the
 * destination carried across.
 *
 * <p>Built here rather than at the call site so `social=google` and `next` are
 * assembled by the same code that validates the path. The register page keys
 * its social flow off `social=google`, so the parameter has to survive.
 */
export function socialCompletionUrl(rawNext: string | null | undefined): string {
  return buildRegisterUrl(rawNext, true);
}

function buildRegisterUrl(rawNext: string | null | undefined, social: boolean): string {
  const next = safeInternalPath(rawNext);
  // URLSearchParams handles the encoding, so there is one escaping
  // implementation rather than a hand-rolled one per call site.
  const params = new URLSearchParams();
  if (social) params.set("social", "google");
  // Only meaningful when there is somewhere to go back to — a bare
  // `role=DONOR` on the generic register link would preselect a role for
  // someone who never expressed one.
  if (next) {
    params.set("role", "DONOR");
    params.set("next", next);
  }
  const qs = params.toString();
  return qs ? `/register?${qs}` : "/register";
}
