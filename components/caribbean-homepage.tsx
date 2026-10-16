"use client";
import { UPCOMING_ISLANDS, WISHLIST_ISLANDS } from "@/lib/upcoming-islands";

import Link from "next/link";
import dynamic from "next/dynamic";
import { PrivacyLink } from "./privacy-link";
import Image from "next/image";
import { ViewportImage } from "./viewport-image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SolarPackages } from "./solar-packages";
import { SolarPackageSelectionProvider } from "./solar-package-selection";
import { SiteFooter } from "./site-footer";
import { RegionFlag, useSiteRegion } from "./site-region";
import { SiteHeader } from "./site-header";
import { SectionAnchor } from "./section-anchor";
import styles from "./caribbean-homepage.module.css";

const IslandCoverageMap = dynamic(
  () => import("./island-coverage-map").then((module) => module.IslandCoverageMap),
  { ssr: false },
);

const steps = [
  {
    image: "enquiry",
    label: "Your free assessment",
    title: "Free assessment.",
    copy: "Tell us about your home, electricity use and backup needs so our team can begin its review.",
    alt: "Illustration of a Caribbean homeowner making an online solar enquiry",
  },
  {
    image: "review",
    label: "Engineering review",
    title: "Engineering review.",
    copy: "Our engineers review your details and offer initial guidance before a site assessment.",
    alt: "Illustration of an engineer reviewing roof plans",
  },
  {
    image: "survey",
    label: "Your site assessment",
    title: "Your site assessment.",
    copy: "We assess your roof, electrical setup and equipment locations to plan a system for your property.",
    alt: "Illustration of an engineer and homeowner assessing a Caribbean property",
  },
  {
    image: "installation",
    label: "Professional installation",
    title: "Professional installation.",
    copy: "Once you approve the design, we arrange installation and explain access and preparation requirements.",
    alt: "Illustration of solar installers working on an island home",
  },
  {
    image: "handover",
    label: "Handover & support",
    title: "Handover & support.",
    copy: "We check your system, show you how to use and monitor it, and explain how to reach our support team.",
    alt: "Illustration of a solar system handover to a homeowner",
  },
];
const scenarios = [
  {
    label: "Savings",
    mobileTitle: "Use more of your own solar.",
    mobileCopy: "Store daytime solar for the evening and reduce the electricity you buy from the grid.",
    image: "/images/caribbean/hybrid-evening.webp",
    alt: "Concept of a Caribbean solar and battery home illuminated after sunset",
    title: "Make your sunshine go further.",
    copy: "Store surplus daytime solar for evening use. Using more of your own energy can help reduce electricity purchases from the grid.",
  },
  {
    label: "Backup",
    mobileTitle: "Keep the essentials running.",
    mobileCopy: "Support essential appliances during outages. Runtime depends on battery capacity and the loads you choose.",
    image: "/images/caribbean/hybrid-backup.webp",
    alt: "Concept of a family enjoying essential lighting and kitchen routines in a Caribbean home at dusk",
    title: "A reserve for what matters most.",
    copy: "A system configured for essential backup can support lighting, refrigeration and home connectivity during a grid interruption. Runtime depends on battery capacity and the loads you choose.",
  },
  {
    label: "Clean energy",
    mobileTitle: "Clean energy, after sunset too.",
    mobileCopy: "Generate renewable electricity at home and store it for use beyond daylight hours.",
    image: "/images/caribbean/hybrid-clean.webp",
    alt: "Concept of everyday garden life beside a Caribbean home with rooftop solar",
    title: "More sunshine in everyday life.",
    copy: "Generate renewable electricity at home and extend its usefulness beyond daylight hours. Solar and storage bring more locally generated clean energy into your daily routines.",
  },
];
const faqs = [
  [
    "Where do you currently provide service?",
    "We currently serve Antigua & Barbuda and Dominica. Choose your country to explore local solutions, equipment information and service details. More Caribbean locations are planned.",
  ],
  [
    "Do I need to know which system I want?",
    "No. Start with your electricity bill, your home and what matters to you. Our team can help you understand your options before a detailed system design.",
  ],
  [
    "What information helps you assess my home?",
    "Your installation address, a recent electricity bill and an idea of which appliances you want to support are a helpful starting point. Photos can help explain your property or questions.",
  ],
  [
    "What happens after I submit an enquiry?",
    "Our team reviews your details and aims to respond within 48 hours. We will explain the next steps and whether a site assessment is needed.",
  ],
  [
    "Where can I find equipment information?",
    "Visit your country’s website for equipment information. Applicable specifications and terms depend on the equipment selected for your project.",
  ],
];

const WISHLIST_RECEIPTS_KEY = "sol-tide:island-wishlist:receipts:v1";

function wishlistReceipts(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(WISHLIST_RECEIPTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((code): code is string => typeof code === "string") : [];
  } catch {
    return [];
  }
}

export function CaribbeanHomepage() {
  const { choose } = useSiteRegion();
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState(0);
  const [controlExpanded, setControlExpanded] = useState(false);
  const [plannedExpanded, setPlannedExpanded] = useState(false);
  const [desktopMapVisible, setDesktopMapVisible] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    const syncPlannedRegions = () => {
      setPlannedExpanded(desktop.matches);
      setDesktopMapVisible(desktop.matches);
    };
    syncPlannedRegions();
    desktop.addEventListener("change", syncPlannedRegions);
    return () => desktop.removeEventListener("change", syncPlannedRegions);
  }, []);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistStatus, setWishlistStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [wishlistError, setWishlistError] = useState("");
  const [wishlistIsland, setWishlistIsland] = useState("");
  const wishlistSending = useRef(false);
  const wishlistRequest = useRef<AbortController | null>(null);
  const wishlistDialog = useRef<HTMLDialogElement>(null);
  const wishlistOpener = useRef<HTMLElement | SVGElement | null>(null);
  const wishlistReceipt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = wishlistDialog.current;
    if (!wishlistOpen) {
      dialog?.close();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    if (wishlistReceipt.current) wishlistReceipt.current.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      wishlistRequest.current?.abort();
    };
  }, [wishlistOpen]);

  function openWishlist(island = wishlistIsland) {
    wishlistOpener.current = document.activeElement as HTMLElement | SVGElement;
    setWishlistIsland(island);
    if (island !== "OTHER" && wishlistReceipts().includes(island)) setWishlistStatus("success");
    else if (island !== wishlistIsland || wishlistStatus === "success") {
      setWishlistStatus("idle");
      setWishlistError("");
    }
    setWishlistOpen(true);
  }
  useEffect(() => {
    if (wishlistStatus === "success")
      wishlistReceipt.current?.focus({ preventScroll: true });
  }, [wishlistStatus]);

  async function submitWishlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (wishlistSending.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    wishlistRequest.current = controller;
    wishlistSending.current = true;
    setWishlistStatus("sending");
    setWishlistError("");
    try {
      const response = await fetch("/api/island-wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          islandCode: form.get("islandCode"),
          otherIsland: form.get("otherIsland") ?? "",
        }),
        signal: AbortSignal.any([AbortSignal.timeout(20_000), controller.signal]),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(
          response.status === 429
            ? "Please wait a few minutes before trying again. Your details are still here."
            : result.error ||
                "We couldn’t save your request. Please try again.",
        );
      }
      // Keep only the confirmed location codes for this tab, never contact details.
      try {
        const islandCode = String(form.get("islandCode"));
        if (islandCode !== "OTHER") sessionStorage.setItem(WISHLIST_RECEIPTS_KEY, JSON.stringify(
          [...new Set([...wishlistReceipts(), islandCode])],
        ));
      } catch { /* A confirmed request remains successful when storage is unavailable. */ }
      setWishlistStatus("success");
    } catch (error) {
      setWishlistError(
        error instanceof Error && error.name === "Error"
          ? error.message
          : "We couldn’t confirm your request. Please try again—duplicate requests won’t be added.",
      );
      setWishlistStatus("error");
    } finally {
      wishlistSending.current = false;
      wishlistRequest.current = null;
    }
  }
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [carouselVisible, setCarouselVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const rotating =
    rotationEnabled && !carouselHovered && carouselVisible && pageVisible;
  const stepNodes = useRef<(HTMLElement | null)[]>([]);
  const touchStart = useRef<number | null>(null);
  const lastSwipeAt = useRef(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 700px)");
    const respectMotion = () => setRotationEnabled(!motion.matches && !mobile.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    respectMotion();
    updateVisibility();
    motion.addEventListener("change", respectMotion);
    mobile.addEventListener("change", respectMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setCarouselVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", respectMotion);
      mobile.removeEventListener("change", respectMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const nodes = stepNodes.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0])
          setStep(nodes.indexOf(visible[0].target as HTMLElement));
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: 0 },
    );
    nodes.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function moveSlide(delta: number) {
    setSlide(
      (current) => (current + delta + scenarios.length) % scenarios.length,
    );
  }

  return (
    <div className={`tailwind-scope ${styles.page}`}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <SiteHeader caribbean immersive />

      <main id="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="caribbean-title">
          <Image
            src="/images/caribbean-solar-hero.webp"
            alt="A lush Caribbean coastline and a home with rooftop solar"
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
          <div className={styles.heroContent}>
            <h1 id="caribbean-title">
              More confidence
              <br />
              in your home’s
              <br />
              <em>energy.</em>
            </h1>
            <div className={styles.heroDetails}>
              <p>
                Solortide by Sol &amp; Tide Energy.
                <br />
                Solar and battery solutions for Caribbean homes.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.mobileConsultation}
                  aria-haspopup="dialog"
                  onClick={() => choose("assessment")}
                >
                  Get a Free Consultation
                </button>
                <SectionAnchor href="#countries" className={styles.primary}>
                  Explore your country <span className={styles.heroActionIcon} aria-hidden="true">↗</span>
                </SectionAnchor>
                <SectionAnchor href="#journey" className={styles.heroLink}>
                  See how it works <span aria-hidden="true">↓</span>
                </SectionAnchor>
              </div>
            </div>
          </div>
          <div className={styles.heroBottom}>
            <span>Rooted in island life.</span>
            <span>
              <strong>Antigua & Barbuda · Dominica</strong>
            </span>
          </div>
        </section>

        <SolarPackageSelectionProvider><SolarPackages /></SolarPackageSelectionProvider>

        <section
          className={`${styles.section} ${styles.countries}`}
          id="countries"
          tabIndex={-1}
          aria-labelledby="countries-title"
        >
          <div className={`${styles.sectionHeading} ${styles.countryHeading}`}>
            <div>
              <h2 id="countries-title">Choose your island.</h2>
            </div>
            <div className={styles.countryLegend} aria-label="Map legend">
              <span><i aria-hidden="true" />Now serving</span>
              <span><i className={styles.plannedLegendKey} aria-hidden="true" />Planned · join wishlist</span>
            </div>
          </div>
          <div className={styles.desktopMap}>
            {desktopMapVisible && <IslandCoverageMap onWishlist={openWishlist} />}
          </div>
          <div className={styles.mobileCountryPicker}>
          <div className={styles.countryGrid}>
            {(
              [
                [
                  "AG",
                  "antigua",
                  "Antigua & Barbuda",
                ],
                [
                  "DM",
                  "dominica",
                  "Dominica",
                ],
              ] as const
            ).map(([code, slug, title]) => (
              <Link
                href={`/${slug}`}
                prefetch={false}
                className={styles.countryCard}
                key={code}
              >
                <div className={styles.countryFlag}>
                  <RegionFlag country={code} large />
                </div>
                <h3>{title}</h3>
              </Link>
            ))}
          </div>
          <button
            type="button"
            className={styles.plannedToggle}
            aria-expanded={plannedExpanded}
            aria-controls="planned-island-locations"
            onClick={() => setPlannedExpanded((open) => !open)}
          >
            More islands <span aria-hidden="true">{plannedExpanded ? "−" : "+"}</span>
          </button>
          <div id="planned-island-locations" className={styles.plannedRegions} data-expanded={plannedExpanded}>
            <ul className={styles.islandList} aria-label="Planned island locations">
              {Object.entries(UPCOMING_ISLANDS).map(([code, name]) => (
                <li key={code}>
                  <button type="button" onClick={() => openWishlist(code)} aria-haspopup="dialog" aria-label={`Get launch updates for ${name}`} title={name}>
                    <Image src={`/flags/${code.toLowerCase()}.svg`} alt="" width={32} height={24} unoptimized />
                    <span className={styles.islandCode} aria-hidden="true">
                      {code === "SABA" ? "SAB" : code === "BONAIRE" ? "BON" : code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </section>

        <section
          id="hybrid-system"
          className={styles.scenarios}
          aria-labelledby="scenarios-title"
          tabIndex={-1}
        >
          <div className={styles.scenarioHeading}>
            <h2 id="scenarios-title">
              <span className={styles.desktopBenefitCopy}>Save the sunshine<br /><em>for life after sunset.</em></span>
              <span className={styles.mobileBenefitCopy}>Solar, day and night.</span>
            </h2>
            <p>
              Rooftop solar, battery storage and intelligent energy management,
              working with the grid as one connected home energy system.
            </p>
          </div>
          <div
            ref={carouselRef}
            onMouseEnter={() => setCarouselHovered(true)}
            onMouseLeave={() => setCarouselHovered(false)}
          >
            <div
              className={styles.carousel}
              role="region"
              aria-roledescription="carousel"
              aria-label="Benefits of hybrid solar and storage"
              onTouchStart={(event) => {
                touchStart.current = event.touches[0].clientX;
              }}
              onTouchEnd={(event) => {
                if (touchStart.current !== null) {
                  const delta =
                    event.changedTouches[0].clientX - touchStart.current;
                  if (Math.abs(delta) > 55) {
                    lastSwipeAt.current = Date.now();
                    moveSlide(delta > 0 ? -1 : 1);
                  }
                }
                touchStart.current = null;
              }}
              onTouchCancel={() => {
                touchStart.current = null;
              }}
            >
              {scenarios.map((item, index) => {
                const position =
                  (index - slide + scenarios.length) % scenarios.length;
                return (
                  <article
                    key={item.image}
                    className={styles.scenarioCard}
                    data-position={position}
                    aria-hidden={position !== 0}
                  >
                    <ViewportImage
                      enabled={carouselVisible}
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 700px) 84vw, 60vw"
                    />
                    <div>
                      <h3><span className={styles.desktopBenefitCopy}>{item.title}</span><span className={styles.mobileBenefitCopy}>{item.mobileTitle}</span></h3>
                      <p><span className={styles.desktopBenefitCopy}>{item.copy}</span><span className={styles.mobileBenefitCopy}>{item.mobileCopy}</span></p>
                    </div>
                    {position === 0 && (
                      <span
                        className={styles.carouselProgress}
                        aria-hidden="true"
                      >
                        <span
                          key={slide}
                          className={styles.carouselProgressFill}
                          style={{
                            animationPlayState: rotating ? "running" : "paused",
                          }}
                          onAnimationEnd={() => {
                            if (rotating) moveSlide(1);
                          }}
                        />
                      </span>
                    )}
                  </article>
                );
              })}
              <button
                type="button"
                className={styles.carouselHitArea}
                aria-label="Show next solar benefit"
                onClick={(event) => {
                  if (
                    event.detail !== 0 &&
                    Date.now() - lastSwipeAt.current < 600
                  )
                    return;
                  moveSlide(1);
                }}
              />
            </div>
          </div>
          <div className={styles.benefitSelector} role="group" aria-label="Choose a solar benefit">
            <span className={styles.benefitSelection} aria-hidden="true" style={{ transform: `translateX(${slide * 100}%)` }} />
            {scenarios.map((item, index) => (
              <button key={item.label} type="button" aria-pressed={slide === index} onClick={() => setSlide(index)}>{item.label}</button>
            ))}
          </div>
          <div className={styles.hybridControl} data-expanded={controlExpanded}>
            <button type="button" className={styles.controlToggle} aria-expanded={controlExpanded} aria-controls="hybrid-details" onClick={() => setControlExpanded((open) => !open)}>
              System controls &amp; limits <span aria-hidden="true">{controlExpanded ? "−" : "+"}</span>
            </button>
            <div id="hybrid-details" className={styles.hybridDetails}>
            <div className={styles.hybridControlHeading}>
              <div>
                <h3>
                  Simple control.
                  <br />A clearer view of your energy.
                </h3>
              </div>
              <p>
                Solar generates. The battery stores. Your home uses. A connected
                app brings generation, consumption and battery charge into one
                view.
              </p>
            </div>
            <div className={styles.hybridModes}>
              <article>
                <h4>Self-consumption</h4>
                <p>
                  Use solar at home first, then save surplus energy for later.
                </p>
              </article>
              <article>
                <h4>Backup priority</h4>
                <p>Reserve battery energy for your selected essential loads.</p>
              </article>
              <article>
                <h4>Time-of-use</h4>
                <p>
                  Schedule battery use around higher-priced periods where your
                  electricity tariff and equipment support it.
                </p>
              </article>
            </div>
            <p className={styles.hybridCaveat}>
              Available modes, savings and backup performance depend on
              equipment, system design, household use and local tariffs.
            </p>
            </div>
            <SectionAnchor href="#countries" className={styles.hybridLink}>
              Explore solutions in your country{" "}
              <span aria-hidden="true">↗</span>
            </SectionAnchor>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.journey}`}
          id="journey"
          tabIndex={-1}
          aria-labelledby="journey-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="journey-title">From assessment to installation.</h2>
            </div>
          </div>
          <div className={styles.journeyGrid}>
            <div className={styles.stickyStory}>
              <div className={styles.storyImages}>
                {steps.map((item, index) => (
                  <ViewportImage
                    key={item.image}
                    enabled={index === step}
                    src={`/images/caribbean/${item.image}.webp`}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 800px) 90vw, 46vw"
                    className={styles.storyImage}
                    data-active={index === step}
                  />
                ))}
                <span className={styles.stepCount}>
                  0{step + 1}
                  <small> / 05</small>
                </span>
              </div>
              <nav
                className={styles.stepNav}
                aria-label="Service process steps"
              >
                {steps.map((item, index) => (
                  <SectionAnchor
                    key={item.image}
                    href={`#step-${index}`}
                    aria-label={item.label}
                    aria-current={index === step ? "step" : undefined}
                  >
                    0{index + 1}
                  </SectionAnchor>
                ))}
              </nav>
            </div>
            <div>
              {steps.map((item, index) => (
                <article
                  key={item.image}
                  id={`step-${index}`}
                  tabIndex={-1}
                  ref={(node) => {
                    stepNodes.current[index] = node;
                  }}
                  className={styles.step}
                  data-active={index === step}
                >
                  <div className={styles.mobileStepImage}>
                    <ViewportImage
                      src={`/images/caribbean/${item.image}.webp`}
                      alt={item.alt}
                      width={900}
                      height={600}
                      sizes="90vw"
                    />
                  </div>
                  <h3>
                    <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
                    {item.title}
                  </h3>
                  <p>{item.copy}</p>
                  {index === 0 && (
                    <button
                      type="button"
                      className={`${styles.primary} ${styles.stepAssessment}`}
                      aria-haspopup="dialog"
                      onClick={() => choose("assessment")}
                    >
                      Get Your Free Assessment <span aria-hidden="true">→</span>
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.faq}`}
          id="questions"
          tabIndex={-1}
          aria-labelledby="faq-title"
        >
          <div>
            <h2 id="faq-title">Common questions.</h2>
            <button
              type="button"
              onClick={() => choose("faq")}
              aria-haspopup="dialog"
              className={styles.faqLink}
            >
              Explore all FAQs <span aria-hidden="true">→</span>
            </button>
          </div>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing}>
          <h2>
            Let’s find your
            <br />
            <em>local solution.</em>
          </h2>
          <div>
            <Link href="/antigua" prefetch={false}>
              <RegionFlag country="AG" /> Antigua & Barbuda
            </Link>
            <Link href="/dominica" prefetch={false}>
              <RegionFlag country="DM" /> Dominica
            </Link>
          </div>
        </section>
      </main>

      <dialog
        ref={wishlistDialog}
        className={styles.wishlistDialog}
        aria-labelledby="wishlist-title"
        aria-describedby="wishlist-description"
        onCancel={(event) => { event.preventDefault(); setWishlistOpen(false); }}
        onClose={() => {
          setWishlistOpen(false);
          wishlistOpener.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setWishlistOpen(false);
        }}
      >
        <div className={styles.wishlistHeader}>
          <div>
            <h2 id="wishlist-title">Bring solar to your island</h2>
            <p id="wishlist-description">Service isn’t available in these locations yet.</p>
          </div>
          <button type="button" className={styles.wishlistClose} aria-label="Close island wishlist" onClick={() => setWishlistOpen(false)}>×</button>
        </div>
            {wishlistStatus === "success" ? (
              <div
                className={`${styles.wishlist} ${styles.wishlistSuccess}`}
                ref={wishlistReceipt}
                tabIndex={-1}
                role="status"
              >
                <span className={styles.wishlistCheck} aria-hidden="true">
                  ✓
                </span>
                <h4>
                  Your wish is
                  <br />
                  on our list.
                </h4>
                <p>
                  We’ve received your request. We’ll email you when service
                  launches in your area.
                </p>
              </div>
            ) : (
              <form
                className={styles.wishlist}
                aria-labelledby="wishlist-title"
                aria-busy={wishlistStatus === "sending"}
                onSubmit={submitWishlist}
              >
                <div className={styles.wishlistFields}>
                  <label htmlFor="wishlist-island">Where are you located?</label>
                  <select
                    id="wishlist-island"
                    name="islandCode"
                    value={wishlistIsland}
                    onChange={(event) => setWishlistIsland(event.target.value)}
                    required
                    disabled={wishlistStatus === "sending"}
                  >
                    <option value="" disabled>
                      Select your island or territory…
                    </option>
                    {Object.entries(WISHLIST_ISLANDS).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {wishlistIsland === "OTHER" && (
                    <>
                      <label htmlFor="wishlist-other">
                        Your island or territory
                      </label>
                      <input
                        id="wishlist-other"
                        name="otherIsland"
                        required
                        minLength={2}
                        maxLength={100}
                        disabled={wishlistStatus === "sending"}
                      />
                    </>
                  )}
                  <label htmlFor="wishlist-contact">Your email address</label>
                  <input
                    id="wishlist-contact"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    maxLength={254}
                    required
                    disabled={wishlistStatus === "sending"}
                    aria-describedby="wishlist-disclaimer"
                  />

                  <p
                    id="wishlist-disclaimer"
                    className={styles.wishlistDisclaimer}
                  >
                    We’ll use your email for launch updates in your area.{" "}
                    <PrivacyLink />
                  </p>
                  {wishlistStatus === "error" && (
                    <p className={styles.wishlistFeedback} role="alert">
                      {wishlistError}
                    </p>
                  )}
                </div>
                <div className={styles.wishlistActions}>
                  <button type="submit" disabled={wishlistStatus === "sending"}>
                    {wishlistStatus === "sending"
                      ? "Sending…"
                      : "Notify me when launched"}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </form>
            )}
      </dialog>

      <SiteFooter caribbean />
    </div>
  );
}
