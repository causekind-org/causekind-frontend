import { redirect } from "next/navigation";

/**
 * Consolidated NGO profile destination:
 * The NGO profile and registration wizard now lives at /profile.
 * This route redirects to /profile.
 */
export default function NgoProfilePage() {
  redirect("/profile");
}
