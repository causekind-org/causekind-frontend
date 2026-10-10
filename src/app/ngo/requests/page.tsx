import { redirect } from "next/navigation";

/**
 * Legacy NGO request list. NGOs only have drives now, so this route redirects
 * to the live drives on the NGO dashboard.
 */
export default function NgoRequestsPage() {
  redirect("/dashboard/ngo#live-drives");
}
