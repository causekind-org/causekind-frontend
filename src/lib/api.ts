const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ck_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      body?.message ?? body?.title ?? `HTTP ${res.status}`;
    throw new Error(msg);
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

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  role: string;
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
};

export function getCampaigns() {
  return request<Campaign[]>("/api/v1/campaigns");
}

export function getCampaign(id: number) {
  return request<Campaign>(`/api/v1/campaigns/${id}`);
}

export function getMyCampaigns() {
  return request<Campaign[]>("/api/v1/campaigns/mine");
}

export function createCampaign(data: {
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  city: string;
  state: string;
  imageUrl?: string | null;
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
};

export function initiateDonation(campaignId: number, amount: number) {
  return request<DonationOrder>("/api/v1/donations", {
    method: "POST",
    body: JSON.stringify({ campaignId, amount }),
  });
}

export function getMyDonations() {
  return request<Donation[]>("/api/v1/donations/mine");
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
};

export function getItemRequests() {
  return request<ItemRequest[]>("/api/v1/item-requests");
}

export function getMyItemRequests() {
  return request<ItemRequest[]>("/api/v1/item-requests/mine");
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
  listingId: number;
  listingTitle: string;
  requestId: number;
  requestTitle: string;
  donorName: string;
  donorCity: string;
  doneeName: string;
  doneeCity: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  donorContact: string | null;
  doneeContact: string | null;
};

export function createMatch(listingId: number, requestId: number) {
  return request<ItemMatch>("/api/v1/matches", {
    method: "POST",
    body: JSON.stringify({ listingId, requestId }),
  });
}

export function getMyMatches() {
  return request<ItemMatch[]>("/api/v1/matches/mine");
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
