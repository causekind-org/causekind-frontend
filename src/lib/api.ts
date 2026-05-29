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
  role: "DONOR" | "DONEE";
}) {
  return request<{ token: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
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
