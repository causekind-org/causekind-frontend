import { redirect } from "next/navigation";

/**
 * There is no separate drives index: live NGO drives are listed on the home page.
 * Without this, a donor who trimmed the id off /drives/7 hit a 404.
 */
export default function DrivesIndexPage() {
  redirect("/#ngo-drives-section");
}
