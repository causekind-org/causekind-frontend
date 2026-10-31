import { describe, expect, it } from "vitest";
import { parseOrderProofText } from "./proofOcr";

describe("parseOrderProofText", () => {
  it("extracts details from demo electronics order confirmation text", () => {
    const raw = `
      Demo Electronics
      Your order has been confirmed!
      (+) TEST-ORD-2026-10482
      Thank you for shopping with Demo Electronics. Your order has been successfully placed.
      Order Confirmed 21 Oct 2026
      Packed Expected by 23 Oct 2026
      Shipped Expected by 24 Oct 2026
      Out for Delivery Expected by 25 Oct 2026
      Samsung Galaxy A35 5G
      Quantity: 1
      Expected Delivery 25 Oct 2026
      Your item is expected to be delivered by 25 Oct 2026.
      Tracking ID TESTTRACK123
      Tracking Link https://demo.example/track/TESTTRACK123
    `;

    const result = parseOrderProofText(raw);

    expect(result.retailer).toBe("Demo Electronics");
    expect(result.orderNumber).toBe("TEST-ORD-2026-10482");
    expect(result.quantity).toBe(1);
    expect(result.expectedDeliveryDate).toBe("2026-10-25");
    expect(result.trackingNumber).toBe("TESTTRACK123");
    expect(result.trackingUrl).toBe("https://demo.example/track/TESTTRACK123");
  });

  it("extracts details from Amazon invoice text", () => {
    const raw = `
      Amazon.in Order Confirmation
      Order # 402-1234567-8901234
      Arriving Monday, 28 Oct 2026
      Quantity: 2
      Tracking ID: DEL987654321
      https://www.delhivery.com/track/package/DEL987654321
    `;

    const result = parseOrderProofText(raw);

    expect(result.retailer).toBe("Amazon");
    expect(result.orderNumber).toBe("402-1234567-8901234");
    expect(result.quantity).toBe(2);
    expect(result.expectedDeliveryDate).toBe("2026-10-28");
    expect(result.trackingNumber).toBe("DEL987654321");
    expect(result.trackingUrl).toBe("https://www.delhivery.com/track/package/DEL987654321");
  });

  it("extracts details from Flipkart invoice text", () => {
    const raw = `
      Flipkart
      Order ID: OD123456789012345678
      Delivery by 30 Oct 2026
      Sold by: RetailNet
      Quantity: 1
    `;

    const result = parseOrderProofText(raw);

    expect(result.retailer).toBe("Flipkart");
    expect(result.orderNumber).toBe("OD123456789012345678");
    expect(result.quantity).toBe(1);
    expect(result.expectedDeliveryDate).toBe("2026-10-30");
  });
});
