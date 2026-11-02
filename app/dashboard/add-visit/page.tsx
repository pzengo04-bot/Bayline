import { redirect } from "next/navigation";

// Adding visits moved to Scan (and the customer profile).
export default function AddVisitPage() {
  redirect("/dashboard/scan");
}
