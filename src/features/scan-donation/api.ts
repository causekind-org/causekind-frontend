import type { ScanFormValues } from "./schema";
import { chosenAmount } from "./schema";
import type { Utm } from "./tracking";

// NEXT_PUBLIC_API_URL is what the rest of the site reads; it covers deployments
// that have not set the new name yet. Both are public origins, never secrets.
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";

const ORDER_TIMEOUT_MS = 20_000;
// Longer: the donor has already paid, so a slow answer must not read as a failure.
const VERIFY_TIMEOUT_MS = 30_000;

export type QrOrder = {
  donationId: string | number;
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: string;
};

export type QrVerifyRequest = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type QrVerifyResult = {
  status: string;
  donationId: string | number;
  firstName: string;
  amount: number;
  wants80g: boolean;
};

export type FieldError = { field: string; message: string };

export class ScanApiError extends Error {
  constructor(message: string, readonly fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ScanApiError";
  }
}

const GENERIC_ERROR = "Something went wrong on our side. Please try again.";

/** Reads the backend's ApiException body ({message, fieldErrors}) and Spring's default one ({errors}). */
function readFieldErrors(body: Record<string, unknown>): FieldError[] {
  const list = Array.isArray(body.fieldErrors) ? body.fieldErrors : Array.isArray(body.errors) ? body.errors : [];
  return list.flatMap((e: { field?: unknown; message?: unknown; defaultMessage?: unknown }) => {
    const message = e?.message ?? e?.defaultMessage;
    return typeof e?.field === "string" && typeof message === "string" ? [{ field: e.field, message }] : [];
  });
}

async function post<T>(path: string, payload: unknown, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Public endpoints: a signed-in session must play no part in them.
      credentials: "omit",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ScanApiError("We couldn't reach our server. Please check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const record = (body ?? {}) as Record<string, unknown>;
    // 5xx text is for logs, not for donors.
    const message = res.status < 500 && typeof record.message === "string" ? record.message : GENERIC_ERROR;
    throw new ScanApiError(message, readFieldErrors(record));
  }
  if (!body) throw new ScanApiError(GENERIC_ERROR);
  return body as T;
}

export function buildOrderPayload(values: ScanFormValues, utm: Utm) {
  return {
    name: values.name.trim(),
    phone: values.phone,
    email: values.email.trim(),
    amount: chosenAmount(values.preset, values.otherAmount),
    // Separate from the donation, as on /donate/money: the backend adds it to the order total.
    tipAmount: Number(values.tip),
    wants80g: values.wants80g,
    pan: values.pan,
    address: {
      line: values.address.line.trim(),
      city: values.address.city.trim(),
      state: values.address.state.trim(),
      pincode: values.address.pincode,
    },
    utm,
    website: values.website,
  };
}

export function createQrOrder(payload: ReturnType<typeof buildOrderPayload>) {
  return post<QrOrder>("/api/v1/donations/qr/orders", payload, ORDER_TIMEOUT_MS);
}

export function verifyQrPayment(payload: QrVerifyRequest) {
  return post<QrVerifyResult>("/api/v1/donations/qr/verify", payload, VERIFY_TIMEOUT_MS);
}
