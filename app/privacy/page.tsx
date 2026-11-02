import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/site";

// Draft, pending legal review (see docs/LEGAL-REVIEW.md).
export const metadata: Metadata = { title: `Privacy | ${site.name}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="November 2, 2026">
      <p>
        {site.name} runs rewards cards for local businesses. This page explains, in plain language, what we collect and what we
        do with it.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Customers</strong> who join a business&apos;s card: your first name, your phone number or email, your visits,
          stamps and rewards, whether you opted in to offers, and a random ID saved in your browser so the business&apos;s page
          recognizes you on your next tap.
        </li>
        <li>
          <strong>Business owners and staff</strong>: your email address and your business phone number, so you can sign in and
          we can reach you.
        </li>
        <li>Basic technical information needed to keep wallet cards up to date, such as the device token your wallet uses.</li>
      </ul>
      <h2>Signing back in</h2>
      <p>If your browser forgets you, we send a one-time code to confirm it&apos;s you before showing your card.</p>
      <h2>Location</h2>
      <p>
        Wallet cards may include the business&apos;s location so your phone can show the card when you&apos;re nearby. This happens
        on your phone. We do not receive or store your location.
      </p>
      <h2>Staff activity</h2>
      <p>
        We log stamps, redemptions and changes to cards, and which staff account made them, to prevent mistakes and misuse.
      </p>
      <h2>Who owns the data</h2>
      <p>
        Each business owns its customer data. We store and process it to run the business&apos;s rewards program, and we don&apos;t
        use it for anything else.
      </p>
      <h2>We never sell data</h2>
      <p>We don&apos;t sell or rent personal information, and we don&apos;t share it with advertisers.</p>
      <h2>Service providers</h2>
      <p>
        We use trusted providers to run {site.name}: hosting, our database, email and text delivery, Apple Wallet and Google
        Wallet. They only process data to provide the service.
      </p>
      <h2>Notifications</h2>
      <p>
        Businesses can send offers to their card. You can turn off notifications anytime from the card in Apple Wallet or Google
        Wallet, or remove the card entirely.
      </p>
      <h2>How long we keep it</h2>
      <p>
        We keep customer data while the business uses {site.name}. If a business cancels, we delete its data within 30 days,
        after giving them an export if they ask for one.
      </p>
      <h2>Security</h2>
      <p>Data is encrypted in transit, and access is limited to the people who need it.</p>
      <h2>Children</h2>
      <p>{site.name} isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their information.</p>
      <h2>Deleting your information</h2>
      <p>
        Email <a href={`mailto:${site.email}`}>{site.email}</a> with the business name and your phone number and we&apos;ll delete
        your details. Business owners can ask us to delete their account and all of its data.
      </p>
      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&apos;ll update the date above and tell businesses by email.</p>
      <h2>Contact</h2>
      <p>
        Questions about privacy: <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </LegalPage>
  );
}
