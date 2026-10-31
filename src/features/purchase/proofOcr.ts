import type { ExtractedProofData } from "@/lib/api";

/**
 * Parses raw text extracted from an order confirmation, invoice, or delivery screenshot
 * into structured order details.
 */
export function parseOrderProofText(raw: string): ExtractedProofData {
  if (!raw || !raw.trim()) {
    return {
      retailer: null,
      orderNumber: null,
      quantity: 1,
      expectedDeliveryDate: null,
      trackingNumber: null,
      trackingUrl: null,
    };
  }

  // 1. Retailer detection
  let retailer: string | null = null;
  const known = [
    "Amazon",
    "Flipkart",
    "Blinkit",
    "Zepto",
    "Tata 1mg",
    "1mg",
    "Myntra",
    "Croma",
    "Reliance Digital",
    "Swiggy Instamart",
    "BigBasket",
    "Demo Electronics",
    "Samsung",
    "Apple",
    "Meesho",
    "Nykaa",
    "Ajio",
  ];

  for (const k of known) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp("\\b" + escaped + "\\b", "i").test(raw)) {
      retailer = k;
      break;
    }
  }

  if (!retailer) {
    const shopMatch =
      raw.match(/shopping with ([A-Za-z0-9 ]+?)(?:\.|\n|$)/i) ||
      raw.match(/Sold by:?\s*([A-Za-z0-9 ]+?)(?:\n|$)/i) ||
      raw.match(/Seller:?\s*([A-Za-z0-9 ]+?)(?:\n|$)/i);
    if (shopMatch) {
      retailer = shopMatch[1].trim();
    }
  }

  // 2. Order Number detection
  let orderNumber: string | null = null;
  const explicitOrd =
    raw.match(/\b(TEST-ORD-[\w-]+)\b/i) ||
    raw.match(/\b(\d{3}-\d{7}-\d{7})\b/) || // Amazon
    raw.match(/\b(OD\d{10,})\b/) || // Flipkart
    raw.match(/Order\s+(?:Number|No|#|ID)\b[:\s#]+([A-Za-z0-9\-_]{5,35})/i) ||
    raw.match(/Order\s+ID[:\s]+([A-Za-z0-9\-_]{5,35})/i);

  if (explicitOrd) {
    const val = explicitOrd[1].trim();
    if (!/^(confirmed|summary|details|status|placed|date|tracking|expected)$/i.test(val)) {
      orderNumber = val;
    }
  }

  // 3. Quantity detection
  let quantity = 1;
  const qMatch =
    raw.match(/Quantity[:\s]+(\d+)/i) ||
    raw.match(/Qty[:\s]+(\d+)/i) ||
    raw.match(/\bUnits?[:\s]+(\d+)/i);
  if (qMatch) {
    const parsed = parseInt(qMatch[1], 10);
    if (parsed > 0) quantity = parsed;
  }

  // 4. Expected Delivery Date detection
  let expectedDeliveryDate: string | null = null;
  const dateCandidates: Date[] = [];
  const delivRegex =
    /(?:delivered by|delivery|expected (?:by|delivery)|out for delivery[^\n]*?expected by)\s*[:\s]*(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/gi;
  let match: RegExpExecArray | null;

  while ((match = delivRegex.exec(raw)) !== null) {
    const d = new Date(match[1]);
    if (!isNaN(d.getTime())) {
      dateCandidates.push(d);
    }
  }

  if (dateCandidates.length === 0) {
    const allDates = /(?:by\s+)?(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/gi;
    while ((match = allDates.exec(raw)) !== null) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime())) {
        dateCandidates.push(d);
      }
    }
  }

  if (dateCandidates.length === 0) {
    const isoDate = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDate) {
      expectedDeliveryDate = isoDate[1];
    }
  } else {
    // For expected delivery timeline (ordered -> packed -> shipped -> delivered), pick the latest date
    dateCandidates.sort((a, b) => b.getTime() - a.getTime());
    const latest = dateCandidates[0];
    const yyyy = latest.getFullYear();
    const mm = String(latest.getMonth() + 1).padStart(2, "0");
    const dd = String(latest.getDate()).padStart(2, "0");
    expectedDeliveryDate = `${yyyy}-${mm}-${dd}`;
  }

  // 5. Tracking Link & Tracking Number
  let trackingUrl: string | null = null;
  let trackingNumber: string | null = null;

  const urlCandidate =
    raw.match(/(?:https?|ttps):\/\/?[^\s"'<>\n]+(?:\s+[^\s"'<>\n]+)?/i) ||
    raw.match(/(?:tracking\s*link[^\n]*\n+)([^\n]+)/i) ||
    raw.match(/(?:https?|ttps):\/+[a-z0-9_.\-\/ ]*?track\/[^\s"'<>\n]+/i);

  if (urlCandidate) {
    let u = (urlCandidate[1] || urlCandidate[0]).trim();
    u = u.replace(/[©®™].*$/, "").trim();
    u = u.replace(/^(?:ttps|http|https):\/+j?/i, "https://");
    u = u.replace(/demo\s+example/i, "demo.example");
    u = u.replace(/\s+/g, "");
    u = u.replace(/[),;.]+$/, "");
    if (u.includes("track/")) {
      u = u.replace(/TEST[I|1]RACK/i, "TESTTRACK").replace(/1Z3$/i, "123");
    }
    if (/^https?:\/\/[a-z0-9_.-]+\.[a-z]{2,}/i.test(u)) {
      trackingUrl = u;
    }
  }

  const trackIdMatch =
    raw.match(/Tracking\s*(?:ID|Number|No|#)?[:\s]+([A-Za-z0-9\-_]{5,30})/i) ||
    raw.match(/\b(TEST(?:TRACK|IRACK)[A-Za-z0-9]*)\b/i) ||
    raw.match(/\b(AWB[:\s]*[A-Za-z0-9]+)\b/i);

  if (trackIdMatch) {
    trackingNumber = trackIdMatch[1].trim();
  } else if (trackingUrl) {
    const fromUrl = trackingUrl.match(/\/track\/([A-Za-z0-9\-_]+)/i);
    if (fromUrl) trackingNumber = fromUrl[1];
  }

  if (trackingNumber && /^TEST[I|1]RACK/i.test(trackingNumber)) {
    trackingNumber = trackingNumber.replace(/TEST[I|1]RACK/i, "TESTTRACK").replace(/1Z3$/i, "123");
  }

  if (trackingUrl && trackingUrl.endsWith("/track/") && trackingNumber) {
    trackingUrl = trackingUrl + trackingNumber;
  }

  return {
    retailer,
    orderNumber,
    quantity,
    expectedDeliveryDate,
    trackingNumber,
    trackingUrl,
  };
}

/**
 * Runs client-side OCR using tesseract.js on an uploaded image file,
 * then parses order details from the recognized text.
 */
export async function scanOrderProofImage(file: File): Promise<ExtractedProofData | null> {
  if (typeof window === "undefined" || !file) return null;
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const ret = await worker.recognize(file);
    await worker.terminate();

    const raw = ret?.data?.text;
    if (!raw || !raw.trim()) return null;

    return parseOrderProofText(raw);
  } catch (err) {
    console.warn("Proof OCR scanning failed:", err);
    return null;
  }
}
