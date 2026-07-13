const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    // Fix #4: clear legacy token keys from old sessions that pre-date cookie auth
    localStorage.removeItem("ck_token");
    sessionStorage.removeItem("ck_token");
    localStorage.removeItem("ck_user");
    window.location.href = "/login?expired=1";
  }
}

type RequestOptions = RequestInit & {
  /** If true, a 401 response throws but does NOT redirect to login.
   *  Use for background/optional fetches where one 401 shouldn't kill the whole session. */
  silent401?: boolean;
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { silent401, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Fix #14: ngrok dev header is no longer sent to production — only in local dev.
    ...(process.env.NODE_ENV === "development"
      ? { "ngrok-skip-browser-warning": "true" }
      : {}),
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Fix #4: credentials:"include" makes the browser attach the httpOnly session
  // cookie automatically. We no longer read the JWT from localStorage or send an
  // Authorization header — the cookie does that job, and JavaScript can't steal it.
  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Read body first — login endpoint returns "Bad credentials" here, not a session expiry
      const body401 = await res.json().catch(() => ({}));
      const msg401 = body401?.message ?? body401?.title;
      if (!silent401) handleUnauthorized();
      throw new Error(msg401 ?? "Invalid email or password. Please try again.");
    }
    if (res.status === 403) throw new Error("You don't have permission to do that.");
    if (res.status === 404) throw new Error("The requested item was not found.");
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? "This action has already been done.");
    }
    if (res.status === 500) throw new Error("Something went wrong on our end. Please try again.");
    const body = await res.json().catch(() => ({}));
    const msg =
      body?.message ??
      body?.detail ??
      (Array.isArray(body?.errors) && body.errors.length > 0
        ? body.errors.map((e: { defaultMessage?: string; field?: string }) =>
            e.field ? `${e.field}: ${e.defaultMessage}` : e.defaultMessage
          ).join(", ")
        : null) ??
      (body?.title !== "Bad Request" ? body?.title : null) ??
      `Something went wrong (${res.status})`;
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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

export function register(data: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  role: string;
}) {
  return request<{ token: null; email: string; role: string; userId: number }>(
    "/api/v1/auth/register",
    { method: "POST", body: JSON.stringify(data) }
  );
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

export function getItemRequests(categories?: string[], lat?: number, lng?: number) {
  const params = new URLSearchParams();
  if (categories && categories.length > 0) {
    categories.forEach(c => params.append("categories", c));
  }
  if (lat !== undefined && lat !== null) params.append("lat", String(lat));
  if (lng !== undefined && lng !== null) params.append("lng", String(lng));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<ItemRequest[]>(`/api/v1/item-requests${qs}`);
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
  | "AADHAAR_FRONT" | "AADHAAR_BACK" | "SELFIE_WITH_ID" | "RATION_CARD" | "VOTER_ID"
  | "PROOF_OF_NEED" | "BPL_CARD" | "INCOME_CERT" | "REFERENCE_LETTER" | "SITUATION_PHOTO"
  | "BANK_PASSBOOK" | "GOVT_ID_ANY" | "EMERGENCY_PROOF" | "SCENE_SELFIE" | "OFFICIAL_LETTER";

export type VerificationDocument = {
  id: number;
  docType: VerificationDocumentType;
  url: string;
  uploadedAt: string;
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
  if (!res.ok) throw new Error("Document upload failed");
  return res.json();
}

export function getMyVerificationDocuments(requestId: number) {
  return request<VerificationDocument[]>(`/api/v1/item-requests/${requestId}/documents`);
}

export function deleteVerificationDocument(requestId: number, docId: number) {
  return request<void>(`/api/v1/item-requests/${requestId}/documents/${docId}`, { method: "DELETE" });
}

export function updateAadhaar(aadhaarNumber: string) {
  return request<UserProfile>("/api/v1/users/aadhaar", {
    method: "PUT",
    body: JSON.stringify({ aadhaarNumber }),
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
  status: "PENDING" | "PASS" | "FAIL";
  note: string | null;
  checkedByEmail: string | null;
  checkedAt: string | null;
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
  doneeAadhaarLast4: string | null;
  doneeAadhaarOnFile: boolean;
  verification: RequestVerification | null;
  documents: VerificationDocument[];
  needAssessment: NeedAssessment | null;
  fraudFlags: FraudFlag[];
  checklist: VerificationChecklistItem[];
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

// Click-to-reveal: decrypts on demand server-side, audit-logged. Never cache this
// value beyond the component that displayed it — re-fetch on every reveal.
export function adminRevealAadhaar(userId: number) {
  return request<{ aadhaarNumber: string }>(`/api/v1/admin/users/${userId}/aadhaar`);
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
  deliveryAddress: string | null;
  allocatedQuantity: number | null;
  reservationExpiry: string | null;
  fulfilmentNotes: string | null;
  logisticsRescheduleCount: number;
  logisticsAtRisk: boolean;
  // Delivery verification
  deliveryOtpVerified: boolean;
  deliveryVerificationMethod: string | null;
  deliveryProofUrl: string | null;
  verifiedDeliveryCertificate: string | null;
  // Call masking
  callMaskingRequested: boolean;
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
      if (res.status === 403) throw new Error("You don't have permission to do that.");
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
};

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
  rejectionReason: string | null;
  declarationsAccepted: boolean;
  submittedAt: string | null;
  createdAt: string;
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
  offerId: number;
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

export function getMyDonationOffers() {
  return request<DonationOffer[]>("/api/v1/offers/mine", { silent401: true });
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
  scheduledDateTime: string; locationAddress?: string; rescheduleReason?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Donor Flow 2 — Certificate (Stage 12)
// ─────────────────────────────────────────────────────────────────────────────

export function getOfferCertificate(offerId: number) {
  return request<Certificate>(`/api/v1/offers/${offerId}/certificate`);
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

export function superAdminDelete(entity: SuperAdminEntity, id: number) {
  return request<void>(`/api/v1/super-admin/${entity}/${id}`, { method: "DELETE" });
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
