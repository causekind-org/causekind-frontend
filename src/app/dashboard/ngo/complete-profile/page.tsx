import { redirect } from "next/navigation";

/**
 * Consolidated NGO profile destination:
 * The 6-step registration wizard now lives exclusively at /dashboard/ngo/profile.
 * This route redirects to /dashboard/ngo/profile to prevent duplicate wizard instances.
 */
export default function NgoCompleteProfilePage() {
  redirect("/dashboard/ngo/profile");
}
