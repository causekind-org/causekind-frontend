import { redirect } from "next/navigation";

/**
 * Dedicated NGO profile-completion wizard destination:
 * The 6-step registration wizard now lives at /profile/ngo-details.
 * This legacy route redirects to /profile/ngo-details.
 */
export default function NgoCompleteProfilePage() {
  redirect("/profile/ngo-details");
}
