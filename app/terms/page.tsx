import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/site";

// Draft, pending legal review (see docs/LEGAL-REVIEW.md).
export const metadata: Metadata = { title: `Terms | ${site.name}` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="October 21, 2026">
      <p>These terms cover using {site.name}, as a business or as a customer with a card. By using it you agree to them.</p>
      <h2>For businesses</h2>
      <ul>
        <li>The plan is $49/month per location (plus $15/month for each extra location), billed monthly. No setup fee.</li>
        <li>You can cancel anytime; service continues to the end of the paid month.</li>
        <li>You own your customer data. You&apos;re responsible for the offers you send and the rewards you promise.</li>
        <li>Send offers your customers would want. Don&apos;t use cards for anything unlawful or misleading.</li>
      </ul>
      <h2>For customers</h2>
      <ul>
        <li>Your card is run by the business that gave it to you. Rewards and offers are theirs to set and honor.</li>
        <li>You can turn off notifications or remove the card anytime.</li>
        <li>
          See the <a href="/privacy">privacy page</a> for what we collect and how to have it deleted.
        </li>
      </ul>
      <h2>The service</h2>
      <p>
        We work hard to keep {site.name} running and your data safe, but the service is provided as is. We may update these
        terms; if a change matters, we&apos;ll tell business owners by email first.
      </p>
      <h2>Contact</h2>
      <p>
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
    </LegalPage>
  );
}
