import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/site";

// Draft, pending legal review (see docs/LEGAL-REVIEW.md).
export const metadata: Metadata = { title: `Privacy | ${site.name}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 21, 2026">
      <p>
        {site.name} runs rewards cards for local businesses. This page explains, in plain language, what we collect and what we
        do with it.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Customers</strong> who join a business&apos;s card: your first name and phone number, and the visits and rewards
          on your card.
        </li>
        <li>
          <strong>Business owners and staff</strong>: your email address and your business phone number, so you can sign in and
          we can reach you.
        </li>
        <li>Basic technical information needed to keep wallet cards up to date, such as the device token your wallet uses.</li>
      </ul>
      <h2>Who owns the data</h2>
      <p>
        Each business owns its customer data. We store and process it to run the business&apos;s rewards program, and we don&apos;t
        use it for anything else.
      </p>
      <h2>We never sell data</h2>
      <p>We don&apos;t sell or rent personal information, and we don&apos;t share it with advertisers.</p>
      <h2>Notifications</h2>
      <p>
        Businesses can send offers to their card. You can turn off notifications anytime from the card in Apple Wallet or Google
        Wallet, or remove the card entirely.
      </p>
      <h2>Deleting your information</h2>
      <p>
        Email <a href={`mailto:${site.email}`}>{site.email}</a> with the business name and your phone number and we&apos;ll delete
        your details. Business owners can ask us to delete their account and all of its data.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about privacy: <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </LegalPage>
  );
}
