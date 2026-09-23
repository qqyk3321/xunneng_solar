import type { Metadata } from "next";
import { RegionalContactLink } from "@/components/regional-contact-link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PRIVACY_VERSION } from "@/lib/consultation-intake";
import styles from "./privacy.module.css";
import { siteUrl } from "@/lib/region-seo";
import { RegionalSupportLink } from "@/components/support-email";

export const metadata: Metadata = {
  alternates: { canonical: siteUrl("/privacy") },
  title: "Privacy Policy | Sol & Tide Energy",
  description:
    "How information shared through our website is used to handle solar enquiries.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <p className={styles.eyebrow}>YOUR INFORMATION, HANDLED WITH CARE</p>
        <h1>Privacy policy</h1>
        <p className={styles.intro}>
          A clear view of the information you share and the services that help
          us respond.
        </p>
        <p className={styles.version}>
          Last updated: 13 September 2026 · Version {PRIVACY_VERSION}
        </p>
        <section>
          <h2>1. Information you choose to share</h2>
          <p>
            When you contact Sol &amp; Tide Energy or request an assessment, you
            may provide your name, email address, phone number, country,
            property address, electricity needs, bill information, messages and
            photos. Please share only what is relevant to your enquiry and avoid
            account numbers, identity documents or other unnecessary sensitive
            information.
          </p>
        </section>
        <section>
          <h2>2. How your information is used</h2>
          <p>
            We use your enquiry information to understand your requirements,
            prepare an initial assessment, respond to questions and discuss
            suitable next steps. The consultation form also includes your
            selected service country. The introductory privacy acknowledgement
            is not a marketing subscription.
          </p>
          <p>
            If you request island launch updates, we store your email address,
            chosen island or territory and request date so we can notify you
            when service becomes available there. This does not subscribe you
            to unrelated marketing. You can contact our regional support team
            to withdraw the request or ask for deletion.
          </p>
        </section>
        <section>
          <h2>3. Services involved in your visit</h2>
          <p>
            Tally hosts the assessment details form. Website hosting, security
            and data-storage providers also process information needed to
            operate the site. Loading external services, fonts or images can
            disclose technical information such as your IP address and browser
            details to their providers.
          </p>
          <p>
            In the consultation flow, Tally loads when you open the details form
            after the privacy acknowledgement. Providers may process data
            outside your country and have their own privacy practices. A
            complete provider and transfer review is pending.
          </p>
          <p>
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google privacy information (fonts and images)
            </a>{" "}
            ·{" "}
            <a
              href="https://tally.so/help/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tally privacy information
            </a>
          </p>
        </section>
        <section id="cookies">
          <h2>4. Cookies and browser storage</h2>
          <p>
            Your selected installation location is included in the page address,
            not saved as a browser storage preference. It determines the equipment
            information, electricity estimates and assessment location shown.
            Your location is also included when you send a question. You can
            switch locations using the header or footer.
          </p>
          <p>
            Site features and third-party services may use cookies or similar
            browser technologies. We are reviewing their use and do not
            currently offer a verified site-wide cookie preference manager. Your
            browser provides controls for cookies and stored site data; changing
            these settings may affect embedded services.
          </p>
          <p>
            The Cookie Preferences interface remembers your selection in this
            browser using local storage, with a first-party preference cookie
            as a fallback. Local storage has no application-set expiry; the
            fallback cookie lasts up to 400 days and is renewed on visits.
            Neither contains a tracking identifier. You can change your choice
            using the footer link. Clearing browser data or using a different
            browser can show the notice again. These controls do not yet change
            analytics, marketing requests or third-party behaviour.
          </p>
        </section>
        <section>
          <h2>5. Retention and security</h2>
          <p>
            Submitted enquiries are stored for handling and follow-up. A fixed
            retention period and automated deletion schedule have not yet been
            established. We use technical access controls for stored enquiry
            data, but no online service can promise absolute security. Please do
            not send highly sensitive material through these forms.
          </p>
        </section>
        <section>
          <h2>6. Questions about your information</h2>
          <p>
            You can use our{" "}
            <RegionalContactLink />{" "}
            to ask about information you have submitted or request a correction
            or deletion. Include the email address used for the enquiry, without
            sending identity documents. For regional support: <RegionalSupportLink />.
            Requests may require verification before action. Our legal company
            identity will be added once confirmed.
          </p>
        </section>
        <section>
          <h2>7. Updates to this notice</h2>
          <p>
            We may update this notice as our services, providers and privacy
            arrangements develop. The date and version above identify the notice
            available when you start your consultation.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
