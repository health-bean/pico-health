import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — Pico Health",
  description: "The terms that govern your use of Pico Health.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="September 3, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Pico Health — the
        website at picohealth.app and the Pico Health mobile applications (together, the
        &ldquo;Service&rdquo;), operated by Pico Health (&ldquo;we,&rdquo; &ldquo;us&rdquo;).
        By creating an account or using the Service, you agree to these Terms. If you do not
        agree, do not use the Service.
      </p>

      <h2>1. Pico Health is not medical advice</h2>
      <p>
        <strong>
          The Service is an informational tracking tool, not a medical device, and nothing in
          it is medical advice, diagnosis, or treatment.
        </strong>{" "}
        Pico Health helps you record what you eat, how you feel, and other lifestyle factors,
        and shows you statistical observations about patterns in <em>your own logged data</em>.
        Those observations are correlations, not clinical conclusions. Food property
        information (such as histamine, oxalate, or FODMAP ratings) is compiled from published
        reference frameworks and may be incomplete, imprecise, or wrong for your situation.
      </p>
      <ul>
        <li>
          Always consult a qualified health professional before making changes to your diet,
          supplements, medications, or treatment based on anything you see in the Service.
        </li>
        <li>
          Never disregard professional medical advice, or delay seeking it, because of
          something the Service showed you.
        </li>
        <li>
          The Service is not for emergencies. If you think you are experiencing a medical
          emergency, call your local emergency number immediately.
        </li>
      </ul>

      <h2>2. Eligibility and your account</h2>
      <p>
        You must be at least 18 years old to use the Service. You are responsible for the
        accuracy of the information you provide, for keeping your login credentials secure,
        and for all activity under your account. Tell us promptly at{" "}
        <a href="mailto:support@picohealth.app">support@picohealth.app</a> if you believe your
        account has been compromised.
      </p>

      <h2>3. Your data is yours</h2>
      <p>
        You own the health information you log in Pico Health. We use it to provide the
        Service to you as described in our <a href="/privacy">Privacy Policy</a> — including
        generating your personal insights — and for nothing else without your explicit
        consent. You can export your data at any time from within the Service, and you can
        request deletion of your account and data by emailing{" "}
        <a href="mailto:support@picohealth.app">support@picohealth.app</a>.
      </p>

      <h2>4. AI features</h2>
      <p>
        Parts of the Service use artificial intelligence — for example, turning a typed
        sentence or a photo of a meal into structured log entries, and the in-app chat
        assistant. AI output can be inaccurate: extracted entries may mislabel a food, and the
        assistant may make mistakes. Review what the Service records (every entry can be
        corrected or deleted), and treat AI responses with the same caution as any other
        informational content under Section 1.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for anyone&rsquo;s medical care other than your own self-tracking;</li>
        <li>probe, disrupt, overload, or attempt to gain unauthorized access to the Service or other users&rsquo; data;</li>
        <li>scrape, bulk-export, resell, or redistribute the Service&rsquo;s food and reference databases;</li>
        <li>use the Service to violate any law or the rights of others.</li>
      </ul>

      <h2>6. Subscriptions</h2>
      <p>
        Parts of the Service may be offered under paid subscription plans. Prices and included
        features will be shown before you subscribe. Payments are processed by Stripe; we do
        not store your card details. Subscriptions renew automatically until cancelled, and
        you can cancel any time from Settings, effective at the end of the current billing
        period. Except where required by law, payments are non-refundable.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Service — including its software, design, curated food and protocol databases, and
        content other than your own data — belongs to Pico Health or its licensors. We grant
        you a personal, non-transferable, revocable license to use the Service for your own
        health tracking. Feedback you send us may be used to improve the Service without
        obligation to you.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the Service and request account deletion at any time. We may
        suspend or terminate accounts that violate these Terms or create risk for the Service
        or other users; where practical, we will give you an opportunity to export your data
        first.
      </p>

      <h2>9. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
        warranties of any kind, express or implied, including fitness for a particular purpose
        and accuracy of information. To the maximum extent permitted by law, Pico Health will
        not be liable for indirect, incidental, special, consequential, or exemplary damages,
        or for decisions you make based on information in the Service; our total liability for
        any claim relating to the Service is limited to the greater of $50 or the amount you
        paid us in the twelve months before the claim. Some jurisdictions do not allow certain
        limitations, so parts of this section may not apply to you.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms as the Service evolves. If a change is material, we will
        notify you in the app or by email before it takes effect. Continuing to use the
        Service after a change takes effect means you accept the updated Terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:support@picohealth.app">support@picohealth.app</a>.
      </p>
    </LegalShell>
  );
}
