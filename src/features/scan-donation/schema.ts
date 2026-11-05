import { z } from "zod";

export const PRESET_AMOUNTS = [51, 101, 501] as const;
export const DEFAULT_PRESET = "101";
export const OTHER_PRESET = "other";
export const MIN_AMOUNT = 10;
/** Rupees. ₹30 is preselected, as on the other donate pages; the donor can change it or pick "No thanks". */
export const TIP_OPTIONS = [0, 30, 50, 100] as const;
export const DEFAULT_TIP = "30";

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;

export const scanSchema = z
  .object({
    preset: z.string(),
    otherAmount: z.string(),
    tip: z.string(),
    name: z.string().trim().min(1, "Please enter your full name."),
    phone: z.string().regex(PHONE_RE, "Enter a 10-digit Indian mobile number."),
    email: z.string().trim().min(1, "Please enter your email.").email("Enter a valid email address."),
    wants80g: z.boolean(),
    pan: z.string(),
    address: z.object({
      line: z.string(),
      city: z.string(),
      state: z.string(),
      pincode: z.string().refine((v) => v === "" || PINCODE_RE.test(v), "PIN code must be 6 digits."),
    }),
    website: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.preset === OTHER_PRESET && !(Number(v.otherAmount) >= MIN_AMOUNT)) {
      ctx.addIssue({ code: "custom", path: ["otherAmount"], message: `The minimum donation is ₹${MIN_AMOUNT}.` });
    }
    if (!PAN_RE.test(v.pan)) {
      ctx.addIssue({ code: "custom", path: ["pan"], message: "Enter a valid PAN, like ABCDE1234F." });
    }
    if (!v.address.line.trim()) ctx.addIssue({ code: "custom", path: ["address", "line"], message: "Please enter your street address." });
    if (!v.address.city.trim()) ctx.addIssue({ code: "custom", path: ["address", "city"], message: "Please enter your city." });
    if (!v.address.state.trim()) ctx.addIssue({ code: "custom", path: ["address", "state"], message: "Please enter your state." });
    if (!v.address.pincode) ctx.addIssue({ code: "custom", path: ["address", "pincode"], message: "Please enter your PIN code." });
  });

export type ScanFormValues = z.infer<typeof scanSchema>;

export const SCAN_DEFAULTS: ScanFormValues = {
  preset: DEFAULT_PRESET,
  otherAmount: "",
  tip: DEFAULT_TIP,
  name: "",
  phone: "",
  email: "",
  wants80g: false,
  pan: "",
  address: { line: "", city: "", state: "", pincode: "" },
  website: "",
};

/** The chosen amount in rupees; 0 while "Other amount" is empty. */
export function chosenAmount(preset: string, otherAmount: string): number {
  return Number(preset === OTHER_PRESET ? otherAmount : preset) || 0;
}

/** Keeps the 10 national digits of a typed or autofilled number ("+91 98765 43210"). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const national = digits.length > 10 ? digits.replace(/^(91|0)/, "") : digits;
  return national.slice(0, 10);
}
