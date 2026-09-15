"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSiteRegion, RegionFlag } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import { SUPPORT_EMAILS } from "@/lib/site-contact";
import { BrandMark } from "./brand-mark";
import { HomeContact } from "./home-contact";
import type { ServiceCountry } from "@/lib/consultation-intake";
import {
  buildTallyIntakeUrl,
  isTallySubmissionMessage,
  isTallyFormEvent,
} from "@/lib/tally-intake";
import styles from "./consultation-flow.module.css";

const FORM_ID = process.env.NEXT_PUBLIC_TALLY_INTAKE_FORM_ID?.trim();
const COUNTRY_NAMES = { AG: "Antigua and Barbuda", DM: "Dominica" } as const;
function initializeTallyEmbeds() {
  (
    window as Window & { Tally?: { loadEmbeds: () => void } }
  ).Tally?.loadEmbeds();
}
type Step = "intake" | "form" | "thanks";
const STEPS = [
  ["intake", "Privacy"],
  ["form", "Your details"],
  ["thanks", "Complete"],
] as const;

export function ConsultationFlow() {
  const { country } = useSiteRegion();
  if (!country) return null;
  return (
    <>
      <ConsultationForRegion key={country} country={country} />
      <HomeContact key={`question-${country}`} variant="floating" />
    </>
  );
}

function ConsultationForRegion({ country }: { country: ServiceCountry }) {
  const [step, setStep] = useState<Step>("intake");
  const [accepted, setAccepted] = useState(false);
  const currentStepIndex = STEPS.findIndex(([id]) => id === step);
  useEffect(() => {
    if (step !== "form") return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const destination = new URL(link.href, window.location.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (
        !window.confirm(
          "Leave this assessment? Your answers may be lost, and you may need to start again.",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
    };
  }, [step]);
  return (
    <div className="tailwind-scope">
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.topbar}>
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
            <div className={styles.headerLinks}>
              <span className={styles.regionBadge}>
                <RegionFlag country={country} />
                {COUNTRY_NAMES[country]}
              </span>
              <Link href={regionPath(country)} className={styles.homeLink}>
                Back to home <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <div className={styles.headingRow}>
            <h1>
              Start your assessment<span className={styles.titleDot}>.</span>
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
          </div>
        </header>
        <main className={styles.content} aria-label="Consultation details">
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
                      Privacy Policy
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
            </form>
          )}
          {step === "form" && (
            <FormStep country={country} onSubmitted={() => setStep("thanks")} />
          )}
          {step === "thanks" && <SubmissionComplete country={country} />}
        </main>
      </div>
    </div>
  );
}

function SubmissionComplete({ country }: { country: ServiceCountry }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return (
    <section
      className={styles.success}
      aria-labelledby="submission-complete-title"
    >
      <div className={styles.successMain}>
        <div className={styles.successSeal} aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="m9 16 5 5 10-10"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className={styles.successLabel}>SUBMISSION COMPLETE</p>
        <h2 id="submission-complete-title" ref={heading} tabIndex={-1}>
          Your enquiry has been submitted.
        </h2>
        <p className={styles.successIntro}>
          Thank you for sharing your plans with us. Our team will review your
          details and aim to respond <strong>within 48 hours.</strong> A
          confirmation email will arrive shortly — please check your spam folder
          if you don’t see it.
        </p>
        <Link className={styles.successHome} href={regionPath(country)}>
          Back to home <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className={styles.successHelp}>
        <h3>Have a question in the meantime?</h3>
        <p>
          Explore our <Link href={regionPath(country, "/faq")}>FAQ</Link> or get
          in touch with our team.
        </p>
        <a
          className={styles.successEmail}
          href={`mailto:${SUPPORT_EMAILS[country]}`}
        >
          {SUPPORT_EMAILS[country]}
        </a>
      </div>
    </section>
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
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const url = FORM_ID ? buildTallyIntakeUrl(FORM_ID, country) : null;
  useEffect(() => {
    // The widget may already be cached when navigating back or retrying.
    initializeTallyEmbeds();
  }, [attempt]);
  useEffect(() => {
    if (!url || !loading) return;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [url, loading, attempt]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!FORM_ID || event.source !== frame.current?.contentWindow) return;
      if (
        isTallyFormEvent(event.origin, event.data, FORM_ID, "Tally.FormLoaded")
      ) {
        setLoading(false);
        setSlow(false);
      }
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
    <section className={styles.formSection}>
      {url ? (
        <>
          <Script
            src="https://tally.so/widgets/embed.js"
            strategy="afterInteractive"
            onReady={initializeTallyEmbeds}
          />
          <div className={styles.formEmbed}>
            {loading && (
              <div className={slow ? styles.loadSlow : styles.loadPanel}>
                <div role="status" aria-live="polite">
                  {!slow && (
                    <span className={styles.loadSpinner} aria-hidden="true" />
                  )}
                  <h2>
                    {slow
                      ? "Taking a little longer…"
                      : "Loading your assessment…"}
                  </h2>
                  <p>
                    {slow
                      ? "If the questionnaire hasn’t appeared, please check your connection or try again."
                      : "We’re preparing your questionnaire. It will appear here shortly."}
                  </p>
                </div>
                {slow ? (
                  <>
                    <div className={styles.loadActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setLoading(true);
                          setSlow(false);
                          setAttempt((value) => value + 1);
                        }}
                      >
                        Reload questionnaire
                      </button>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Open questionnaire separately
                      </a>
                    </div>
                    <p className={styles.loadHint}>
                      Reloading or opening separately starts a new form. Any
                      answers already entered here will not carry over.
                    </p>
                  </>
                ) : (
                  <div className={styles.loadSkeleton} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            )}
            <iframe
              key={attempt}
              ref={frame}
              className={styles.questionnaire}
              data-pending={loading && !slow ? "true" : undefined}
              aria-hidden={(loading && !slow) || undefined}
              tabIndex={loading && !slow ? -1 : 0}
              src={url}
              height="720"
              width="100%"
              title="Assessment details form"
            />
          </div>
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
