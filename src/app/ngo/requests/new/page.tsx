import { redirect } from "next/navigation";

/**
 * Legacy NGO request form. NGOs now post drives, so this route redirects to
 * the drive form at /ngo/drives/new.
 */
export default function NgoNewRequestPage() {
  redirect("/ngo/drives/new");
}
