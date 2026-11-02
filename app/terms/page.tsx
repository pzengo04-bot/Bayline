import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/site";

// Draft, pending legal review (see docs/LEGAL-REVIEW.md).
export const metadata: Metadata = { title: `Terms | ${site.name}` };

// TODO: replace [STATE] with the governing-law state once confirmed.
const GOVERNING_STATE = "[STATE]";

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="November 2, 2026">
      <p>These terms cover using {site.name}, as a business or as a customer with a card. By using it you agree to them.</p>
      <h2>For businesses</h2>
      <ul>
        <li>
          Founding businesses get the first month free, with no setup fee. Nothing is charged automatically: after the free month,
          the price is the one we agree with you in writing.
        </li>
        <li>You own your customer data. You&apos;re responsible for the offers you send and the rewards you promise.</li>
        <li>If you change or end your rewards program, you honor the rewards your customers have already earned.</li>
        <li>Send offers your customers would want. Don&apos;t use cards for anything unlawful or misleading.</li>
      </ul>
      <h2>For customers</h2>
      <ul>
        <li>Your card is run by the business that gave it to you. Rewards and offers are theirs to set and honor.</li>
        <li>
          Rewards have no cash value and can&apos;t be transferred or sold. You can earn one stamp per card per day.
        </li>
        <li>Businesses may remove stamps or cards that were misused.</li>
        <li>You can turn off notifications or remove the card anytime.</li>
        <li>
          See the <a href="/privacy">privacy page</a> for what we collect and how to have it deleted.
        </li>
      </ul>
      <h2>Ending</h2>
      <p>
        Either side can end the service at any time. We may suspend accounts used to send unlawful or misleading messages.
      </p>
      <h2>The service</h2>
      <p>
        We work hard to keep {site.name} running and your data safe, but the service is provided as is. Our total liability is
        limited to what the business paid us in the last 3 months. We may update these terms; if a change matters, we&apos;ll
        tell business owners by email first.
      </p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of {GOVERNING_STATE}.</p>
      <h2>Contact</h2>
      <p>
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
    </LegalPage>
  );
}
