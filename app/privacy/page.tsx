import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PRIVACY_VERSION } from "@/lib/consultation-intake";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
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
        <aside className={styles.draft}>
          Initial website notice. Our legal company details, dedicated privacy
          contact and detailed retention schedule are being finalised. This
          notice will be updated as those details are confirmed.
        </aside>
        <section>
          <h2>1. Information you choose to share</h2>
          <p>
            When you contact Sol &amp; Tide Energy or request an assessment, you
            may provide your name, email address, phone number, country,
            property address or map location, electricity needs, bill
            information, messages and photos. Please share only what is relevant
            to your enquiry and avoid account numbers, identity documents or
            other unnecessary sensitive information.
          </p>
        </section>
        <section>
          <h2>2. How your information is used</h2>
          <p>
            We use your enquiry information to understand your requirements,
            prepare an initial assessment, respond to questions and discuss
            suitable next steps. The consultation form also includes your
            selected service country and the version and time of your privacy
            acknowledgement. This acknowledgement is not a marketing
            subscription.
          </p>
        </section>
        <section>
          <h2>3. Services involved in your visit</h2>
          <p>
            Google Maps supports property searches and map selection, and Tally
            hosts the assessment details form. Website hosting, security and
            data-storage providers also process information needed to operate
            the site. Loading external services, fonts or images can disclose
            technical information such as your IP address and browser details to
            their providers.
          </p>
          <p>
            In the consultation flow, the map loads after the introductory step
            and Tally loads when you open the details form. Providers may
            process data outside your country and have their own privacy
            practices. A complete provider and transfer review is pending.
          </p>
          <p>
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google privacy information
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
            We store your selected installation location in this browser’s local
            storage to show relevant equipment information, electricity
            estimates and assessment location. You can change it in the header
            or footer, or remove it by clearing site data.
          </p>
          <p>
            Site features and third-party services may use cookies or similar
            browser technologies. We are reviewing their use and do not
            currently offer a verified site-wide cookie preference manager. Your
            browser provides controls for cookies and stored site data; changing
            these settings may affect embedded services.
          </p>
          <p>
            The Cookie Preferences interface is currently a design demonstration
            only. It does not change tracking, network requests or third-party
            behaviour. Only dismissal of the notice is remembered for the
            current browser tab; consent preferences are not saved or applied.
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
            <Link href="/#contact-us" prefetch={false}>
              Contact us form
            </Link>{" "}
            to ask about information you have submitted or request a correction
            or deletion. Include the email address used for the enquiry, without
            sending identity documents. Requests may require verification before
            action. Our dedicated privacy contact and legal company identity
            will be added once confirmed; example contact details elsewhere on
            the site should not be used for privacy requests.
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
        <Link className={styles.back} href="/consultation" prefetch={false}>
          Start your assessment →
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
