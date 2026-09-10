import { redirect } from "next/navigation";

/**
 * NGO Home has been consolidated to the root "/" route.
 * Any direct navigation to /dashboard/ngo redirects to "/".
 */
export default function NgoDashboardPage() {
  redirect("/");
}
