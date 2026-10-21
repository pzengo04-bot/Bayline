import { redirect } from "next/navigation";

// Reward settings moved into the Card designer.
export default function RewardsPage() {
  redirect("/dashboard/card");
}
