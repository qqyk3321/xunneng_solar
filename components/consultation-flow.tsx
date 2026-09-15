"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSiteRegion, RegionFlag } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import { BrandMark } from "./brand-mark";
import type { ServiceCountry } from "@/lib/consultation-intake";
import {
  buildTallyIntakeUrl,
  isTallySubmissionMessage,
} from "@/lib/tally-intake";
import styles from "./consultation-flow.module.css";

const FORM_ID = process.env.NEXT_PUBLIC_TALLY_INTAKE_FORM_ID?.trim();
const COUNTRY_NAMES = { AG: "Antigua and Barbuda", DM: "Dominica" } as const;
type Step = "intake" | "form" | "thanks";
const STEPS = [
  ["intake", "Privacy"],
  ["form", "Your details"],
  ["thanks", "Complete"],
] as const;

export function ConsultationFlow() {
  const { country } = useSiteRegion();
  if (!country) return null;
  return <ConsultationForRegion key={country} country={country} />;
}

function ConsultationForRegion({ country }: { country: ServiceCountry }) {
  const [step, setStep] = useState<Step>("intake");
  const [accepted, setAccepted] = useState(false);
  const currentStepIndex = STEPS.findIndex(([id]) => id === step);
  return (
    <div className="tailwind-scope">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(151,240,255,0.48),transparent_30%),linear-gradient(180deg,#f2f3ff_0%,#faf8ff_42%,#eaedff_100%)] px-margin-mobile py-space-xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-2xl">
        <section
          className="mx-auto max-w-[1100px]"
          aria-label="Consultation details"
        >
          <Link
            href={regionPath(country)}
            prefetch={false}
            className={styles.brand}
            aria-label="Sol & Tide Energy home"
          >
            <BrandMark />
            <span>
              Sol<span className={styles.ampersand}>&</span>Tide
            </span>
            <small>Energy</small>
          </Link>
          <header className="mb-space-xl flex flex-col gap-space-lg">
            <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              Start your assessment
              <span className={styles.regionBadge}>
                <RegionFlag country={country} />
                {COUNTRY_NAMES[country]}
              </span>
            </h1>
            <ol className={styles.steps} aria-label="Progress">
              {STEPS.map(([id, label], i) => (
                <li
                  key={id}
                  aria-current={step === id ? "step" : undefined}
                  className={styles.step}
                  data-state={
                    i < currentStepIndex
                      ? "completed"
                      : i === currentStepIndex
                        ? "current"
                        : "upcoming"
                  }
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {i < currentStepIndex ? "✓" : i + 1}
                  </span>
                  <span>{label}</span>
                  <span className="sr-only">
                    {i < currentStepIndex
                      ? " — completed"
                      : i === currentStepIndex
                        ? " — current step"
                        : " — upcoming"}
                  </span>
                </li>
              ))}
            </ol>
          </header>
          {step === "intake" && (
            <form
              className={styles.intake}
              onSubmit={(event) => {
                event.preventDefault();
                if (accepted) setStep("form");
              }}
            >
              <h2>Let’s plan your home energy.</h2>
              <div className={styles.notice}>
                <h3>Before we begin</h3>
                <p>
                  We’ll use your contact details, installation address and the
                  information you share to assess your needs and respond to your
                  enquiry. Your details will be collected using Tally.
                </p>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={accepted}
                    required
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  <span>
                    I have read the{" "}
                    <Link
                      href={regionPath(country, "/privacy")}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy (opens in a new tab)
                    </Link>{" "}
                    and understand how my information will be used to handle
                    this enquiry.
                  </span>
                </label>
              </div>
              <button
                className={styles.continueButton}
                type="submit"
                disabled={!accepted}
              >
                Continue to assessment
              </button>
              <p className={styles.small}>
                An assessment is a starting point, not a final quote. Refreshing
                this page restarts the assessment.
              </p>
            </form>
          )}
          {step === "form" && (
            <FormStep country={country} onSubmitted={() => setStep("thanks")} />
          )}
          {step === "thanks" && (
            <section className={styles.intake} role="status" aria-live="polite">
              <h2>Thank you for your enquiry.</h2>
              <p>
                Your form has been submitted. Our team will review your details
                and aim to reply within 48 hours using the contact information
                you provided.
              </p>
              <Link
                className={styles.continueButton}
                href={regionPath(country)}
              >
                Back to home
              </Link>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

function FormStep({
  country,
  onSubmitted,
}: {
  country: ServiceCountry;
  onSubmitted: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const url = FORM_ID ? buildTallyIntakeUrl(FORM_ID, country) : null;
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        FORM_ID &&
        event.source === frame.current?.contentWindow &&
        isTallySubmissionMessage(event.origin, event.data, FORM_ID)
      )
        onSubmitted();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onSubmitted]);
  return (
    <section className={styles.intake}>
      {url ? (
        <>
          <Script
            src="https://tally.so/widgets/embed.js"
            strategy="afterInteractive"
          />
          <iframe
            ref={frame}
            className="block min-h-[720px] w-full border-0"
            src={url}
            data-tally-src={url}
            height="720"
            width="100%"
            title="Assessment details form"
          />
        </>
      ) : (
        <div role="status">
          <h2>Our updated assessment form is being prepared.</h2>
          <p>
            Please use{" "}
            <Link href={`${regionPath(country)}#contact-us`}>Contact us</Link>{" "}
            to get in touch in the meantime.
          </p>
        </div>
      )}
    </section>
  );
}
