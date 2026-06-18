export type AIBreakdownItem = {
  label: string;
  amount: number;
  type: "surgery" | "medication" | "post-op" | "fees" | "materials" | "logistics" | "care" | "other";
};

export type AIFAQItem = {
  q: string;
  a: string;
};

export type AIContentResult = {
  breakdown: AIBreakdownItem[];
  faqs: AIFAQItem[];
};

/**
 * Dynamically generates campaign content including specific budget breakdowns
 * and FAQs by performing natural language analysis on title and description.
 */
export function generateCampaignAIContent(
  title: string,
  description: string,
  targetAmount: number
): AIContentResult {
  const desc = (description || "").toLowerCase();
  const t = (title || "").toLowerCase();

  // 1. Identify category / focus
  let focus = "general";
  if (
    desc.includes("surgery") ||
    desc.includes("operation") ||
    desc.includes("kidney") ||
    desc.includes("heart") ||
    desc.includes("medical") ||
    desc.includes("hospital") ||
    desc.includes("treatment") ||
    desc.includes("chemo") ||
    desc.includes("transplant") ||
    desc.includes("accident") ||
    t.includes("medical") ||
    t.includes("surgery")
  ) {
    focus = "medical";
  } else if (
    desc.includes("school") ||
    desc.includes("fees") ||
    desc.includes("education") ||
    desc.includes("college") ||
    desc.includes("student") ||
    desc.includes("tuition") ||
    desc.includes("class") ||
    t.includes("school") ||
    t.includes("fees")
  ) {
    focus = "education";
  } else if (
    desc.includes("dog") ||
    desc.includes("cat") ||
    desc.includes("animal") ||
    desc.includes("shelter") ||
    desc.includes("rescue") ||
    t.includes("animal") ||
    t.includes("dog") ||
    t.includes("cat")
  ) {
    focus = "animal";
  } else if (
    desc.includes("flood") ||
    desc.includes("earthquake") ||
    desc.includes("disaster") ||
    desc.includes("relief") ||
    desc.includes("rehab") ||
    desc.includes("emergency") ||
    t.includes("flood") ||
    t.includes("relief")
  ) {
    focus = "disaster";
  } else if (
    desc.includes("tree") ||
    desc.includes("environment") ||
    desc.includes("forest") ||
    desc.includes("clean") ||
    desc.includes("green") ||
    desc.includes("waste") ||
    t.includes("tree") ||
    t.includes("green")
  ) {
    focus = "environment";
  }

  // 2. Generate breakdown
  let breakdown: AIBreakdownItem[] = [];
  if (focus === "medical") {
    if (desc.includes("surgery") || desc.includes("operation") || desc.includes("transplant")) {
      breakdown = [
        { label: "Surgery/Procedure Cost", amount: Math.round(targetAmount * 0.6), type: "surgery" },
        { label: "Critical Medication", amount: Math.round(targetAmount * 0.25), type: "medication" },
        { label: "Post-op Care & Ward Charges", amount: Math.round(targetAmount * 0.15), type: "post-op" },
      ];
    } else if (desc.includes("chemo") || desc.includes("cancer") || desc.includes("tumor")) {
      breakdown = [
        { label: "Chemotherapy & Radiation", amount: Math.round(targetAmount * 0.5), type: "surgery" },
        { label: "Hospital ICU/Ward Charges", amount: Math.round(targetAmount * 0.3), type: "care" },
        { label: "Specialist Medicines", amount: Math.round(targetAmount * 0.2), type: "medication" },
      ];
    } else {
      breakdown = [
        { label: "Treatment & Therapy Cost", amount: Math.round(targetAmount * 0.55), type: "surgery" },
        { label: "Hospitalization Charges", amount: Math.round(targetAmount * 0.3), type: "care" },
        { label: "Medical Supplies", amount: Math.round(targetAmount * 0.15), type: "medication" },
      ];
    }
  } else if (focus === "education") {
    if (desc.includes("fees") || desc.includes("tuition") || desc.includes("college")) {
      breakdown = [
        { label: "Academic Tuition Fees", amount: Math.round(targetAmount * 0.65), type: "fees" },
        { label: "Books & Study Materials", amount: Math.round(targetAmount * 0.2), type: "materials" },
        { label: "Hostel & Transport Support", amount: Math.round(targetAmount * 0.15), type: "care" },
      ];
    } else {
      breakdown = [
        { label: "Infrastructure / Classroom Setup", amount: Math.round(targetAmount * 0.6), type: "surgery" },
        { label: "Teaching Aid & Supplies", amount: Math.round(targetAmount * 0.25), type: "materials" },
        { label: "Operational Administration", amount: Math.round(targetAmount * 0.15), type: "fees" },
      ];
    }
  } else if (focus === "animal") {
    breakdown = [
      { label: "Veterinary Treatment & Vaccines", amount: Math.round(targetAmount * 0.5), type: "surgery" },
      { label: "Shelter Setup & Facility Rent", amount: Math.round(targetAmount * 0.3), type: "care" },
      { label: "Feed & Daily Care Supplies", amount: Math.round(targetAmount * 0.2), type: "materials" },
    ];
  } else if (focus === "disaster") {
    breakdown = [
      { label: "Emergency Food, Water & Kits", amount: Math.round(targetAmount * 0.45), type: "materials" },
      { label: "Relief Logistics & Camp Setup", amount: Math.round(targetAmount * 0.35), type: "logistics" },
      { label: "On-site Medical Aid", amount: Math.round(targetAmount * 0.2), type: "care" },
    ];
  } else if (focus === "environment") {
    breakdown = [
      { label: "Saplings, Seeds & Tools", amount: Math.round(targetAmount * 0.55), type: "materials" },
      { label: "Community Awareness & Labor", amount: Math.round(targetAmount * 0.3), type: "care" },
      { label: "Logistics & Outreach Campaigns", amount: Math.round(targetAmount * 0.15), type: "logistics" },
    ];
  } else {
    breakdown = [
      { label: "Direct Support Funds", amount: Math.round(targetAmount * 0.6), type: "care" },
      { label: "Procurement of Materials", amount: Math.round(targetAmount * 0.25), type: "materials" },
      { label: "Distribution Logistics", amount: Math.round(targetAmount * 0.15), type: "logistics" },
    ];
  }

  // 3. Generate FAQs
  let faqs: AIFAQItem[] = [];
  if (focus === "medical") {
    faqs = [
      {
        q: "Who receives the funds for this medical case?",
        a: "The funds are transferred directly to the verified billing account of the hospital or directly to the beneficiary's family bank details after official medical verification.",
      },
      {
        q: "Can I receive direct medical updates from the hospital?",
        a: "Yes! The organizer will post verified hospital bill receipts, prescription bills, and reports under the Updates section periodically.",
      },
    ];
  } else if (focus === "education") {
    faqs = [
      {
        q: "How will the tuition fees utilization be verified?",
        a: "The organizer will upload paid fee receipts, college ledger records, or books purchase statements directly to the campaign updates once the funds are disbursed.",
      },
      {
        q: "Can I directly sponsor a student or offer mentorship?",
        a: "Yes! Please click the 'Contact Organizer' button in the sidebar to coordinate direct sponsorship options, book donations, or local student tutoring.",
      },
    ];
  } else if (focus === "animal") {
    faqs = [
      {
        q: "Are treatment and vet checkup receipts shared?",
        a: "Yes, clinic checkout receipts, prescription logs, and shelter feed purchase invoices will be posted regularly on the campaign Updates timeline.",
      },
      {
        q: "Can I visit the shelter or adopt any rescued animals?",
        a: "Absolutely! Feel free to click the 'Contact Organizer' button to get shelter address coordinates, schedule a visit, or start an adoption process.",
      },
    ];
  } else if (focus === "disaster") {
    faqs = [
      {
        q: "How quickly will relief kits be distributed?",
        a: "Relief resources are dispatched in emergency batches. The campaign team works with on-ground local authorities to procure and distribute kits within 24–48 hours.",
      },
      {
        q: "Will we receive distribution audit reports?",
        a: "Yes! Geo-tagged distribution photographs, food logs, and expenditure records will be uploaded as verification updates on the timeline.",
      },
    ];
  } else {
    faqs = [
      {
        q: "How are the funds managed and audited?",
        a: "Disbursement happens in planned phases. The campaign organizer is required to upload receipts and photos of previous utilize phases before next funding release.",
      },
      {
        q: "Is my donation eligible for 80G tax benefits?",
        a: "Yes! Donations made to approved campaigns on CauseKind are eligible for tax deduction. You will receive the tax certificate in your registered email once payment completes.",
      },
    ];
  }

  return { breakdown, faqs };
}
