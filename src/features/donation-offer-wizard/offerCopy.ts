import { useUiText } from "@/components/UiText";

/**
 * Display text for the fixed option labels, declarations and group titles in
 * offerModel.ts. Those constants stay English because they are also stored
 * values (condition, age range) and are read by admin screens; screens in the
 * offer flow show them through this lookup instead. Unknown text is returned
 * unchanged.
 */
export function useOfferCopy(): (text: string | null | undefined) => string {
  const ui = useUiText();
  const map = new Map<string, string>([
    ["Within 3 days", ui("Within 3 days")],
    ["Within a week", ui("Within a week")],
    ["Within 2 weeks", ui("Within 2 weeks")],
    ["Unused", ui("Unused")],
    ["Like New", ui("Like New")],
    ["Good", ui("Good")],
    ["Fair", ui("Fair")],
    ["Needs Minor Repair", ui("Needs Minor Repair")],
    ["Not Working", ui("Not Working")],
    ["Less than 1 year", ui("Less than 1 year")],
    ["1–3 years", ui("1–3 years")],
    ["3–5 years", ui("3–5 years")],
    ["5–10 years", ui("5–10 years")],
    ["10+ years", ui("10+ years")],
    ["Unknown", ui("Unknown")],
    ["I'll pay for delivery", ui("I'll pay for delivery")],
    ["The recipient pays", ui("The recipient pays")],
    ["We'll share the cost", ui("We'll share the cost")],
    ["I own this item or am authorised to donate it.", ui("I own this item or am authorised to donate it.")],
    ["The photographs are recent and genuine.", ui("The photographs are recent and genuine.")],
    ["The item details and condition are accurate.", ui("The item details and condition are accurate.")],
    ["I have disclosed all known defects.", ui("I have disclosed all known defects.")],
    ["I will not request payment for the donated item.", ui("I will not request payment for the donated item.")],
    ["I understand that the donation is subject to donee and admin approval.", ui("I understand that the donation is subject to donee and admin approval.")],
    ["I agree to follow the CauseKind handover process.", ui("I agree to follow the CauseKind handover process.")],
    ["I will buy this item myself, with my own money.", ui("I will buy this item myself, with my own money.")],
    ["I will not buy anything until the offer shows as ready to buy.", ui("I will not buy anything until the offer shows as ready to buy.")],
    ["The brand, model and cost above are my honest expectation.", ui("The brand, model and cost above are my honest expectation.")],
    ["Once bought, I will upload a real photo of the item for review.", ui("Once bought, I will upload a real photo of the item for review.")],
    ["I will not request payment or reimbursement for the item.", ui("I will not request payment or reimbursement for the item.")],
    ["I understand that if I do not buy it in time, the reserved quantity is released.", ui("I understand that if I do not buy it in time, the reserved quantity is released.")],
    ["I agree to follow the CauseKind handover process, including the handover code.", ui("I agree to follow the CauseKind handover process, including the handover code.")],
    ["I will only place a prepaid order — the recipient never pays on delivery.", ui("I will only place a prepaid order — the recipient never pays on delivery.")],
    ["I will use the recipient's address only for this order and share it with no one else.", ui("I will use the recipient's address only for this order and share it with no one else.")],
    ["I will upload the order confirmation with payment details hidden.", ui("I will upload the order confirmation with payment details hidden.")],
    ["I understand the donation completes only when the recipient confirms receipt.", ui("I understand the donation completes only when the recipient confirms receipt.")],
    ["I understand that if I do not order in time, the reserved quantity is released.", ui("I understand that if I do not order in time, the reserved quantity is released.")],
    ["Buy and hand over", ui("Buy and hand over")],
    ["Buy it yourself, then hand it over in person with the usual handover code.", ui("Buy it yourself, then hand it over in person with the usual handover code.")],
    ["Buy and deliver directly", ui("Buy and deliver directly")],
    ["Order it online, prepaid, and ship it to the address the recipient shares after accepting.", ui("Order it online, prepaid, and ship it to the address the recipient shares after accepting.")],
    ["Method not chosen", ui("Method not chosen")],
    ["Ownership & accuracy", ui("Ownership & accuracy")],
    ["Disclosure & conduct", ui("Disclosure & conduct")],
    ["Approval & process", ui("Approval & process")],
    ["none", ui("none")],
  ]);
  return (text) => (text ? map.get(text) ?? text : "");
}
