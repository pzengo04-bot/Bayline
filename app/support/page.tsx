import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: `Support | ${site.name}` };

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <p>
        Questions? Email <a href={`mailto:${site.email}`}>{site.email}</a>. A real person answers, usually the same day.
      </p>
      <h2>For customers with a card</h2>
      <ul>
        <li>To stop notifications, open the card in your wallet and turn them off in its details.</li>
        <li>To remove the card, delete it from Apple Wallet or Google Wallet.</li>
        <li>To have your details deleted, email us with the business name and your phone number.</li>
      </ul>
      <h2>For businesses</h2>
      <p>Sign in to your dashboard from <a href="/login">Venue login</a>, or email us and we&apos;ll help you set up.</p>
    </LegalPage>
  );
}
