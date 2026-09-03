import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — Pico Health",
  description: "What Pico Health collects, how it's used, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="September 3, 2026">
      <p>
        Pico Health is a health-tracking tool, which means you trust us with sensitive
        information. This policy explains, in plain language, what we collect, what we do with
        it, and the choices you have. The short version: <strong>your health data is used to
        provide the Service to you — your logs, your insights — and is never sold or used for
        advertising.</strong>
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> your name, email address, and password (or
          Google sign-in), and your chosen protocol and preferences.
        </li>
        <li>
          <strong>Health information you log:</strong> foods, meals and photos of meals,
          symptoms and their severity, supplements, medications, exposures, exercise, daily
          journal scores (sleep, energy, mood, stress, pain), notes, reintroduction trials,
          and messages you send the in-app assistant.
        </li>
        <li>
          <strong>Billing information:</strong> handled by Stripe. We store your subscription
          status and plan, never your card number.
        </li>
        <li>
          <strong>Technical information:</strong> logs, identifiers, and device/browser data
          needed to run the Service securely (for example, for sign-in and rate limiting).
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To provide the Service: storing your logs, computing your personal pattern insights, checking foods against your protocol.</li>
        <li>To process what you type, dictate, or photograph into structured entries using AI (see Section 3).</li>
        <li>To operate, secure, and improve the Service, and to respond when you contact us.</li>
        <li>To bill subscriptions, when you subscribe.</li>
      </ul>
      <p>
        We do not sell your personal information. We do not share it with advertisers. Your
        individual health data is not shared with anyone else — including practitioners —
        unless and until you explicitly choose to share it through a feature built for that
        purpose.
      </p>

      <h2>3. AI processing</h2>
      <p>
        When you use capture or chat, the content you submit (text, and photos of meals) is
        sent to our AI provider — Anthropic — to be turned into structured entries or
        assistant responses. Under Anthropic&rsquo;s commercial API terms, that content is{" "}
        <strong>not used to train their models</strong>; it may be retained briefly for
        trust-and-safety monitoring and is then deleted. We send only the content itself —
        never your name, email, or account identity alongside it. Even so, don&rsquo;t
        include things in chat or meal photos that you wouldn&rsquo;t want processed (for
        example, other people&rsquo;s faces or documents in the background of a photo).
      </p>

      <h2>4. Who processes data on our behalf</h2>
      <p>We use a small set of service providers to run Pico Health:</p>
      <ul>
        <li><strong>Vercel</strong> — application hosting</li>
        <li><strong>Supabase</strong> — database and authentication</li>
        <li><strong>Anthropic</strong> — AI processing (Section 3)</li>
        <li><strong>Stripe</strong> — payments</li>
        <li><strong>Upstash</strong> — rate limiting (technical identifiers only)</li>
      </ul>
      <p>
        Food searches may query the USDA FoodData Central public database; those queries
        contain the food term, not your identity.
      </p>

      <h2>5. Research</h2>
      <p>
        Today, your data is not used for research. In the future we may offer an{" "}
        <strong>opt-in</strong> program to contribute de-identified data to chronic-illness
        research. If we do, it will be a separate, explicit choice — clearly explained, off by
        default, and revocable — and only de-identified data would ever be included.
      </p>

      <h2>6. Security and retention</h2>
      <p>
        Your data is encrypted in transit and at rest by our infrastructure providers, and
        access is restricted by authentication on every request. We keep your data for as long
        as your account exists so your history and insights keep working. When your account is
        deleted, your data is removed from our live systems within 30 days (residual copies in
        encrypted backups age out on the backup schedule).
      </p>

      <h2>7. Your choices and rights</h2>
      <ul>
        <li><strong>Access &amp; export:</strong> download your complete log history from the Service (CSV) at any time.</li>
        <li><strong>Correction:</strong> every entry can be edited or deleted in the app.</li>
        <li>
          <strong>Deletion:</strong> email{" "}
          <a href="mailto:support@picohealth.app">support@picohealth.app</a> from your account
          email and we will delete your account and data as described in Section 6.
        </li>
        <li>
          Depending on where you live, you may have additional legal rights over your personal
          information (such as under GDPR or the CCPA). Contact us and we will honor the
          rights that apply to you.
        </li>
      </ul>

      <h2>8. Children</h2>
      <p>
        The Service is for adults. It is not directed to anyone under 18, and we do not
        knowingly collect data from children. If you believe a minor has created an account,
        contact us and we will delete it.
      </p>

      <h2>9. Changes</h2>
      <p>
        If we change this policy in a material way, we will notify you in the app or by email
        before the change takes effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Pico Health is operated by Health Bean LLC. Privacy questions or requests:{" "}
        <a href="mailto:support@picohealth.app">support@picohealth.app</a>.
      </p>
    </LegalShell>
  );
}
