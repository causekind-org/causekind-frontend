const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    // Only someone who actually HAD a session can have it "expire" — an anonymous
    // visitor hitting an auth-gated endpoint (e.g. opening global search while
    // logged out) must not be yanked to /login with a misleading expiry banner.
    const hadSession = !!localStorage.getItem("ck_user");
    // Fix #4: clear legacy token keys from old sessions that pre-date cookie auth
    localStorage.removeItem("ck_token");
    sessionStorage.removeItem("ck_token");
    localStorage.removeItem("ck_user");
    if (hadSession) window.location.href = "/login?expired=1";
  }
}

/**
 * A 403 the user cannot resolve by having different permissions: the account
 * behind an otherwise-valid session can no longer use it. Mirrors the codes in
 * the backend's JwtAuthFilter.
 */
function isSessionEndedCode(code: string | undefined): boolean {
  return (
    code === "ACCOUNT_SUSPENDED" ||
    code === "ACCOUNT_INACTIVE" ||
    code === "ACCOUNT_MISSING" ||
    code === "SESSION_REVOKED"
  );
}

type RequestOptions = RequestInit & {
  /** If true, a 401 response throws but does NOT redirect to login.
   *  Use for background/optional fetches where one 401 shouldn't kill the whole session. */
  silent401?: boolean;
};

/** A 409 conflict from a super-admin hard-delete carries the exact rows blocking it. */
export type SuperAdminDependent = { table: string; column: string; count: number };
export type ApiConflictError = Error & { dependents?: SuperAdminDependent[]; code?: string };

// Request deduplication & GET cache (3s TTL for GET requests to prevent redundant fetch cascades)
const inFlightGetRequests = new Map<string, Promise<any>>();
const getCacheMap = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 3000;

/**
 * Reads a successful response's body, tolerating the several legitimate ways a
 * backend says "nothing to return".
 *
 * Returns `undefined` for 204, an explicit zero Content-Length, a non-JSON
 * Content-Type, or a body that is empty/whitespace once read. Only actual JSON
 * text is handed to JSON.parse, so a malformed body surfaces as a real error
 * rather than the browser's "Unexpected end of JSON input", which tells an admin
 * nothing about what went wrong.
 */
async function readJsonBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined;
  if (res.headers.get("content-length") === "0") return undefined;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("json")) return undefined;

  // Read as text first: res.json() on an empty body throws, and we cannot know
  // the body is empty until it has been read (Content-Length is often absent
  // under chunked encoding).
  const text = await res.text();
  if (!text.trim()) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("The server sent a response we couldn't read. Please try again.");
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isGet = method === "GET" && !options.body;

  // Invalidate cache on mutations
  if (!isGet) {
    getCacheMap.clear();
  } else {
    const cached = getCacheMap.get(path);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Promise.resolve(cached.data as T);
    }
    if (inFlightGetRequests.has(path)) {
      return inFlightGetRequests.get(path) as Promise<T>;
    }
  }

  const { silent401, ...fetchOptions } = options;

  const execute = async (): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(process.env.NODE_ENV === "development"
        ? { "ngrok-skip-browser-warning": "true" }
        : {}),
      ...(fetchOptions.headers as Record<string, string>),
    };

    const res = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        const body401 = await res.json().catch(() => ({}));
        const msg401 = body401?.message ?? body401?.title;
        if (!silent401) handleUnauthorized();
        throw new Error(msg401 ?? "Invalid email or password. Please try again.");
      }
      if (res.status === 403) {
        // Most 403s are ordinary permission errors, but the backend also uses 403
        // to say the account behind an otherwise-valid session can no longer use
        // it (suspended, deactivated, sessions revoked). Those carry a code and
        // have to end the local session — otherwise the user sits in a signed-in
        // UI where every single request fails.
        const body403 = (await res.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        if (isSessionEndedCode(body403.code)) handleUnauthorized();
        throw new Error(body403.message ?? "You don't have permission to do that.");
      }
      if (res.status === 404) throw new Error("The requested item was not found.");
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body?.message ?? "This action has already been done.");
        if (Array.isArray(body?.dependents)) (err as ApiConflictError).dependents = body.dependents;
        if (typeof body?.code === "string") (err as ApiConflictError).code = body.code;
        throw err;
      }
      if (res.status === 500) throw new Error("Something went wrong on our end. Please try again.");
      // Errors don't always arrive as JSON — a proxy or gateway can return plain
      // text or HTML. Read once as text, then parse only if it actually is JSON,
      // so a non-JSON error still yields something readable instead of a blank
      // "Something went wrong".
      const raw = await res.text().catch(() => "");
      let body: Record<string, unknown> = {};
      if (raw.trim().startsWith("{")) {
        try { body = JSON.parse(raw) as Record<string, unknown>; } catch { /* fall through to raw text */ }
      }
      const plainText = Object.keys(body).length === 0 && raw.trim() && !raw.trim().startsWith("<")
        ? raw.trim().slice(0, 200)
        : null;
      const msg =
        body?.message ??
        body?.detail ??
        (Array.isArray(body?.errors) && body.errors.length > 0
          ? body.errors.map((e: { defaultMessage?: string; field?: string }) =>
              e.field ? `${e.field}: ${e.defaultMessage}` : e.defaultMessage
            ).join(", ")
          : null) ??
        (body?.title !== "Bad Request" ? body?.title : null) ??
        plainText ??
        `Something went wrong (${res.status})`;
      throw new Error(String(msg));
    }

    // A successful response does not guarantee a JSON body. 204 is the obvious
    // case, but a `void` Spring handler returns 200 with Content-Length: 0, and
    // calling res.json() on that throws "Unexpected end of JSON input" — a raw
    // browser error with no useful meaning, which is exactly what an admin saw on
    // the Re-run AI button. Check for a body before trying to parse one.
    const data = (await readJsonBody(res)) as T;
    if (isGet && data !== undefined) {
      getCacheMap.set(path, { data, timestamp: Date.now() });
    }
    return data;
  };

  if (isGet) {
    const promise = execute().finally(() => {
      inFlightGetRequests.delete(path);
    });
    inFlightGetRequests.set(path, promise);
    return promise;
  }

  return execute();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// Fix #4: login now returns email + role from the JSON body; the JWT itself is
// delivered as an httpOnly cookie — the frontend never sees or stores the token.
export function login(email: string, password: string, rememberMe = false) {
  return request<{ token: null; email: string; role: string; userId: number }>(
    "/api/v1/auth/login",
    { method: "POST", body: JSON.stringify({ email, password, rememberMe }) }
  );
}

// Registration is email-OTP-gated: initiate sends the code, verify confirms it
// and creates the account, resend re-sends if the code expired or was lost.
export function initiateRegistration(data: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  role: string;
}) {
  return request<{ message: string }>("/api/v1/auth/register/initiate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function verifyRegistrationOtp(email: string, otp: string) {
  return request<{ token: null; email: string; role: string; userId: number }>(
    "/api/v1/auth/register/verify",
    { method: "POST", body: JSON.stringify({ email, otp }) }
  );
}

export function resendRegistrationOtp(email: string) {
  return request<{ message: string }>("/api/v1/auth/register/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function serverLogout() {
  return request<void>("/api/v1/auth/logout", { method: "POST" });
}

// ── Platform Stats ────────────────────────────────────────────────────────────

export type PlatformStats = {
  activeCampaigns: number;
  totalDonations: number;
  uniqueDonors: number;
  totalRaised: number;
  topCategory: string;
};

export function getPlatformStats() {
  return request<PlatformStats>("/api/v1/stats");
}

export type RecentActivity = {
  type: "DONATION" | "CAMPAIGN";
  campaignTitle: string;
  city: string;
  category: string;
  amount: number | null;
  createdAt: string;
};

export function getRecentActivity() {
  return request<RecentActivity[]>("/api/v1/stats/recent-activity");
}

export function getPositiveUpdate() {
  return request<{ text: string }>("/api/v1/stats/positive-update");
}

export function forgotPassword(email: string) {
  return request<{ message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return request<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export type GoogleAuthResponse =
  | { needsCompletion: false; userId: number; email: string; role: string }
  | { needsCompletion: true; email: string; fullName: string };

export function googleAuth(accessToken: string) {
  return request<GoogleAuthResponse>("/api/v1/auth/google", {
    method: "POST",
    // Backend reads `idToken` for both the ID-token verify and the access-token
    // userinfo fallback, so the access token must be sent under `idToken`.
    body: JSON.stringify({ idToken: accessToken, accessToken }),
  });
}

export function googleComplete(accessToken: string, phone: string, city: string, role: string) {
  return request<GoogleAuthResponse>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken: accessToken, accessToken, phone, city, role }),
  });
}

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  city: string | null;
  role: string;
  latitude: number | null;
  longitude: number | null;
};

export function getProfile() {
  return request<UserProfile>("/api/v1/auth/me");
}

export function updateProfile(data: { fullName?: string; phone?: string; city?: string }) {
  return request<UserProfile>("/api/v1/auth/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export type Campaign = {
  id: number;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  amountRaised: number;
  city: string;
  state: string;
  status: string;
  rejectionReason: string | null;
  doneeId: number;
  doneeName: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  urgency?: string;
  doneeEmail?: string;
  doneePhone?: string;
};

export function getCampaigns() {
  return request<Campaign[]>("/api/v1/campaigns");
}

export function getCampaign(id: number) {
  return request<Campaign>(`/api/v1/campaigns/${id}`);
}

export function getMyCampaigns() {
  return request<Campaign[]>("/api/v1/campaigns/mine", { silent401: true });
}

export function createCampaign(data: {
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  city: string;
  state: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}) {
  return request<Campaign>("/api/v1/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export function adminGetCampaigns(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<Campaign[]>(`/api/v1/admin/campaigns${qs}`);
}

export function approveCampaign(id: number) {
  return request<Campaign>(`/api/v1/admin/campaigns/${id}/approve`, {
    method: "PATCH",
  });
}

export function rejectCampaign(id: number, reason: string) {
  return request<Campaign>(`/api/v1/admin/campaigns/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

// ── Donations ─────────────────────────────────────────────────────────────────

export type DonationOrder = {
  donationId: number;
  razorpayOrderId: string;
  amountInPaise: number;
  currency: string;
  razorpayKeyId: string;
};

export type Donation = {
  id: number;
  campaignId: number;
  campaignTitle: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  status: string;
  createdAt: string;
  donorName?: string;
};

export function initiateDonation(campaignId: number, amount: number) {
  return request<DonationOrder>("/api/v1/donations", {
    method: "POST",
    body: JSON.stringify({ campaignId, amount }),
  });
}

export function getMyDonations() {
  return request<Donation[]>("/api/v1/donations/mine", { silent401: true });
}

// ── Platform Tips & Handover Feedback ───────────────────────────────────────

export type PlatformTipOrder = {
  tipId: number;
  razorpayOrderId: string;
  amountInPaise: number;
  currency: string;
  razorpayKeyId: string;
};

export type HandoverFeedbackContextType = "OFFER" | "MATCH";

export function initiatePlatformTip(
  amount: number,
  contextType: HandoverFeedbackContextType,
  contextId: number
) {
  return request<PlatformTipOrder>("/api/v1/tips", {
    method: "POST",
    body: JSON.stringify({ amount, contextType, contextId }),
  });
}

export function submitHandoverFeedback(params: {
  contextType: HandoverFeedbackContextType;
  contextId: number;
  rating: number;
  note?: string;
  tipId?: number;
}) {
  return request<void>("/api/v1/handover-feedback", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getCampaignDonations(campaignId: number) {
  return request<Donation[]>(`/api/v1/campaigns/${campaignId}/donations`);
}

// ── Item Listings ─────────────────────────────────────────────────────────────

export type ItemListing = {
  id: number;
  title: string;
  category: string;
  subcategory: string | null;
  quantity: number;
  condition: string;
  city: string;
  pincode: string | null;
  locality: string | null;
  description: string | null;
  status: string;
  rejectionReason: string | null;
  donorId: number;
  donorName: string;
  donorEmail: string | null;
  createdAt: string;
  submittedAt: string | null;
  imageUrl: string | null;
  imageUrls: string | null;
  maximumDeliveryRadius: number | null;
  transportPayerPreference: string | null;
  availabilityExpiry: string | null;
  latitude: number | null;
  longitude: number | null;
  pickupAvailability: string | null;
  recipientRestrictions: string | null;
  // spec §5.1
  brand: string | null;
  model: string | null;
  approximateAge: string | null;
  workingStatus: string | null;
  knownDefects: string | null;
  accessoriesIncluded: string | null;
  dimensions: string | null;
  approximateWeight: string | null;
  // spec §5.3
  pickupDays: string | null;
  pickupTimeSlots: string | null;
  donorDropOffAvailable: boolean;
  maxTravelDistance: number | null;
  packagingAvailable: string | null;
  specialHandling: string | null;
  preferredHandoverDate: string | null;
  preferredHandoverSlots: string | null;
  policyVersion: string | null;
  declarationsAccepted: boolean;
  rejectedByAi: boolean;
};

// Listings are private donor inventory — the pool endpoint (GET /api/v1/items) is
// admin-only on the backend. Donor-facing code uses getMyItemListings/getItemListing;
// admin queues use adminGetItemListings.

export function getMyItemListings(options: { silent401?: boolean } = {}) {
  return request<ItemListing[]>("/api/v1/items/mine", options);
}

export function getItemListing(id: number) {
  return request<ItemListing>(`/api/v1/items/${id}`);
}

// ── Spec flow: Draft → Update → Submit ──────────────────────────────────────

export function createItemListingDraft() {
  return request<ItemListing>("/api/v1/items/draft", { method: "POST" });
}

export function updateItemListingDraft(id: number, data: Partial<CreateListingPayload>) {
  return request<ItemListing>(`/api/v1/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function submitItemListing(id: number) {
  return request<ItemListing>(`/api/v1/items/${id}/submit`, { method: "POST" });
}

export function pauseItemListing(id: number) {
  return request<ItemListing>(`/api/v1/items/${id}/pause`, { method: "POST" });
}

export function resumeItemListing(id: number) {
  return request<ItemListing>(`/api/v1/items/${id}/resume`, { method: "POST" });
}

export function withdrawItemListing(id: number) {
  return request<ItemListing>(`/api/v1/items/${id}/withdraw`, { method: "POST" });
}

export function deleteMyListing(id: number) {
  return request<void>(`/api/v1/items/${id}`, { method: "DELETE" });
}

export type CreateListingPayload = {
  title?: string;
  category?: string;
  subcategory?: string;
  quantity?: number;
  condition?: string;
  brand?: string;
  model?: string;
  approximateAge?: string;
  workingStatus?: string;
  knownDefects?: string;
  accessoriesIncluded?: string;
  dimensions?: string;
  approximateWeight?: string;
  description?: string;
  imageUrl?: string | null;
  imageUrls?: string;
  city?: string;
  pincode?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  pickupAvailableYN?: boolean;
  pickupDays?: string;
  pickupTimeSlots?: string;
  donorDropOffAvailable?: boolean;
  maxTravelDistance?: number;
  packagingAvailable?: string;
  specialHandling?: string;
  preferredHandoverDate?: string;
  preferredHandoverSlots?: string;
  maximumDeliveryRadius?: number;
  transportPayerPreference?: string;
  policyVersion?: string;
  declarationsAccepted?: boolean;
};

export function createItemListing(data: CreateListingPayload) {
  return request<ItemListing>("/api/v1/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminGetItemListings(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<ItemListing[]>(`/api/v1/admin/items${qs}`);
}

export function adminApproveItemListing(id: number) {
  return request<ItemListing>(`/api/v1/admin/items/${id}/approve`, { method: "PATCH" });
}

export function adminRejectItemListing(id: number, reason: string) {
  return request<ItemListing>(`/api/v1/admin/items/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export function adminMarkListingNeedsInformation(id: number, adminNote: string) {
  return request<ItemListing>(`/api/v1/admin/items/${id}/needs-information`, {
    method: "PATCH",
    body: JSON.stringify({ adminNote }),
  });
}

export type AdminAiReviewResponse = {
  entityType: "LISTING" | "REQUEST";
  entityId: number;
  title: string;
  recommendation: "APPROVE" | "REJECT" | "NEEDS_INFORMATION" | "MANUAL_REVIEW" | string;
  confidence: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | string;
  summary: string;
  suggestedAdminAction: string;
  suggestedAdminReason: string;
  donorMessage: string;
  evidence: string[];
  missingInfo: string[];
  modelVersion: string;
};

export function adminGetListingAiReview(id: number) {
  return request<AdminAiReviewResponse>(`/api/v1/admin/items/${id}/ai-review`, { silent401: true });
}

export type AiAssessmentResponse = {
  id: number;
  listingId: number;
  listingTitle: string;
  modelVersion: string;
  eligibilityResult: string;
  conditionGrade: string;
  confidence: number;
  imageDescriptionScore: number;
  fraudRisk: string;
  safetyWarnings: string | null;
  missingInfoFlags: string | null;
  recommendation: string;
  evidenceNotes: string | null;
  detectedLabels: string | null;
  moderationLabels: string | null;
  createdAt: string;
  // Listing + donor context for auditing the verdict
  listingStatus: string | null;
  category: string | null;
  subcategory: string | null;
  condition: string | null;
  workingStatus: string | null;
  knownDefects: string | null;
  description: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;
  images: string[];
  donorId: number | null;
  donorName: string | null;
  donorEmail: string | null;
};

export function adminGetListingAiAssessment(id: number) {
  return request<AiAssessmentResponse>(`/api/v1/admin/items/${id}/ai-assessment`, { silent401: true });
}

export function adminRunAiAssessment(id: number) {
  return request<{ status: string }>(`/api/v1/admin/items/${id}/run-ai-assessment`, { method: "POST" });
}

export function adminGetAllAiAssessments() {
  return request<AiAssessmentResponse[]>(`/api/v1/admin/ai-assessments`);
}

export async function uploadListingImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`${BASE_URL}/api/v1/items/upload-image`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.url as string;
}

export type ListingImageAnalysis = {
  aiAvailable: boolean;
  prohibited: boolean;
  prohibitedCategory: string | null;
  prohibitedReason: string | null;
  category: string | null;
  subcategory: string | null;
  title: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  workingStatus: string | null;
  approximateAge: string | null;
  knownDefects: string | null;
  dimensions: string | null;
  approximateWeight: string | null;
  description: string | null;
  confidence: number | null;
  uncertainFields: string[] | null;
  note: string | null;
};

/** Sends already-uploaded S3 photo URLs to Claude vision for listing-field suggestions. */
export function analyzeListingImages(imageUrls: string[]) {
  return request<ListingImageAnalysis>(`/api/v1/items/analyze-images`, {
    method: "POST",
    body: JSON.stringify({ imageUrls }),
  });
}

/** Same vision analysis as analyzeListingImages(), run against an offer's already-uploaded photos. */
export function analyzeOfferImages(offerId: number) {
  return request<ListingImageAnalysis>(`/api/v1/offers/${offerId}/analyze-images`, { method: "POST" });
}

// ── Item Requests ─────────────────────────────────────────────────────────────

export type ItemRequest = {
  id: number;
  title: string;
  category: string;
  quantity: number;
  urgency: string;
  city: string;
  pincode: string | null;
  description: string | null;
  status: string;
  rejectionReason: string | null;
  doneeId: number;
  doneeName: string;
  createdAt: string;
  imageUrl: string | null;
  pickupRadiusKm: number | null;
  latitude: number | null;
  longitude: number | null;
  // Tiered verification (Phase 3) — safe to show the owning donee, no PII/scores
  verificationTier: "TIER_1_BASIC" | "TIER_2_MODERATE" | "TIER_3_HIGH_VALUE" | "TIER_4_EMERGENCY" | null;
  isEmergency: boolean;
  emergencyNature: string | null;
  incidentDate: string | null;
  verificationDueAt: string | null;
};

/**
 * The guest-browsable projection of a need. Deliberately a *different* type
 * from `ItemRequest`, not a Partial of it — the backend endpoint that serves
 * this omits latitude/longitude/pincode/doneeId/status entirely, and modelling
 * it as an optional-fields variant would invite code that reads
 * `req.latitude ?? fallback` and quietly assumes the data might be there.
 */
export type PublicItemRequest = {
  id: number;
  title: string;
  category: string;
  quantity: number;
  urgency: string;
  city: string;
  description: string | null;
  createdAt: string;
  imageUrl: string | null;
  emergency: boolean;
  doneeFirstName: string;
};

/** Public need board — no auth, no GPS, no distance sorting (newest first). */
export function getPublicItemRequests(categories?: string[]) {
  const params = new URLSearchParams();
  if (categories && categories.length > 0) categories.forEach(c => params.append("categories", c));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<PublicItemRequest[]>(`/api/v1/item-requests/public${qs}`, { silent401: true });
}

export function getItemRequests(categories?: string[], lat?: number, lng?: number, opts?: { silent401?: boolean }) {
  const params = new URLSearchParams();
  if (categories && categories.length > 0) {
    categories.forEach(c => params.append("categories", c));
  }
  if (lat !== undefined && lat !== null) params.append("lat", String(lat));
  if (lng !== undefined && lng !== null) params.append("lng", String(lng));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<ItemRequest[]>(`/api/v1/item-requests${qs}`, { silent401: opts?.silent401 });
}

export function getMyItemRequests() {
  return request<ItemRequest[]>("/api/v1/item-requests/mine", { silent401: true });
}

export function createItemRequest(data: {
  title: string;
  category: string;
  quantity: number;
  urgency: string;
  city: string;
  pincode?: string;
  description?: string;
  imageUrl?: string | null;
  pickupRadiusKm?: number;
  latitude: number;
  longitude: number;
}) {
  return request<ItemRequest>("/api/v1/item-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Tiered verification: draft → update → submit (DONEE, Phase 3/4) ──────────

export function createItemRequestDraft() {
  return request<ItemRequest>("/api/v1/item-requests/draft", { method: "POST" });
}

export type UpdateRequestPayload = {
  title?: string;
  category?: string;
  quantity?: number;
  urgency?: string;
  city?: string;
  pincode?: string;
  description?: string;
  imageUrl?: string | null;
  latitude?: number;
  longitude?: number;
  isEmergency?: boolean;
  emergencyNature?: string;
  incidentDate?: string;
};

export function updateItemRequestDraft(id: number, data: Partial<UpdateRequestPayload>) {
  return request<ItemRequest>(`/api/v1/item-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function submitItemRequestDraft(id: number) {
  return request<ItemRequest>(`/api/v1/item-requests/${id}/submit`, { method: "POST" });
}

/** Fix & Resubmit: reopen a rejected request as an editable draft (REJECTED → DRAFT). */
export function reopenItemRequest(id: number) {
  return request<ItemRequest>(`/api/v1/item-requests/${id}/reopen`, { method: "POST" });
}

/** Withdraw my own request at any stage short of completion — cancels any live
 *  matches/offers against it too. `reason` is optional. */
export function cancelItemRequest(id: number, reason?: string) {
  return request<ItemRequest>(`/api/v1/item-requests/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Permanently delete my own UNSUBMITTED draft. Distinct from cancelItemRequest:
 * a submitted request is withdrawn and keeps its audit trail, whereas a draft was
 * never visible to anyone and is removed outright. The backend enforces both the
 * ownership and the DRAFT-only rule — this is not a client-side decision.
 */
export function deleteItemRequestDraft(id: number) {
  return request<void>(`/api/v1/item-requests/${id}`, { method: "DELETE" });
}

/** Read back my saved verification form (step 2 answers); undefined if never saved (204). */
export function getMyRequestVerificationDetails(id: number) {
  return request<RequestVerification | undefined>(`/api/v1/item-requests/${id}/verification-details`);
}

export type RequestVerification = {
  householdSize: number | null;
  dependents: number | null;
  age: number | null;
  gender: string | null;
  addressLandmark: string | null;
  housingType: "OWNED" | "RENTED" | "SHELTER" | "TEMPORARY" | null;
  beneficiaryDetails: string | null;
  reasonCannotBuy: string | null;
  supportingInstitution: string | null;
  monthlyIncome: number | null;
  landlordNameContact: string | null;
  familySize: number | null;
  numberOfEarners: number | null;
  incomeSource: string | null;
  medicalCondition: string | null;
  referrerName: string | null;
  referrerContact: string | null;
  altContactName: string | null;
  altContactPhone: string | null;
  detailedStory: string | null;
  mapsPin: string | null;
  peopleAffected: number | null;
  lostDamagedDescription: string | null;
  priorityItems: string | null;
  deliveryAddressDiffers: boolean;
  deliveryAddressReason: string | null;
};

export function saveRequestVerificationDetails(id: number, data: Partial<RequestVerification>) {
  return request<RequestVerification>(`/api/v1/item-requests/${id}/verification-details`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type VerificationDocumentType =
  | "RESIDENCE_PROOF" | "SELFIE_WITH_ID" | "RATION_CARD" | "VOTER_ID"
  | "PROOF_OF_NEED" | "BPL_CARD" | "INCOME_CERT" | "REFERENCE_LETTER" | "SITUATION_PHOTO"
  | "BANK_PASSBOOK" | "GOVT_ID_ANY" | "EMERGENCY_PROOF" | "SCENE_SELFIE" | "OFFICIAL_LETTER";

export type VerificationDocument = {
  id: number;
  docType: VerificationDocumentType;
  url: string;
  uploadedAt: string;
  aiVerified: boolean | null;
  aiConfidence: number | null;
  aiReason: string | null;
  aiDocumentTypeGuess: string | null;
};

/**
 * Structured rejection from the donee-photo screener. `retryable` distinguishes
 * "this photo isn't acceptable" (422) from "we couldn't check it" (503) — the
 * two need very different messages, so never collapse them.
 */
export type DocUploadError = Error & {
  code?: string;
  prohibitedCategories?: string[];
  retryable?: boolean;
};

export async function uploadVerificationDocument(
  requestId: number, docType: VerificationDocumentType, file: File
): Promise<VerificationDocument> {
  const fd = new FormData();
  fd.append("docType", docType);
  fd.append("file", file);
  const res = await fetch(`${BASE_URL}/api/v1/item-requests/${requestId}/documents`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    // A 413 is refused by the servlet container (or an upstream proxy) before
    // the handler runs, so there is no JSON body to pull a message out of —
    // without this the user just gets the generic "Document upload failed".
    if (res.status === 413) {
      const err: DocUploadError = new Error("That file is too large — please use an image or PDF under 10MB.");
      err.code = "FILE_TOO_LARGE";
      throw err;
    }
    const body = await res.json().catch(() => ({}));
    const err: DocUploadError = new Error(body?.message ?? "Document upload failed");
    if (body?.code) err.code = body.code;
    if (Array.isArray(body?.prohibitedCategories)) err.prohibitedCategories = body.prohibitedCategories;
    err.retryable = body?.retryable === true || res.status === 503;
    throw err;
  }
  return res.json();
}

export function getMyVerificationDocuments(requestId: number) {
  return request<VerificationDocument[]>(`/api/v1/item-requests/${requestId}/documents`);
}

export function deleteVerificationDocument(requestId: number, docId: number) {
  return request<void>(`/api/v1/item-requests/${requestId}/documents/${docId}`, { method: "DELETE" });
}

export type ResidenceProofAnalysis = {
  aiAvailable: boolean;
  looksLikeResidenceProof: boolean | null;
  confidence: number | null;
  reason: string | null;
  documentTypeGuess: string | null;
  note: string | null;
};

/** Fast, non-blocking AI check on an already-uploaded residence-proof document
 *  (S3 URL) — mirrors analyzeListingImages(). Never a hard gate on submission;
 *  a human admin still reviews the whole request afterward. Passing documentId
 *  persists the verdict onto that document row (feeds the admin-side auto-approve
 *  eligibility check) — omit it for a throwaway/preview check. */
export function analyzeResidenceProof(documentUrl: string, documentId?: number) {
  return request<ResidenceProofAnalysis>(`/api/v1/item-requests/analyze-residence-proof`, {
    method: "POST",
    body: JSON.stringify({ documentUrl, documentId }),
  });
}

export type IdProofAnalysis = {
  aiAvailable: boolean;
  looksLikeValidIdProof: boolean | null;
  confidence: number | null;
  reason: string | null;
  documentTypeGuess: string | null;
  note: string | null;
};

/** Fast, non-blocking AI check on an already-uploaded government-ID document
 *  (Aadhaar / PAN / Voter ID / etc., S3 URL) — sibling of analyzeResidenceProof().
 *  Never a hard gate on submission; a human admin still reviews the whole
 *  request afterward. Passing documentId persists the verdict onto that document
 *  row (feeds the admin-side auto-approve eligibility check). */
export function analyzeIdProof(documentUrl: string, documentId?: number) {
  return request<IdProofAnalysis>(`/api/v1/item-requests/analyze-id-proof`, {
    method: "POST",
    body: JSON.stringify({ documentUrl, documentId }),
  });
}

export function adminGetItemRequests(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<ItemRequest[]>(`/api/v1/admin/item-requests${qs}`);
}

export function adminApproveItemRequest(id: number) {
  return request<ItemRequest>(`/api/v1/admin/item-requests/${id}/approve`, { method: "PATCH" });
}

export function adminRejectItemRequest(id: number, reason: string) {
  return request<ItemRequest>(`/api/v1/admin/item-requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

// ── Tiered verification console (ADMIN, Phase 5) ──────────────────────────────

export type NeedAssessment = {
  modelVersion: string;
  needScore: number;
  fraudScore: number;
  duplicateScore: number;
  documentConfidence: number;
  urgencyAssessment: string | null;
  recommendation: string;
  evidenceNotes: string | null;
  missingInfoFlags: string | null;
  /**
   * The single gate that stopped auto-approval, or null if it went through.
   * Present so the queue can explain why a request with an APPROVE verdict is
   * still awaiting review, instead of showing two panels that contradict.
   */
  autoApproveBlockedBy: string | null;
  createdAt: string;
};

export type FraudFlag = {
  id: number;
  flagType: string;
  description: string;
  autoDetected: boolean;
  createdAt: string;
};

export type VerificationChecklistItem = {
  id: number;
  stepNumber: number;
  action: string;
  howToVerify: string;
  /**
   * NOT_APPLICABLE = genuinely doesn't apply (optional evidence not provided, or
   * a conditional step with no trigger) — excluded from required totals, never a
   * failure. UNAVAILABLE = the check couldn't run; absence of a result is not
   * evidence against anyone.
   */
  status: "PENDING" | "PASS" | "FAIL" | "NOT_APPLICABLE" | "UNAVAILABLE" | "ESCALATED";
  /** How this step is decided — see the backend VerificationMethod enum. */
  method:
    | "SYSTEM_RULE" | "AI_VISION" | "AI_DOCUMENT" | "AI_CONSISTENCY"
    | "HUMAN_CONDITIONAL" | "WORKFLOW_ACTION" | null;
  note: string | null;
  /** Admin email, or "AI_AUTOMATION" when the platform decided this step. */
  checkedByEmail: string | null;
  checkedAt: string | null;
  /** Automated steps render read-only — the backend also rejects manual edits. */
  automated: boolean;
  automationSource: string | null;
};

export type AdminRequestVerificationDetail = {
  requestId: number;
  tier: string | null;
  isEmergency: boolean;
  emergencyNature: string | null;
  incidentDate: string | null;
  verificationDueAt: string | null;
  tierOverriddenBy: string | null;
  tierOverrideReason: string | null;
  doneeId: number | null;
  doneeEmail: string | null;
  verification: RequestVerification | null;
  documents: VerificationDocument[];
  needAssessment: NeedAssessment | null;
  fraudFlags: FraudFlag[];
  checklist: VerificationChecklistItem[];
  /**
   * Only the checks that genuinely gate approval. Optional "strengthens your
   * case" evidence is excluded from the denominator, so a missing BPL card can
   * never read as outstanding work.
   */
  requiredChecksPassed: number;
  requiredChecksTotal: number;
  /** Null when nothing is outstanding. */
  requiredChecksBlocker: string | null;
};

export function adminGetItemRequestVerification(id: number) {
  return request<AdminRequestVerificationDetail>(`/api/v1/admin/item-requests/${id}/verification`);
}

export function adminUpdateChecklistItem(requestId: number, itemId: number, status: "PASS" | "FAIL" | "PENDING", note?: string) {
  return request<VerificationChecklistItem>(`/api/v1/admin/item-requests/${requestId}/checklist/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
}

export function adminOverrideTier(requestId: number, tier: string, reason: string) {
  return request<ItemRequest>(`/api/v1/admin/item-requests/${requestId}/override-tier`, {
    method: "PATCH",
    body: JSON.stringify({ tier, reason }),
  });
}

export function adminHoldItemRequest(requestId: number, reason: string) {
  return request<ItemRequest>(`/api/v1/admin/item-requests/${requestId}/hold`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export function adminResumeItemRequestReview(requestId: number) {
  return request<ItemRequest>(`/api/v1/admin/item-requests/${requestId}/resume-review`, { method: "PATCH" });
}

export function adminGetItemRequestAiReview(id: number) {
  return request<AdminAiReviewResponse>(`/api/v1/admin/item-requests/${id}/ai-review`, { silent401: true });
}

// ── Matches ───────────────────────────────────────────────────────────────────

export type ItemMatch = {
  id: number;
  matchType: "DONATE_TO_REQUEST" | "REQUEST_LISTING";
  listingId: number | null;
  listingTitle: string | null;
  requestId: number | null;
  requestTitle: string | null;
  donorId: number | null;
  donorName: string;
  donorEmail: string | null;
  donorCity: string;
  donorLatitude: number | null;
  donorLongitude: number | null;
  doneeId: number | null;
  doneeName: string;
  doneeEmail: string | null;
  doneeCity: string;
  doneeLatitude: number | null;
  doneeLongitude: number | null;
  status:
    | "DONOR_REVIEW"
    | "DONOR_REJECTED"
    | "PENDING_APPROVAL"
    | "AWAITING_DONEE_CONFIRMATION"
    | "DONEE_ACCEPTED"
    | "BOTH_PARTIES_ACCEPTED"
    | "LOGISTICS_CONFIRMED"
    | "TRANSPORT_DISCUSSION"
    | "ARRANGEMENT_AGREED"
    | "PICKUP_SCHEDULED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELIVERY_ATTEMPTED"
    | "DELIVERED_PENDING_CONFIRMATION"
    | "COMPLETED"
    | "FULFILLED"
    | "RESCHEDULED"
    | "FAILED"
    | "CANCELLED"
    | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  matchScore: number | null;
  // Match confidence breakdown — admin-only detail, null on donor/donee views.
  scoreCategory: number | null;
  scoreSpec: number | null;
  scoreDistanceKm: number | null;
  scoreDistanceStage: number | null;
  scoreQuantity: number | null;
  scoreUrgency: number | null;
  donorImages: string[];
  donorItemDescription: string | null;
  doneeReason: string | null;
  donorContact: string | null;
  doneeContact: string | null;
  // Request snapshot
  requestCategory: string | null;
  requestQuantity: number | null;
  requestUrgency: string | null;
  requestCity: string | null;
  requestPincode: string | null;
  requestDescription: string | null;
  requestStatus: string | null;
  requestImageUrl: string | null;
  requestLatitude: number | null;
  requestLongitude: number | null;
  requestCreatedAt: string | null;
  // Listing snapshot
  listingCategory: string | null;
  listingSubcategory: string | null;
  listingQuantity: number | null;
  listingCondition: string | null;
  listingCity: string | null;
  listingPincode: string | null;
  listingLocality: string | null;
  listingDescription: string | null;
  listingStatus: string | null;
  listingImageUrl: string | null;
  listingImageUrls: string | null;
  listingBrand: string | null;
  listingModel: string | null;
  listingApproximateAge: string | null;
  listingWorkingStatus: string | null;
  listingKnownDefects: string | null;
  listingAccessoriesIncluded: string | null;
  listingDimensions: string | null;
  listingApproximateWeight: string | null;
  listingLatitude: number | null;
  listingLongitude: number | null;
  listingCreatedAt: string | null;
  // Logistics
  handoverMethod: string | null;
  transportArrangedBy: string | null;
  transportCostBornBy: string | null;
  pickupDateTime: string | null;
  expectedDeliveryDate: string | null;
  packagingResponsibility: string | null;
  handoverAddress: string | null;
  handoverLatitude: number | null;
  handoverLongitude: number | null;
  deliveryAddress: string | null;
  allocatedQuantity: number | null;
  reservationExpiry: string | null;
  fulfilmentNotes: string | null;
  logisticsRescheduleCount: number;
  logisticsAtRisk: boolean;
  /** Server-computed XOR of the two confirmation timestamps — no status reflects it. */
  handoverPartlyConfirmed: boolean;
  closedAt: string | null;
  hiddenByDonor: boolean;
  hiddenByDonee: boolean;
  // Delivery verification
  deliveryOtpVerified: boolean;
  deliveryVerificationMethod: string | null;
  deliveryProofUrl: string | null;
  verifiedDeliveryCertificate: string | null;
  // Call masking
  callMaskingRequested: boolean;
  donorAllowsDoneeCall: boolean;
  // Dual handover confirmation (Handover Hub)
  donorConfirmedQty: number | null;
  donorConfirmedAt: string | null;
  doneeConfirmedQty: number | null;
  doneeConfirmedAt: string | null;
  doneeConditionRating: string | null;
  doneeConditionNotes: string | null;
};

export function donateToRequest(requestId: number, images: File[], description: string) {
  const formData = new FormData();
  formData.append("requestId", String(requestId));
  formData.append("description", description);
  images.forEach((img) => formData.append("images", img));
  return fetch(`${BASE_URL}/api/v1/matches/donate`, {
    method: "POST",
    credentials: "include",
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 401) { handleUnauthorized(); throw new Error("Session expired. Please log in again."); }
      if (res.status === 403) {
        // Same account-level codes as request() — this path builds its own fetch
        // for the multipart upload, so it needs the check too.
        const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
        if (isSessionEndedCode(body.code)) handleUnauthorized();
        throw new Error(body.message ?? "You don't have permission to do that.");
      }
      if (res.status === 409) throw new Error("You have already offered to donate for this request.");
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "Please check your details and try again.");
      }
      if (res.status === 500) throw new Error("Something went wrong on our end. Please try again.");
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? body?.title ?? "Something went wrong. Please try again.");
    }
    return res.json() as Promise<ItemMatch>;
  });
}

export function donorAcceptMatch(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}/donor-accept`, { method: "POST" });
}

export function donorRejectMatch(id: number, reason?: string, conditionChanged?: boolean) {
  return request<ItemMatch>(`/api/v1/matches/${id}/donor-reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null, conditionChanged: conditionChanged ? "true" : "false" }),
  });
}

export function doneeAcceptMatch(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}/donee-accept`, { method: "POST" });
}

export function doneeRejectMatch(id: number, reason?: string) {
  return request<ItemMatch>(`/api/v1/matches/${id}/donee-reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

export function donorConfirmMatch(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}/donor-confirm`, { method: "POST" });
}

export function saveMatchLogistics(id: number, data: {
  handoverMethod?: string;
  transportArrangedBy?: string;
  transportCostBornBy?: string;
  pickupDateTime?: string;
  expectedDeliveryDate?: string;
  packagingResponsibility?: string;
  handoverAddress?: string;
  handoverLatitude?: number;
  handoverLongitude?: number;
  deliveryAddress?: string;
  allocatedQuantity?: number;
  notes?: string;
}) {
  return request<ItemMatch>(`/api/v1/matches/${id}/logistics`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function requestCallMasking(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}/request-call`, { method: "POST" });
}

export function setMatchDoneeCallPermission(id: number, allowed: boolean) {
  return request<ItemMatch>(`/api/v1/matches/${id}/donee-call-permission?allowed=${allowed}`, { method: "POST" });
}

export function generateDeliveryOtp(id: number): Promise<{ otp: string }> {
  return request<{ otp: string }>(`/api/v1/matches/${id}/generate-otp`, { method: "POST" });
}

// ── Match Handover Hub: dual confirmation (donor-only schedule via saveMatchLogistics) ──

export function confirmMatchHandoverDonor(id: number, data: {
  quantityHandedOver: number; verificationMethod?: string; notes?: string;
}) {
  return request<ItemMatch>(`/api/v1/matches/${id}/handover/confirm-donor`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function confirmMatchHandoverDonee(id: number, data: {
  otp?: string; quantityReceived: number;
  conditionRating?: string; conditionNotes?: string; verificationMethod?: string;
}) {
  return request<ItemMatch>(`/api/v1/matches/${id}/handover/confirm-donee`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Match chat (mirrors offer chat, keyed to matchId instead of offerId) ────────

export function getMatchChatMessages(matchId: number) {
  return request<ChatMessage[]>(`/api/v1/matches/${matchId}/chat/messages`);
}

export function getMatchChatMessagesSince(matchId: number, since: string) {
  return request<ChatMessage[]>(
    `/api/v1/matches/${matchId}/chat/messages/since?since=${encodeURIComponent(since)}`,
  );
}

export function sendMatchChatMessage(
  matchId: number,
  content: string,
  messageType = "TEXT",
  recipientTarget?: "DONOR" | "DONEE" | "BOTH",
) {
  return request<ChatMessage>(`/api/v1/matches/${matchId}/chat/messages`, {
    method: "POST",
    body: JSON.stringify({ content, messageType, ...(recipientTarget ? { recipientTarget } : {}) }),
  });
}

export function markMatchChatMessagesRead(matchId: number) {
  return request<void>(`/api/v1/matches/${matchId}/chat/messages/read`, { method: "POST" });
}

export function getMatchChatUnreadCount(matchId: number) {
  return request<{ count: number }>(`/api/v1/matches/${matchId}/chat/messages/unread-count`);
}

export function verifyDeliveryMatch(id: number, data: {
  verificationMethod: string;
  otp?: string;
  proofUrl?: string;
  notes?: string;
}) {
  return request<ItemMatch>(`/api/v1/matches/${id}/verify-delivery`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function reconfirmAvailability(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}/reconfirm`, { method: "POST" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Types
// ─────────────────────────────────────────────────────────────────────────────

export type DonorFlowType = "ALREADY_OWN" | "WILL_PURCHASE" | "SIMILAR_ITEM";

export type OfferStatus =
  | "DRAFT" | "SUBMITTED" | "AI_ELIGIBILITY_SCREENING" | "AI_COMPATIBILITY_SCREENING"
  | "COMPATIBILITY_CHECKED" | "SOFT_RESERVED_PRIMARY" | "SOFT_RESERVED_BACKUP"
  | "PENDING_DONEE_REVIEW" | "DONEE_ACCEPTED" | "DONEE_DECLINED"
  | "DONOR_RECONFIRMATION_REQUIRED" | "DONOR_RECONFIRMED" | "CONDITION_CHANGED_RESCREENING"
  | "NEEDS_INFORMATION" | "PENDING_ADMIN_APPROVAL" | "ADMIN_APPROVED" | "ADMIN_REJECTED"
  | "HANDOVER_IN_PROGRESS" | "HANDOVER_AT_RISK" | "ISSUE_WINDOW_OPEN" | "ISSUE_RAISED"
  | "COMPLETED" | "CANCELLED" | "WITHDRAWN";

export type CompatibilityIndicator =
  | "STRONG_MATCH" | "POSSIBLE_MATCH" | "SOME_SPECS_DONT_MATCH" | "NOT_ELIGIBLE";

export type CompatibilityResult =
  | "PENDING" | "COMPATIBLE" | "PARTIALLY_COMPATIBLE" | "INCOMPATIBLE" | "REJECTED";

export type OfferHandoverMethod = "PICKUP" | "DROP_OFF" | "COURIER" | "CAUSEKIND_LOGISTICS";

export type AnonymizedRequest = {
  id: number;
  title: string;
  category: string;
  quantity: number;
  urgency: string;
  city: string;
  description: string | null;
  status: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  quantityRequired: number;
  quantityReserved: number;
  quantityDelivered: number;
  quantityRemaining: number;
  // Trust context — structured, non-identifying facts only
  verificationTier: string | null;
  emergency: boolean;
  imageUrl: string | null;
  householdSize: number | null;
  dependents: number | null;
  peopleAffected: number | null;
  housingType: string | null;
  numberOfEarners: number | null;
  reasonCannotBuy: string | null;
  /** True when this donee consented AND their photo passed screening. */
  doneePhotoAvailable: boolean;
  /**
   * The AI confirmed a face is clearly visible and the photo contains no
   * prohibited content. It did NOT match the face against the government ID —
   * never label this "identity verified" in the UI.
   */
  doneePhotoChecked: boolean;
  /** Relative path to our authenticated image endpoint; null when unavailable. */
  doneePhotoUrl: string | null;
};

/** Absolute URL for the donee portrait. Sent with credentials; re-authorized server-side. */
export function doneePhotoSrc(path: string): string {
  return `${BASE_URL}${path}`;
}

// ── Cancellation ─────────────────────────────────────────────────────────────

/** Mirrors the backend CancellationReason enum. */
export type CancellationReason =
  | "ITEM_NO_LONGER_AVAILABLE" | "CANNOT_ARRANGE_HANDOVER" | "SCHEDULING_PROBLEM"
  | "OTHER_PARTY_UNRESPONSIVE" | "SAFETY_CONCERN" | "CREATED_BY_MISTAKE" | "OTHER";

export const CANCELLATION_REASONS: { value: CancellationReason; label: string; needsDetail: boolean }[] = [
  { value: "ITEM_NO_LONGER_AVAILABLE", label: "The item is no longer available", needsDetail: false },
  { value: "CANNOT_ARRANGE_HANDOVER", label: "Unable to arrange handover", needsDetail: false },
  { value: "SCHEDULING_PROBLEM", label: "Scheduling problem", needsDetail: false },
  { value: "OTHER_PARTY_UNRESPONSIVE", label: "The other party is unresponsive", needsDetail: false },
  { value: "SAFETY_CONCERN", label: "Safety concern", needsDetail: true },
  { value: "CREATED_BY_MISTAKE", label: "Created by mistake", needsDetail: false },
  { value: "OTHER", label: "Other", needsDetail: true },
];

/**
 * What the signed-in participant may do to this entity right now.
 *
 * The server is authoritative — the UI renders from this rather than keeping its
 * own status list. The previous hardcoded list claimed to mirror the backend and
 * didn't: it hid withdrawal for three statuses the API accepted, and showed
 * nothing at all for ADMIN_APPROVED, which is how a donor ended up with no exit.
 */
export type CancellationOption = {
  allowed: boolean;
  outcome: "DELETE" | "WITHDRAW" | "CANCEL" | "HIDE" | "DISPUTE" | "NONE";
  actionLabel: string | null;
  requiresReason: boolean;
  /** A counterpart has already committed — warn before proceeding. */
  late: boolean;
  warning: string | null;
  blockedReason: string | null;
};

export function getOfferCancellationOptions(offerId: number) {
  return request<CancellationOption>(`/api/v1/offers/${offerId}/cancellation-options`);
}

/** Role and resulting status are both decided server-side from ownership + policy. */
export function cancelOffer(offerId: number, reason: CancellationReason | null, details?: string) {
  return request<CancellationOption>(`/api/v1/offers/${offerId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason, details: details ?? null }),
  });
}

/**
 * Re-run the AI need assessment for a request still awaiting review (ADMIN).
 * Re-evaluates every current gate and may auto-approve through the normal path —
 * it never sets a status directly, so a request that genuinely needs review stays
 * in the queue with a fresh, accurate blocker.
 */
export type ReassessmentResponse = {
  requestId: number;
  /** QUEUED = a fresh run started. ALREADY_RUNNING = one was in flight; no duplicate queued. */
  status: "QUEUED" | "ALREADY_RUNNING";
  message: string;
};

export function reassessItemRequest(id: number) {
  return request<ReassessmentResponse>(`/api/v1/admin/item-requests/${id}/reassess`, { method: "POST" });
}

/**
 * Remove a WITHDRAWN request from my dashboard. Soft hide — the row, its status
 * history, offers and matches all survive for admins and auditing; only the
 * donee's own view changes. The backend enforces both ownership and the
 * CANCELLED-only rule.
 */
export function hideWithdrawnRequest(id: number) {
  return request<void>(`/api/v1/item-requests/${id}/hide`, { method: "POST" });
}

/** Allow or withdraw showing my screened photo to donors. Revocable at any time. */
export function setDoneePhotoConsent(requestId: number, consent: boolean) {
  return request<void>(`/api/v1/item-requests/${requestId}/donee-photo-consent?consent=${consent}`, {
    method: "POST",
  });
}

export type QuantityAllocation = {
  requestId: number;
  quantityRequired: number;
  quantityOffered: number;
  quantityReserved: number;
  quantityDelivered: number;
  quantityCancelled: number;
  quantityRemaining: number;
};

export type OfferItemDetails = {
  id: number;
  brand: string | null;
  model: string | null;
  approximateAge: string | null;
  condition: string | null;
  workingStatus: string | null;
  knownDefects: string | null;
  accessoriesIncluded: string | null;
  dimensions: string | null;
  approximateWeight: string | null;
  quantity: number;
  subcategory: string | null;
  specNotes: string | null;
  pickupCity: string | null;
  pickupPincode: string | null;
  pickupLocality: string | null;
  latitude: number | null;
  longitude: number | null;
  donorDropOffAvailable: boolean;
  maxTravelDistanceKm: number | null;
  deliveryCostBornBy: string | null;
  preferredHandoverDate: string | null;
  offerValidUntil: string | null;
};

export type OfferMediaItem = {
  id: number;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  isPrimary: boolean;
  sortOrder: number;
};

export type DonationOffer = {
  id: number;
  flowType: DonorFlowType;
  status: OfferStatus;
  compatibilityResult: CompatibilityResult | null;
  compatibilityIndicator: CompatibilityIndicator | null;
  matchScore: number | null;
  /** Raw, exactly as an admin typed it. Admin/support surfaces only. */
  rejectionReason: string | null;
  /**
   * What a donor or donee should be shown — falls back to
   * "No detailed reason was provided." when the stored value is meaningless.
   * Use this on every user-facing screen; an admin once typed "." and the
   * dashboard rendered "Reason: .".
   */
  displayRejectionReason: string | null;
  declarationsAccepted: boolean;
  submittedAt: string | null;
  createdAt: string;
  /** When the offer reached a terminal status — the date on the Closed card. */
  closedAt: string | null;
  /** The donor archived this finished offer off their own dashboard. */
  hiddenByDonor: boolean;
  /**
   * Which side of the transaction the caller is on, computed server-side from
   * participation. Null/ADMIN means "not a participant" — never fall back to DONOR.
   */
  viewerRole: "DONOR" | "DONEE" | "ADMIN" | null;
  requestId: number;
  requestTitle: string;
  requestCategory: string;
  requestQuantity: number;
  requestCity: string;
  requestUrgency: string;
  itemDetails: OfferItemDetails | null;
  media: OfferMediaItem[];
  reservationType: "PRIMARY" | "BACKUP" | null;
  donorName: string;
  doneeName: string;
  donorPhone: string | null;
  doneePhone: string | null;
  donorAllowsDoneeCall: boolean;
  // Full AI screening detail — only populated on admin endpoints (adminGetAllOffers /
  // adminGetOfferById / adminActionOffer / adminRetryOfferScreening); null elsewhere.
  assessment: OfferAssessmentDetails | null;
};

export type OfferAssessmentDetails = {
  modelVersion: string | null;
  eligibilityResult: string | null;
  fraudRisk: string | null;
  categoryMatch: boolean;
  quantityMatch: boolean;
  conditionMatch: boolean;
  distanceWithinRange: boolean;
  specMatchNotes: string | null;
  safetyWarnings: string | null;
  missingInfoFlags: string | null;
  recommendation: string | null;
  evidenceNotes: string | null;
  detectedLabels: string | null;
  moderationLabels: string | null;
  createdAt: string;
};

export type CompatibilityCheck = {
  indicator: CompatibilityIndicator;
  categoryMatch: boolean;
  quantityMatch: boolean;
  conditionOk: boolean;
  explanation: string;
};

export type HandoverConfirmationSummary = {
  otpVerified: boolean;
  donorConfirmedQty: number | null;
  donorConfirmedAt: string | null;
  doneeConfirmedQty: number | null;
  doneeConfirmedAt: string | null;
  doneeConditionRating: string | null;
};

export type HandoverRecord = {
  id: number;
  offerId: number;
  method: OfferHandoverMethod | null;
  scheduledDateTime: string | null;
  locationAddress: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  transportArrangedBy: string | null;
  transportCostBornBy: string | null;
  rescheduleCount: number;
  atRisk: boolean;
  courierName: string | null;
  trackingNumber: string | null;
  createdAt: string;
  confirmation: HandoverConfirmationSummary | null;
};

export type Certificate = {
  id: number;
  offerId: number | null;
  matchId: number | null;
  certificateNumber: string;
  donorName: string;
  category: string;
  quantityDelivered: number;
  handoverDate: string;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  issuedAt: string;
};

export type ChatMessage = {
  id: number;
  threadId: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  content: string;
  messageType: "TEXT" | "SYSTEM" | "QUESTION" | "ADMIN_NOTE";
  recipientTarget: "DONOR" | "DONEE" | "BOTH" | null;
  readAt: string | null;
  sentAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Stage 1: Anonymized request
// ─────────────────────────────────────────────────────────────────────────────

export function getAnonymizedRequest(requestId: number) {
  return request<AnonymizedRequest>(`/api/v1/item-requests/${requestId}/anonymized`);
}

export function getQuantityAllocation(requestId: number) {
  return request<QuantityAllocation>(`/api/v1/item-requests/${requestId}/quantity-allocation`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Stage 2–3: Offer creation
// ─────────────────────────────────────────────────────────────────────────────

export function getOfferAvailability(requestId: number) {
  return request<{ blocked: boolean }>(`/api/v1/offers/availability?requestId=${requestId}`);
}

export function createOfferDraft(requestId: number, flowType: DonorFlowType) {
  return request<DonationOffer>(
    `/api/v1/offers/draft?requestId=${requestId}&flowType=${flowType}`,
    { method: "POST" },
  );
}

export function updateOfferItemDetails(offerId: number, data: Partial<OfferItemDetails> & {
  knownDefects?: string; specNotes?: string; courierArrangement?: string;
}) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}/item-details`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function uploadOfferMedia(offerId: number, files: File[]) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return fetch(`${BASE_URL}/api/v1/offers/${offerId}/media`, {
    method: "POST",
    credentials: "include",
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? "Upload failed");
    }
    return res.json() as Promise<DonationOffer>;
  });
}

export function deleteOfferMedia(offerId: number, mediaId: number) {
  return request<void>(`/api/v1/offers/${offerId}/media/${mediaId}`, { method: "DELETE" });
}

export function checkOfferCompatibility(offerId: number) {
  return request<CompatibilityCheck>(`/api/v1/offers/${offerId}/check-compatibility`, {
    method: "POST",
  });
}

export function submitOffer(offerId: number, declarationsAccepted: boolean) {
  return request<DonationOffer>(
    `/api/v1/offers/${offerId}/submit?declarationsAccepted=${declarationsAccepted}`,
    { method: "POST" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Donor read/manage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param includeArchived only for an explicit "Archived" filter. The default list
 *   never silently reinstates an offer the donor removed from their dashboard.
 */
export function getMyDonationOffers(includeArchived = false) {
  return request<DonationOffer[]>(
    `/api/v1/offers/mine${includeArchived ? "?includeArchived=true" : ""}`,
    { silent401: true },
  );
}

/**
 * Remove a closed offer from the donor's dashboard. A soft hide: the record, its
 * status, rejection reason, AI assessments, history and audit trail all stay, and
 * admins, support and the donee are unaffected. Reversible via {@link unhideOffer}.
 */
export function hideOffer(offerId: number) {
  return request<CancellationOption>(`/api/v1/offers/${offerId}/hide`, { method: "POST" });
}

export function unhideOffer(offerId: number) {
  return request<void>(`/api/v1/offers/${offerId}/unhide`, { method: "POST" });
}

export function getDonationOffer(offerId: number) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}`);
}

export function reconfirmOfferAvailability(offerId: number) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}/reconfirm`, { method: "POST" });
}

export function withdrawOffer(offerId: number, reason?: string) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}/withdraw`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Donee review (Stage 6)
// ─────────────────────────────────────────────────────────────────────────────

export function getOffersForMyRequests() {
  return request<DonationOffer[]>("/api/v1/offers/for-my-requests", { silent401: true });
}

export function doneeReviewOffer(
  offerId: number,
  action: "ACCEPT" | "DECLINE" | "ASK_QUESTION" | "REPORT" | "REQUEST_INFO",
  declineReason?: string,
  message?: string,
) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}/donee-review`, {
    method: "POST",
    body: JSON.stringify({ action, declineReason, message }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Flow B (purchase intent)
// ─────────────────────────────────────────────────────────────────────────────

export function saveFlowBCommitment(offerId: number, data: {
  itemName: string; proposedBrand?: string; proposedModel?: string;
  estimatedCost?: number; purchaseTimeline: string; intendedStore?: string; notes?: string;
}) {
  return request<object>(`/api/v1/offers/${offerId}/flow-b/commitment`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function uploadFlowBProof(offerId: number, proofType: string, file?: File,
                                   trackingNumber?: string, notes?: string) {
  const formData = new FormData();
  formData.append("proofType", proofType);
  if (file) formData.append("file", file);
  if (trackingNumber) formData.append("trackingNumber", trackingNumber);
  if (notes) formData.append("notes", notes);
  return fetch(`${BASE_URL}/api/v1/offers/${offerId}/flow-b/proof`, {
    method: "POST",
    credentials: "include",
    body: formData,
  }).then(async (res) => {
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.message ?? "Upload failed"); }
    return res.json();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Handover (Stages 9–11)
// ─────────────────────────────────────────────────────────────────────────────

export function getHandover(offerId: number) {
  return request<HandoverRecord>(`/api/v1/offers/${offerId}/handover`);
}

export function scheduleHandover(offerId: number, data: {
  method: OfferHandoverMethod; scheduledDateTime: string; locationAddress?: string;
  locationLatitude?: number; locationLongitude?: number;
  transportArrangedBy?: string; transportCostBornBy?: string;
  packagingResponsibility?: string; courierName?: string;
}) {
  return request<HandoverRecord>(`/api/v1/offers/${offerId}/handover`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function rescheduleHandover(offerId: number, data: {
  scheduledDateTime: string; locationAddress?: string;
  locationLatitude?: number; locationLongitude?: number;
  rescheduleReason?: string;
}) {
  return request<HandoverRecord>(`/api/v1/offers/${offerId}/handover/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function generateHandoverOtp(offerId: number) {
  return request<{ otp: string }>(`/api/v1/offers/${offerId}/handover/otp`, { method: "POST" });
}

export function confirmHandoverDonor(offerId: number, quantityHandedOver: number, verificationMethod?: string) {
  return request<HandoverRecord>(`/api/v1/offers/${offerId}/handover/confirm-donor`, {
    method: "POST",
    body: JSON.stringify({ quantityHandedOver, verificationMethod }),
  });
}

export function confirmHandoverDonee(offerId: number, data: {
  otp?: string; quantityReceived: number;
  conditionRating?: string; conditionNotes?: string; verificationMethod?: string;
}) {
  return request<HandoverRecord>(`/api/v1/offers/${offerId}/handover/confirm-donee`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function reportPostDeliveryIssue(offerId: number, data: {
  issueType: string; description: string; windowCategory: string; evidenceUrls?: string[];
}) {
  return request<object>(`/api/v1/offers/${offerId}/handover/issues`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function confirmNoIssue(offerId: number) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}/handover/confirm-no-issue`, { method: "POST" });
}

// ── Match cancellation ───────────────────────────────────────────────────────
// The policy has answered forMatch() since it was written; until now nothing
// executed its answer, so a match participant had no exit from any committed
// status. Same shape as the offer endpoints so the hub can use one code path.

export function getMatchCancellationOptions(matchId: number) {
  return request<CancellationOption>(`/api/v1/matches/${matchId}/cancellation-options`);
}

export function cancelMatch(matchId: number, reason: CancellationReason | null, details?: string) {
  return request<CancellationOption>(`/api/v1/matches/${matchId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason, details: details ?? null }),
  });
}

export function hideMatch(matchId: number) {
  return request<CancellationOption>(`/api/v1/matches/${matchId}/hide`, { method: "POST" });
}

export function unhideMatch(matchId: number) {
  return request<void>(`/api/v1/matches/${matchId}/unhide`, { method: "POST" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Certificate (Stage 12)
// ─────────────────────────────────────────────────────────────────────────────

export function getOfferCertificate(offerId: number) {
  return request<Certificate>(`/api/v1/offers/${offerId}/certificate`);
}

export function getMatchCertificate(matchId: number) {
  return request<Certificate>(`/api/v1/matches/${matchId}/certificate`);
}

export function verifyCertificate(certNumber: string) {
  return request<Certificate>(`/api/v1/certificates/${certNumber}/verify`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Chat
// ─────────────────────────────────────────────────────────────────────────────

export function getChatMessages(offerId: number) {
  return request<ChatMessage[]>(`/api/v1/offers/${offerId}/chat/messages`);
}

export function getChatMessagesSince(offerId: number, since: string) {
  return request<ChatMessage[]>(
    `/api/v1/offers/${offerId}/chat/messages/since?since=${encodeURIComponent(since)}`,
  );
}

export function sendChatMessage(
  offerId: number,
  content: string,
  messageType = "TEXT",
  recipientTarget?: "DONOR" | "DONEE" | "BOTH",
) {
  return request<ChatMessage>(`/api/v1/offers/${offerId}/chat/messages`, {
    method: "POST",
    body: JSON.stringify({ content, messageType, ...(recipientTarget ? { recipientTarget } : {}) }),
  });
}

export function setDoneeCallPermission(offerId: number, allowed: boolean) {
  return request<DonationOffer>(`/api/v1/offers/${offerId}/donee-call-permission?allowed=${allowed}`, { method: "POST" });
}

export function markChatMessagesRead(offerId: number) {
  return request<void>(`/api/v1/offers/${offerId}/chat/messages/read`, { method: "POST" });
}

export function getChatUnreadCount(offerId: number) {
  return request<{ count: number }>(`/api/v1/offers/${offerId}/chat/messages/unread-count`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Admin
// ─────────────────────────────────────────────────────────────────────────────

export function adminGetAllOffers(status?: string) {
  const q = status ? `?status=${status}` : "";
  return request<DonationOffer[]>(`/api/v1/admin/offers${q}`);
}

export function adminActionOffer(offerId: number, action: string, reason?: string, backupOfferId?: number) {
  return request<DonationOffer>(`/api/v1/admin/offers/${offerId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, reason, backupOfferId }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin — User Journey (full per-user lifecycle timeline)
// ─────────────────────────────────────────────────────────────────────────────

export type UserSearchHit = {
  id: number;
  fullName: string;
  email: string;
  role: string | null;
  city: string | null;
  registeredAt: string | null;
};

export type JourneyEvent = {
  at: string;
  category: string;
  type: string;
  title: string;
  detail: string | null;
  entityType: string | null;
  entityId: number | null;
  actor: string | null;
};

export type UserJourney = {
  user: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    role: string | null;
    city: string | null;
    registeredAt: string | null;
    active: boolean;
    suspended: boolean;
    suspensionReason: string | null;
    suspendedUntil: string | null;
  };
  stats: Record<string, number>;
  events: JourneyEvent[];
};

export function adminSearchUsers(q: string) {
  return request<UserSearchHit[]>(`/api/v1/admin/users/search?q=${encodeURIComponent(q)}`);
}

export function adminGetUserJourney(userId: number) {
  return request<UserJourney>(`/api/v1/admin/users/${userId}/journey`);
}

export type StatusHistoryEntry = {
  id: number;
  entityType: string;
  entityId: number;
  fromStatus: string | null;
  toStatus: string;
  changedByEmail: string;
  note: string | null;
  changedAt: string;
};

export function adminGetOfferHistory(offerId: number) {
  return request<StatusHistoryEntry[]>(`/api/v1/admin/offers/${offerId}/history`);
}

export function adminGetOfferById(offerId: number) {
  return request<DonationOffer>(`/api/v1/admin/offers/${offerId}`);
}

export function adminRetryOfferScreening(offerId: number) {
  return request<DonationOffer>(`/api/v1/admin/offers/${offerId}/retry-screening`, { method: "POST" });
}

export function updateMatchFulfilmentStatus(id: number, status: string, note?: string) {
  return request<ItemMatch>(`/api/v1/matches/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note: note ?? null }),
  });
}

export function confirmReceiptMatch(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}/confirm-receipt`, { method: "POST" });
}

export function analyzeItemImage(image: File): Promise<{ description: string }> {
  const formData = new FormData();
  formData.append("image", image);
  return fetch(`${BASE_URL}/api/v1/matches/analyze-image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw new Error("Image analysis failed");
    return res.json() as Promise<{ description: string }>;
  });
}

export function requestListing(listingId: number, reason: string) {
  return request<ItemMatch>("/api/v1/matches/request", {
    method: "POST",
    body: JSON.stringify({ listingId, reason }),
  });
}

export function getMyMatches() {
  return request<ItemMatch[]>("/api/v1/matches/mine", { silent401: true });
}

export function getMatch(id: number) {
  return request<ItemMatch>(`/api/v1/matches/${id}`);
}

export function adminGetMatches(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<ItemMatch[]>(`/api/v1/admin/matches${qs}`);
}

export function adminApproveMatch(id: number) {
  return request<ItemMatch>(`/api/v1/admin/matches/${id}/approve`, { method: "PATCH" });
}

export function adminRejectMatch(id: number, reason: string) {
  return request<ItemMatch>(`/api/v1/admin/matches/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}


export function adminGetMatchHistory(id: number) {
  return request<StatusHistoryEntry[]>(`/api/v1/admin/matches/${id}/history`);
}

// ── User profile ──────────────────────────────────────────────────────────────

export function getMyProfile() {
  return request<UserProfile>("/api/v1/users/me");
}

export function updateLocation(latitude: number, longitude: number) {
  return request<UserProfile>("/api/v1/users/location", {
    method: "PUT",
    body: JSON.stringify({ latitude, longitude }),
  });
}

// ── Admin Donations ───────────────────────────────────────────────────────────

export type AdminDonation = {
  id: number;
  donorName: string;
  donorEmail: string;
  campaignId: number;
  campaignTitle: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  status: "INITIATED" | "COMPLETED" | "FAILED";
  createdAt: string;
  updatedAt: string;
};

export type DonationStats = {
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  initiatedTransactions: number;
  uniqueDonors: number;
  totalCollected: number;
};

export function adminGetAllDonations() {
  return request<AdminDonation[]>("/api/v1/admin/donations");
}

export function adminGetDonationStats() {
  return request<DonationStats>("/api/v1/admin/donations/stats");
}

// ── Super Admin — full DB control ───────────────────────────────────────────────

export type SuperAdminEntity =
  | "users" | "campaigns" | "donations" | "item-requests" | "item-listings" | "matches";

export type SuperAdminRow = Record<string, unknown>;

export type SuperAdminOverview = {
  counts: Record<string, number>;
  roleBreakdown: Record<string, number>;
  totalRaised: number;
};

export type SqlResult = {
  type?: "read" | "write";
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  affectedRows?: number;
  error?: string;
};

export function superAdminOverview() {
  return request<SuperAdminOverview>("/api/v1/super-admin/overview");
}

export function superAdminList(entity: SuperAdminEntity, q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<SuperAdminRow[]>(`/api/v1/super-admin/${entity}${qs}`);
}

export function superAdminUpdate(entity: SuperAdminEntity, id: number, body: Record<string, unknown>) {
  return request<SuperAdminRow>(`/api/v1/super-admin/${entity}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type SuperAdminCascadeResult = { deleted: Record<string, number>; total: number };

export function superAdminDelete(entity: SuperAdminEntity, id: number, cascade = false) {
  return request<SuperAdminCascadeResult | undefined>(
    `/api/v1/super-admin/${entity}/${id}${cascade ? "?cascade=true" : ""}`,
    { method: "DELETE" }
  );
}

export function superAdminCreateUser(body: Record<string, unknown>) {
  return request<SuperAdminRow>("/api/v1/super-admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function superAdminRunSql(query: string) {
  return request<SqlResult>("/api/v1/super-admin/sql", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export type PostDeliveryIssue = {
  id: number;
  offerId: number | null;
  itemTitle: string | null;
  donorName: string | null;
  doneeName: string | null;
  reportedByName: string | null;
  reportedByIsDonor: boolean;
  issueType: string | null;
  description: string | null;
  windowCategory: string | null;
  windowExpiresAt: string | null;
  evidenceUrls: string[];
  adminResolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export function superAdminListDisputes(status: "open" | "resolved" | "all") {
  return request<PostDeliveryIssue[]>(`/api/v1/super-admin/disputes?status=${status}`);
}

export function superAdminResolveDispute(id: number, resolution: string) {
  return request<PostDeliveryIssue>(`/api/v1/super-admin/disputes/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolution }),
  });
}

// ── WhatsApp (Meta Cloud API) ────────────────────────────────────────────────

export type WhatsAppMessageLog = {
  id: number;
  direction: "OUTBOUND" | "INBOUND";
  waMessageId: string | null;
  phoneNumber: string;
  messageType: "TEMPLATE" | "TEXT" | "FLOW" | "OTHER";
  templateName: string | null;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | "RECEIVED";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppMessagePage = {
  content: WhatsAppMessageLog[];
  totalElements: number;
  totalPages: number;
  number: number;
};

export type WhatsAppTemplateComponent = Record<string, unknown>;

export type WhatsAppTemplate = {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components?: WhatsAppTemplateComponent[];
};

export type WhatsAppFlow = {
  id: string;
  name: string;
  status: string;
  categories?: string[];
};

export function getWhatsAppTemplates() {
  return request<{ data: WhatsAppTemplate[] }>("/api/v1/admin/whatsapp/templates");
}

export function createWhatsAppTemplate(body: {
  name: string;
  category: string;
  language: string;
  components: WhatsAppTemplateComponent[];
}) {
  return request<Record<string, unknown>>("/api/v1/admin/whatsapp/templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteWhatsAppTemplate(name: string) {
  return request<void>(`/api/v1/admin/whatsapp/templates/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export function getWhatsAppFlows() {
  return request<{ data: WhatsAppFlow[] }>("/api/v1/admin/whatsapp/flows");
}

export function createWhatsAppFlow(body: { name: string; categories: string[] }) {
  return request<Record<string, unknown>>("/api/v1/admin/whatsapp/flows", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateWhatsAppFlowJson(flowId: string, flowJson: string) {
  return request<Record<string, unknown>>(`/api/v1/admin/whatsapp/flows/${flowId}/json`, {
    method: "PUT",
    body: JSON.stringify({ flowJson }),
  });
}

export function publishWhatsAppFlow(flowId: string) {
  return request<Record<string, unknown>>(`/api/v1/admin/whatsapp/flows/${flowId}/publish`, {
    method: "POST",
  });
}

export function deleteWhatsAppFlow(flowId: string) {
  return request<void>(`/api/v1/admin/whatsapp/flows/${flowId}`, { method: "DELETE" });
}

export function sendWhatsAppTemplateMessage(body: {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
}) {
  return request<WhatsAppMessageLog>("/api/v1/admin/whatsapp/messages/send-template", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getWhatsAppMessages(page = 0, size = 25) {
  return request<WhatsAppMessagePage>(`/api/v1/admin/whatsapp/messages?page=${page}&size=${size}`);
}

// ── Admin permissions (super-admin grants/revokes per ADMIN) ────────────────

export type AdminCapabilityMap = Record<string, boolean>;

export type AdminAccount = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  permissions: AdminCapabilityMap;
};

/** The signed-in admin's own effective permissions — used to hide tabs they
 * don't have access to rather than just 403ing when clicked. */
export function adminGetMyPermissions() {
  return request<AdminCapabilityMap>("/api/v1/admin/self/permissions");
}

export function superAdminListAdmins() {
  return request<AdminAccount[]>("/api/v1/super-admin/admins");
}

export function superAdminGetAdminPermissions(adminId: number) {
  return request<AdminCapabilityMap>(`/api/v1/super-admin/admins/${adminId}/permissions`);
}

export function superAdminSetAdminPermissions(adminId: number, changes: AdminCapabilityMap) {
  return request<AdminCapabilityMap>(`/api/v1/super-admin/admins/${adminId}/permissions`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });
}

// ── Admin user suspend/ban ───────────────────────────────────────────────────

export function adminSuspendUser(userId: number, reason: string, until?: string | null) {
  return request<void>(`/api/v1/admin/users/${userId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason, until: until ?? null }),
  });
}

export function adminUnsuspendUser(userId: number) {
  return request<void>(`/api/v1/admin/users/${userId}/unsuspend`, { method: "POST" });
}

// ── Super-admin audit log ───────────────────────────────────────────────────

export type AuditLogEntry = {
  id: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  detail: string | null;
  createdAt: string;
};

export type AuditLogPage = {
  content: AuditLogEntry[];
  totalPages: number;
  totalElements: number;
  number: number;
};

export function superAdminAuditLog(page = 0, size = 25, filters?: { actorEmail?: string; entityType?: string; action?: string }) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters?.actorEmail) params.set("actorEmail", filters.actorEmail);
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.action) params.set("action", filters.action);
  return request<AuditLogPage>(`/api/v1/super-admin/audit-log?${params.toString()}`);
}

// ── Super Admin console — Phase 2 read surface ────────────────────────────────
// Directory, global search and User 360. All of it is read-only and masked at
// source; there is no unmasked variant to request. Actions on an account arrive
// in Phases 4–5.

/** The envelope every Phase 2 list endpoint returns (backend `PageResponse<T>`). */
export type SaPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
};

export type SaSearchType = "USER" | "REQUEST" | "LISTING" | "OFFER" | "MATCH" | "CERTIFICATE";

export type SaSearchHit = {
  type: SaSearchType;
  id: number;
  title: string;
  subtitle: string | null;
  status: string | null;
  at: string | null;
};

export type SaSearchGroup = {
  type: SaSearchType;
  totalMatches: number;
  hits: SaSearchHit[];
};

export type SaSearchResponse = { query: string; groups: SaSearchGroup[] };

export function superAdminSearch(q: string, types?: SaSearchType[], limit = 5) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  // Repeated `types` params rather than a comma list — Spring binds a Set<String>
  // from repeats, and a comma list would arrive as one bogus member.
  types?.forEach((t) => params.append("types", t));
  return request<SaSearchResponse>(`/api/v1/super-admin/search?${params.toString()}`);
}

export type SaUserSummary = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  city: string | null;
  active: boolean;
  suspended: boolean;
  registeredAt: string | null;
};

export type SaAccountState = {
  active: boolean;
  suspended: boolean;
  suspensionReason: string | null;
  suspendedUntil: string | null;
  suspendedAt: string | null;
  suspendedByEmail: string | null;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  tokenVersion: number;
};

export type SaUserProfile = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  city: string | null;
  registeredAt: string | null;
  accountState: SaAccountState;
  counts: Record<string, number>;
};

export type SaRecordType = "REQUEST" | "LISTING" | "OFFER" | "OFFER_RECEIVED" | "MATCH";

export type SaRecordSummary = {
  type: string;
  id: number;
  title: string;
  status: string | null;
  detail: string | null;
  at: string | null;
};

/** Same shape as the admin journey event — deliberately generic. */
export type SaTimelineEvent = {
  at: string;
  category: string;
  type: string;
  title: string;
  detail: string | null;
  entityType: string | null;
  entityId: number | null;
  actor: string | null;
};

export type SaTimelinePage = {
  events: SaPage<SaTimelineEvent>;
  /** Every category this user's history contains, not just the filtered ones. */
  availableCategories: string[];
};

export type SaDirectoryFilters = {
  q?: string;
  role?: string;
  suspended?: boolean;
  active?: boolean;
};

/**
 * NOTE the path: `/directory`, not `/users`. The generic entity console owns
 * `GET /super-admin/{entity}` and a literal `/users` would win that mapping —
 * see SuperAdminUserController for the full reasoning. Do not "tidy" this.
 */
export function superAdminDirectory(filters: SaDirectoryFilters = {}, page = 0, size = 25) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("role", filters.role);
  if (filters.suspended !== undefined) params.set("suspended", String(filters.suspended));
  if (filters.active !== undefined) params.set("active", String(filters.active));
  return request<SaPage<SaUserSummary>>(`/api/v1/super-admin/directory?${params.toString()}`);
}

export function superAdminUserProfile(id: number) {
  return request<SaUserProfile>(`/api/v1/super-admin/users/${id}/profile`);
}

export function superAdminUserRecords(id: number, type: SaRecordType, page = 0, size = 25) {
  const params = new URLSearchParams({ type, page: String(page), size: String(size) });
  return request<SaPage<SaRecordSummary>>(`/api/v1/super-admin/users/${id}/records?${params.toString()}`);
}

export function superAdminUserTimeline(
  id: number,
  opts: { categories?: string[]; from?: string; to?: string; page?: number; size?: number } = {}
) {
  const params = new URLSearchParams({
    page: String(opts.page ?? 0),
    size: String(opts.size ?? 50),
  });
  opts.categories?.forEach((c) => params.append("categories", c));
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  return request<SaTimelinePage>(`/api/v1/super-admin/users/${id}/timeline?${params.toString()}`);
}

// ── Super Admin console — Phase 3: support cases ──────────────────────────────
// Disputes are a category of case as of this phase: raising a post-delivery
// issue auto-opens one, so the disputes queue is a filter over this queue rather
// than a second place to look.

export type SaCaseStatus =
  | "NEW" | "IN_PROGRESS" | "WAITING_ON_USER" | "WAITING_ON_INTERNAL"
  | "RESOLVED" | "CLOSED" | "MERGED" | "REJECTED";

export type SaCasePriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export type SaCaseVisibility = "INTERNAL" | "USER";

export type SaCaseSummary = {
  id: number;
  caseNumber: string;
  subject: string;
  category: string;
  priority: SaCasePriority;
  status: SaCaseStatus;
  subjectUserName: string | null;
  subjectUserId: number | null;
  assignedAdminEmail: string | null;
  dueAt: string | null;
  overdue: boolean;
  createdAt: string;
};

export type SaCaseEvent = {
  id: number;
  eventType: string;
  visibility: SaCaseVisibility;
  actor: string;
  body: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export type SaCaseLink = {
  id: number;
  entityType: string;
  entityId: number;
  note: string | null;
  createdAt: string;
};

export type SaInformationItem = {
  id: number;
  itemType: string;
  label: string;
  docType: string | null;
  required: boolean;
  response: string | null;
  answered: boolean;
  respondedAt: string | null;
};

export type SaInformationRequest = {
  id: number;
  caseId: number | null;
  targetUserId: number;
  instructions: string;
  status: string;
  dueAt: string | null;
  holdWorkflow: boolean;
  overdue: boolean;
  createdByEmail: string;
  reviewNote: string | null;
  createdAt: string;
  items: SaInformationItem[];
};

export type SaCaseDetail = {
  summary: SaCaseSummary;
  description: string | null;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
  mergedIntoCaseId: number | null;
  systemOpened: boolean;
  waitingOnUserMinutes: number;
  events: SaCaseEvent[];
  links: SaCaseLink[];
  informationRequests: SaInformationRequest[];
  // Only these moves are legal from the current status. Drive the UI off this
  // rather than offering every status and taking a 409 back.
  allowedNextStatuses: SaCaseStatus[];
};

export type SaCaseMeta = {
  categories: { name: string; label: string; defaultSlaHours: number }[];
  statuses: SaCaseStatus[];
  priorities: SaCasePriority[];
  linkableTypes: string[];
};

export type SaCaseFilters = {
  q?: string;
  status?: SaCaseStatus;
  category?: string;
  priority?: SaCasePriority;
  assignedAdminId?: number;
  subjectUserId?: number;
  unassigned?: boolean;
};

export function superAdminCaseQueue(filters: SaCaseFilters = {}, page = 0, size = 25) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assignedAdminId) params.set("assignedAdminId", String(filters.assignedAdminId));
  if (filters.subjectUserId) params.set("subjectUserId", String(filters.subjectUserId));
  if (filters.unassigned) params.set("unassigned", "true");
  return request<SaPage<SaCaseSummary>>(`/api/v1/super-admin/cases?${params.toString()}`);
}

export function superAdminCaseMeta() {
  return request<SaCaseMeta>("/api/v1/super-admin/cases/meta");
}

export function superAdminCase(id: number) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}`);
}

export function superAdminCreateCase(body: {
  subject: string; description?: string; category: string;
  priority?: SaCasePriority; subjectUserId?: number; reportedByUserId?: number;
}) {
  return request<SaCaseDetail>("/api/v1/super-admin/cases", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function superAdminCaseStatus(id: number, status: SaCaseStatus, reason?: string) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}

export function superAdminCasePriority(id: number, priority: SaCasePriority) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });
}

export function superAdminCaseAssign(id: number, adminUserId: number | null) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}/assignee`, {
    method: "PATCH",
    body: JSON.stringify({ adminUserId }),
  });
}

// Visibility is never defaulted here, matching the backend. An internal note
// reaching the user it is about is the worst failure this screen can have.
export function superAdminCaseMessage(id: number, body: string, visibility: SaCaseVisibility) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, visibility }),
  });
}

export function superAdminCaseLink(id: number, entityType: string, entityId: number, note?: string) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}/links`, {
    method: "POST",
    body: JSON.stringify({ entityType, entityId, note }),
  });
}

export function superAdminCaseMerge(id: number, targetCaseId: number) {
  return request<SaCaseDetail>(`/api/v1/super-admin/cases/${id}/merge`, {
    method: "POST",
    body: JSON.stringify({ targetCaseId }),
  });
}

// ── Phase 4: account restrictions ───────────────────────────────────────────

export type SaRestrictionType =
  | "CHAT_SEND" | "CALL_REQUEST" | "REQUEST_CREATE" | "LISTING_CREATE"
  | "OFFER_MAKE" | "PHOTO_UPLOAD" | "CAMPAIGN_CREATE" | "MONEY_DONATE";

export type SaRestrictionScope =
  | "PLATFORM" | "REQUEST" | "LISTING" | "OFFER" | "MATCH" | "USER";

export type SaRestriction = {
  id: number;
  userId: number;
  type: SaRestrictionType;
  scopeType: SaRestrictionScope;
  scopeId: number | null;
  status: "ACTIVE" | "REVOKED";
  /**
   * Computed, not stored. A row keeps status ACTIVE after its expiry passes —
   * expiry is read from the timestamp rather than swept by a job — so render
   * this, not status, or an expired restriction will look live.
   */
  inForce: boolean;
  reason: string;
  internalNote: string | null;
  startsAt: string;
  expiresAt: string | null;
  createdBy: string;
  revokedBy: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  caseId: number | null;
  createdAt: string;
};

export type SaRestrictionMeta = {
  types: { name: SaRestrictionType; label: string; blocks: string }[];
  scopes: SaRestrictionScope[];
};

export function superAdminRestrictionMeta() {
  return request<SaRestrictionMeta>("/api/v1/super-admin/restrictions/meta");
}

export function superAdminRestrictions(userId: number) {
  return request<SaRestriction[]>(`/api/v1/super-admin/users/${userId}/restrictions`);
}

export function superAdminApplyRestriction(userId: number, body: {
  type: SaRestrictionType;
  scopeType?: SaRestrictionScope;
  scopeId?: number;
  reason: string;
  internalNote?: string;
  expiresAt?: string;
  caseId?: number;
}) {
  return request<SaRestriction>(`/api/v1/super-admin/users/${userId}/restrictions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** A reason is required, which is why lifting takes a body rather than a bare DELETE. */
export function superAdminRevokeRestriction(restrictionId: number, reason: string) {
  return request<SaRestriction>(`/api/v1/super-admin/restrictions/${restrictionId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });
}

export function superAdminRequestInformation(body: {
  targetUserId: number; caseId?: number; contextType?: string; contextId?: number;
  instructions: string; dueAt?: string; holdWorkflow?: boolean;
  items: { label: string; itemType: string; docType?: string; required?: boolean }[];
}) {
  return request<SaInformationRequest>("/api/v1/super-admin/cases/information-requests", {
    method: "POST",
    body: JSON.stringify({ holdWorkflow: false, ...body }),
  });
}

export function superAdminReviewInformation(requestId: number, accept: boolean, note?: string) {
  return request<SaInformationRequest>(
    `/api/v1/super-admin/cases/information-requests/${requestId}/review`,
    { method: "POST", body: JSON.stringify({ accept, note }) }
  );
}

export type SaUserNote = {
  id: number;
  authorEmail: string;
  body: string;
  pinned: boolean;
  createdAt: string;
};

export function superAdminUserNotes(userId: number, page = 0, size = 25) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return request<SaPage<SaUserNote>>(
    `/api/v1/super-admin/cases/users/${userId}/notes?${params.toString()}`
  );
}

export function superAdminAddUserNote(userId: number, body: string, pinned = false) {
  return request<SaUserNote>(`/api/v1/super-admin/cases/users/${userId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body, pinned }),
  });
}

// ── User-facing: what the platform is waiting on from you ─────────────────────
// Deliberately no case id, staff identity or internal note in these types. The
// shape itself is the guarantee, matching UserTask on the backend.

export type MyTaskItem = {
  id: number;
  itemType: string;
  label: string;
  docType: string | null;
  required: boolean;
  response: string | null;
  answered: boolean;
};

export type MyTask = {
  requestId: number;
  instructions: string;
  status: string;
  dueAt: string | null;
  overdue: boolean;
  createdAt: string;
  items: MyTaskItem[];
};

export function myTasks() {
  return request<MyTask[]>("/api/v1/me/tasks");
}

export function myTaskCount() {
  return request<{ outstanding: number }>("/api/v1/me/tasks/count");
}

// Item id to answer. Items left out are untouched rather than cleared, so a long
// task can be answered across several sittings.
export function respondToTask(requestId: number, answers: Record<number, string>) {
  return request<MyTask>(`/api/v1/me/tasks/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

/**
 * Uploads a photo for a PHOTO/DOCUMENT item and returns its URL, which is then
 * sent as that item's answer through respondToTask.
 *
 * Raw fetch rather than request(), which sets a JSON content type — the browser
 * has to set the multipart boundary itself.
 *
 * The backend scopes this to the request's target user and 404s otherwise, so a
 * failure here is genuinely "not yours or not open", never a silent success.
 */
export async function uploadTaskAttachment(requestId: number, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE_URL}/api/v1/me/tasks/${requestId}/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    // 413 is refused by the servlet container before the handler runs, so there
    // is no JSON body to read a message out of.
    if (res.status === 413) throw new Error("That photo is too large — please use one under 10MB.");
    let msg = "Upload failed — please try again.";
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* non-JSON error body; keep the default */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.url as string;
}

// ── Phase 5: interventions (staff cancellation) ──────────────────────────────

/**
 * What staff may do to a record, as decided by CancellationPolicy.
 *
 * Mirrors the backend's CancellationOption. The important property is that this
 * is not advisory: the execute endpoint consults the same policy, so `allowed:
 * false` means the POST would be refused for the stated reason. The console must
 * not offer an action the preview says is unavailable.
 */
export type SaCancellationOutcome =
  | "DELETE"      // never visible to anyone — removed outright
  | "WITHDRAW"    // out of circulation before a counterpart committed
  | "CANCEL"      // backing out after a counterpart committed; cascades and notifies
  | "HIDE"        // already terminal; clears the owner's dashboard, keeps the record
  | "DISPUTE"     // past the point of no return — the honest route is Report an issue
  | "OVERRIDE"    // staff acting past the boundary a donor or donee is stopped at
  | "NONE";       // no exit exists for this actor in this state

export type SaCancellationOption = {
  allowed: boolean;
  outcome: SaCancellationOutcome;
  /** Contextual — "Withdraw offer", never a generic "Cancel". Null when not allowed. */
  actionLabel: string | null;
  requiresReason: boolean;
  /** A counterpart has already committed time or an item to this. */
  late: boolean;
  /** Counterpart-impact copy. Null when nobody else is involved yet. */
  warning: string | null;
  /** Why not, when `allowed` is false. Written to be shown as-is. */
  blockedReason: string | null;
  /**
   * Derived server-side from `isMutating()`, not a stored field: true when the
   * outcome changes something rather than merely describing it. The backend uses
   * it to decide whether to build `consequences` at all, so an empty list on a
   * `mutating: true` option is a real "nothing else follows" — the distinction
   * the consequences renderer depends on.
   */
  mutating: boolean;
};

export type SaConsequenceKind =
  | "STATUS_CHANGE"
  | "ITEM_RELEASED"
  | "REQUEST_REOPENED"
  | "BACKUP_PROMOTED"
  | "WAITLIST_NOTIFIED"
  | "NOTIFICATION"
  | "FRAUD_FLAG"
  | "CONFIRMATION_ERASED"
  | "CERTIFICATE_AFFECTED";

export type SaCancellationConsequence = {
  kind: SaConsequenceKind;
  description: string;
};

/**
 * @property consequences empty means "nothing else would follow", never "we could
 * not work it out" — the backend builds this list only for mutating outcomes and
 * returns an empty one otherwise. Render it as a statement, not as a failure.
 */
export type SaCancellationPreview = {
  entityType: string;
  entityId: number;
  currentStatus: string;
  option: SaCancellationOption;
  consequences: SaCancellationConsequence[];
};

export type SaCancellationReason =
  | "ITEM_NO_LONGER_AVAILABLE"
  | "CANNOT_ARRANGE_HANDOVER"
  | "SCHEDULING_PROBLEM"
  | "OTHER_PARTY_UNRESPONSIVE"
  | "SAFETY_CONCERN"
  | "CREATED_BY_MISTAKE"
  | "OTHER";

/** Labels copied from CancellationReason so the console reads as the app does. */
export const SA_CANCELLATION_REASONS: { value: SaCancellationReason; label: string }[] = [
  { value: "ITEM_NO_LONGER_AVAILABLE", label: "The item is no longer available" },
  { value: "CANNOT_ARRANGE_HANDOVER",  label: "Unable to arrange handover" },
  { value: "SCHEDULING_PROBLEM",       label: "Scheduling problem" },
  { value: "OTHER_PARTY_UNRESPONSIVE", label: "The other party is unresponsive" },
  { value: "SAFETY_CONCERN",           label: "Safety concern" },
  { value: "CREATED_BY_MISTAKE",       label: "Created by mistake" },
  { value: "OTHER",                    label: "Other" },
];

/**
 * Mirrors CancellationReason.requiresDetails(). Duplicated deliberately so the
 * submit button can be disabled before the request rather than after a 400 —
 * the server still enforces it, and this is the friendlier half of the same rule.
 * SAFETY_CONCERN because a safety report nobody can read is not actionable, and
 * OTHER because it is definitionally uninformative.
 */
export function saReasonRequiresDetails(reason: SaCancellationReason): boolean {
  return reason === "SAFETY_CONCERN" || reason === "OTHER";
}

/**
 * The two record types staff can currently act on. These are path segments, and
 * they sit at `/{entity}/{id}/…` — deeper than the generic console's
 * `/super-admin/{entity}` mapping, which is why they cannot hijack it. Anything
 * added here must keep that shape.
 */
export type SaInterventionEntity = "offers" | "matches";

export function superAdminCancellationPreview(entity: SaInterventionEntity, id: number) {
  return request<SaCancellationPreview>(
    `/api/v1/super-admin/${entity}/${id}/cancellation-preview`
  );
}

export function superAdminCancel(
  entity: SaInterventionEntity,
  id: number,
  body: { reason: SaCancellationReason; details?: string }
) {
  return request<SaCancellationOption>(`/api/v1/super-admin/${entity}/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Phase 5B-2: named domain actions ─────────────────────────────────────────

/**
 * The five named actions. §8 of the rebuild plan requires interventions to be
 * expressed this way rather than as status writes, so there is deliberately no
 * "set status" call anywhere in this file for these record types.
 */
export type SaInterventionType = "HOLD" | "RESUME" | "REQUEST_INFO" | "REASSESS" | "REPUBLISH";

/**
 * One action and whether it can be taken right now.
 *
 * Unavailable actions are returned too, carrying `blockedReason` — "why can't I
 * do this" is the question, and an action that vanishes from the list answers it
 * with a blank space. Render the reason; never hide the row.
 */
export type SaInterventionAction = {
  type: SaInterventionType;
  available: boolean;
  /** Contextual — "Pause this listing", never a generic "Hold". Null when blocked. */
  label: string | null;
  /** Free text is mandatory, not optional. The owner reads it. */
  requiresText: boolean;
  /** Why not, when `available` is false. Written to be shown as-is. */
  blockedReason: string | null;
  /** Counterpart impact worth reading before acting. Null when nobody else is affected. */
  warning: string | null;
};

/** Record types the named actions apply to. Path segments. */
export type SaActionEntity = "requests" | "listings" | "offers";

export function superAdminActions(entity: SaActionEntity, id: number) {
  return request<SaInterventionAction[]>(`/api/v1/super-admin/${entity}/${id}/actions`);
}

/** All three mutating actions answer with the refreshed action list, not a bare 200. */
export function superAdminHold(entity: SaActionEntity, id: number, reason: string) {
  return request<SaInterventionAction[]>(`/api/v1/super-admin/${entity}/${id}/hold`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function superAdminResume(entity: SaActionEntity, id: number, reason?: string) {
  return request<SaInterventionAction[]>(`/api/v1/super-admin/${entity}/${id}/resume`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function superAdminReassess(entity: SaActionEntity, id: number) {
  return request<SaInterventionAction[]>(`/api/v1/super-admin/${entity}/${id}/reassess`, {
    method: "POST",
  });
}

/**
 * No `targetUserId`: who to ask follows from the record, and the server derives
 * it. Letting the console name someone would allow a request about one person's
 * listing to be sent to another.
 */
export function superAdminRequestInfoFor(
  entity: SaActionEntity,
  id: number,
  body: {
    instructions: string;
    dueAt?: string;
    holdWorkflow?: boolean;
    caseId?: number;
    items: { label?: string; itemType: string; docType?: string; required?: boolean }[];
  }
) {
  return request<{ informationRequestId: number }>(
    `/api/v1/super-admin/${entity}/${id}/request-info`,
    { method: "POST", body: JSON.stringify({ holdWorkflow: false, ...body }) }
  );
}

// ── Phase 5B-2: match state machine view ─────────────────────────────────────

/**
 * @property partlyConfirmed the state with **no status of its own** — exactly one
 * side has confirmed the handover. It is the most confusing thing to meet in
 * support, because the match still reads as in-progress while one party believes
 * it is finished, and it is why staff cancelling here get OVERRIDE.
 */
export type SaHandoverState = {
  donorConfirmed: boolean;
  donorConfirmedAt: string | null;
  doneeConfirmed: boolean;
  doneeConfirmedAt: string | null;
  partlyConfirmed: boolean;
  bothConfirmed: boolean;
};

export type SaMatchParticipant = { userId: number; name: string; email: string };

export type SaTransitionRecord = {
  fromStatus: string;
  toStatus: string;
  changedBy: string | null;
  note: string | null;
  at: string;
};

/**
 * @property stuckSince when the current status began. **Null means unknown, not
 * "just changed"** — nothing has been recorded — and staff must be able to tell
 * those apart before chasing someone about a delay.
 */
export type SaMatchState = {
  matchId: number;
  status: string;
  terminal: boolean;
  handover: SaHandoverState;
  stuckSince: string | null;
  donor: SaMatchParticipant | null;
  donee: SaMatchParticipant | null;
  cancellation: SaCancellationOption;
  history: SaTransitionRecord[];
};

export function superAdminMatchState(id: number) {
  return request<SaMatchState>(`/api/v1/super-admin/matches/${id}/state`);
}
