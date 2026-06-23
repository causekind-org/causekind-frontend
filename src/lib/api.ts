const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ck_token") ?? sessionStorage.getItem("ck_token");
}

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ck_token");
    sessionStorage.removeItem("ck_token");
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
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    if (res.status === 401) {
      if (!silent401) handleUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }
    if (res.status === 403) throw new Error("You don't have permission to do that.");
    if (res.status === 404) throw new Error("The requested item was not found.");
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? "This action has already been done.");
    }
    if (res.status === 500) throw new Error("Something went wrong on our end. Please try again.");
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.title ?? "Something went wrong. Please try again.");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function login(email: string, password: string) {
  return request<{ token: string }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(data: {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  role: string;
}) {
  return request<{ token: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
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
  | { needsCompletion: false; token: string; userId: number; email: string; role: string }
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
  const qs = status ? `?status=${status}` : "";
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
  quantity: number;
  condition: string;
  city: string;
  pincode: string | null;
  description: string | null;
  status: string;
  rejectionReason: string | null;
  donorId: number;
  donorName: string;
  createdAt: string;
  imageUrl: string | null;
  maximumDeliveryRadius: number | null;
  transportPayerPreference: string | null;
  availabilityExpiry: string | null;
};

export function getItemListings() {
  return request<ItemListing[]>("/api/v1/items");
}

export function getMyItemListings() {
  return request<ItemListing[]>("/api/v1/items/mine");
}

export function createItemListing(data: {
  title: string;
  category: string;
  quantity: number;
  condition: string;
  city: string;
  pincode?: string;
  description?: string;
  imageUrl?: string | null;
  maximumDeliveryRadius?: number;
  transportPayerPreference?: string;
}) {
  return request<ItemListing>("/api/v1/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminGetItemListings(status?: string) {
  const qs = status ? `?status=${status}` : "";
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
};

export function getItemRequests() {
  return request<ItemRequest[]>("/api/v1/item-requests");
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
}) {
  return request<ItemRequest>("/api/v1/item-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminGetItemRequests(status?: string) {
  const qs = status ? `?status=${status}` : "";
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

// ── Matches ───────────────────────────────────────────────────────────────────

export type ItemMatch = {
  id: number;
  matchType: "DONATE_TO_REQUEST" | "REQUEST_LISTING";
  listingId: number | null;
  listingTitle: string | null;
  requestId: number | null;
  requestTitle: string | null;
  donorName: string;
  donorCity: string;
  doneeName: string;
  doneeCity: string;
  status:
    | "PENDING_APPROVAL"
    | "TRANSPORT_DISCUSSION"
    | "ARRANGEMENT_AGREED"
    | "PICKUP_SCHEDULED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELIVERY_ATTEMPTED"
    | "DELIVERED_PENDING_CONFIRMATION"
    | "FULFILLED"
    | "RESCHEDULED"
    | "FAILED"
    | "CANCELLED"
    | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  matchScore: number | null;
  donorImages: string[];
  donorItemDescription: string | null;
  doneeReason: string | null;
  donorContact: string | null;
  doneeContact: string | null;
};

export function donateToRequest(requestId: number, images: File[], description: string) {
  const token = typeof window !== "undefined" ? (localStorage.getItem("ck_token") ?? sessionStorage.getItem("ck_token")) : null;
  const formData = new FormData();
  formData.append("requestId", String(requestId));
  formData.append("description", description);
  images.forEach((img) => formData.append("images", img));

  return fetch(`${BASE_URL}/api/v1/matches/donate`, {
    method: "POST",
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
      "ngrok-skip-browser-warning": "true",
    },
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

export function analyzeItemImage(image: File): Promise<{ description: string }> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("ck_token") ?? sessionStorage.getItem("ck_token")) : null;
  const formData = new FormData();
  formData.append("image", image);
  return fetch(`${BASE_URL}/api/v1/matches/analyze-image`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "ngrok-skip-browser-warning": "true",
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw new Error("Analysis failed");
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

export function adminGetMatches(status?: string) {
  const qs = status ? `?status=${status}` : "";
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
