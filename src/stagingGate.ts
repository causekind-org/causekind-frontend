import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Password gate for staging.causekind.com. Every page on the staging host
 * requires a shared password (STAGING_PASSWORD, set in Vercel for the staging
 * branch only); production hosts never reach this code.
 *
 * The auth cookie holds a hash of the password, so changing STAGING_PASSWORD
 * logs everyone out. Failed attempts are counted per IP in memory — best
 * effort only, since Vercel may run several instances.
 */
const STAGING_HOST = "staging.causekind.com";
const AUTH_PATH = "/__staging-auth";
const AUTH_COOKIE = "ck_staging_auth";
const MAX_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

const failedAttempts = new Map<string, { count: number; firstAt: number }>();

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`ck-staging:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isLockedOut(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOCKOUT_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const entry = failedAttempts.get(ip);
  if (!entry || Date.now() - entry.firstAt > LOCKOUT_MS) {
    failedAttempts.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    entry.count++;
  }
}

/** Only allow same-site relative redirects after login. */
function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function loginPage(next: string, message: string | null, status: number): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>CauseKind Staging</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f5f2;color:#1f2937;padding:16px;box-sizing:border-box}
  form{background:#fff;padding:32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);width:100%;max-width:360px;box-sizing:border-box}
  h1{font-size:20px;margin:0 0 4px}
  p{font-size:14px;color:#6b7280;margin:0 0 20px}
  input{width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;box-sizing:border-box}
  button{width:100%;margin-top:12px;padding:12px;border:0;border-radius:8px;background:#e8590c;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  .err{color:#b91c1c;font-size:14px;margin:12px 0 0}
</style></head>
<body><form method="post" action="${AUTH_PATH}">
  <h1>CauseKind Staging</h1>
  <p>Enter the password to continue.</p>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <input type="password" name="password" placeholder="Password" autofocus required autocomplete="current-password">
  <button type="submit">Enter</button>
  ${message ? `<p class="err">${escapeHtml(message)}</p>` : ""}
</form></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Returns a response when the request must be stopped at the gate, or null
 * when it may continue to the app.
 */
export async function stagingGate(request: NextRequest, ip: string | null): Promise<NextResponse | null> {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  if (host !== STAGING_HOST) return null;

  const password = process.env.STAGING_PASSWORD;
  if (!password) return new NextResponse("Staging is not configured.", { status: 503 });

  const expected = await hashPassword(password);
  const { pathname, search } = request.nextUrl;

  if (pathname === AUTH_PATH && request.method === "POST") {
    const form = await request.formData();
    const next = safeNext(form.get("next"));
    const key = ip ?? "unknown";

    if (isLockedOut(key)) {
      return loginPage(next, "Too many attempts. Try again in 15 minutes.", 429);
    }

    const given = form.get("password");
    if (typeof given !== "string" || !safeEqual(await hashPassword(given), expected)) {
      recordFailure(key);
      return loginPage(next, "Wrong password.", 401);
    }

    failedAttempts.delete(key);
    const response = NextResponse.redirect(new URL(next, request.url), 303);
    response.cookies.set(AUTH_COOKIE, expected, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && safeEqual(cookie, expected)) return null;

  return loginPage(pathname === AUTH_PATH ? "/" : pathname + search, null, 401);
}
