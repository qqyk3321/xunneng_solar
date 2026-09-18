"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SiteFooter } from "./site-footer";
import { RegionFlag } from "./site-region";
import { SiteHeader } from "./site-header";
import { SectionAnchor } from "./section-anchor";
import styles from "./caribbean-homepage.module.css";

const steps = [
  {
    image: "enquiry",
    label: "Your enquiry",
    title: "First, we listen.",
    copy: "Lower bills? Backup for the essentials? Tell us about your home and what you want your energy system to do.",
    outcome: "A clear picture of your priorities.",
    alt: "Illustration of a Caribbean homeowner making an online solar enquiry",
  },
  {
    image: "review",
    label: "Engineering review",
    title: "Good planning starts with good questions.",
    copy: "Our engineers review the information you share to explore an initial direction and identify what needs a closer look.",
    outcome: "Initial guidance, before a detailed site assessment.",
    alt: "Illustration of an engineer reviewing roof plans",
  },
  {
    image: "survey",
    label: "Your site assessment",
    title: "Your home. Not a template.",
    copy: "A site visit helps us understand your roof, electrical setup and equipment locations, so the proposed design reflects your actual property.",
    outcome: "A clearer plan based on real site conditions.",
    alt: "Illustration of an engineer and homeowner assessing a Caribbean property",
  },
  {
    image: "installation",
    label: "Professional installation",
    title: "From a considered plan to careful work.",
    copy: "Once the design is agreed, we coordinate the installation and explain the arrangements, including access and anything you need to prepare.",
    outcome: "An agreed scope and a coordinated installation.",
    alt: "Illustration of solar installers working on an island home",
  },
  {
    image: "handover",
    label: "Handover & support",
    title: "Confident from day one. Supported after.",
    copy: "We check the system, walk you through its operation and monitoring, and explain how to reach us when you need support.",
    outcome: "Know your system. Know who to call.",
    alt: "Illustration of a solar system handover to a homeowner",
  },
];
const scenarios = [
  {
    image: "/images/caribbean/hybrid-evening.webp",
    alt: "Concept of a Caribbean solar and battery home illuminated after sunset",
    tag: "Economic value",
    title: "Make your sunshine go further.",
    copy: "Store surplus daytime solar for evening use. Using more of your own energy can help reduce electricity purchases from the grid.",
  },
  {
    image: "/images/caribbean/hybrid-backup.webp",
    alt: "Concept of a family enjoying essential lighting and kitchen routines in a Caribbean home at dusk",
    tag: "Power resilience",
    title: "A reserve for what matters most.",
    copy: "A system configured for essential backup can support lighting, refrigeration and home connectivity during a grid interruption. Runtime depends on battery capacity and the loads you choose.",
  },
  {
    image: "/images/caribbean/hybrid-clean.webp",
    alt: "Concept of everyday garden life beside a Caribbean home with rooftop solar",
    tag: "Greener living",
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
    "Where can I find equipment and warranty information?",
    "Visit your country’s website for equipment and warranty information. Applicable specifications and terms depend on the equipment selected for your project.",
  ],
];

export function CaribbeanHomepage() {
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState(0);
  const [wishlistStatus, setWishlistStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [wishlistError, setWishlistError] = useState("");
  const [wishlistIsland, setWishlistIsland] = useState("");
  const wishlistSending = useRef(false);
  const wishlistReceipt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wishlistStatus === "success")
      wishlistReceipt.current?.focus({ preventScroll: true });
  }, [wishlistStatus]);

  async function submitWishlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (wishlistSending.current) return;
    const form = new FormData(event.currentTarget);
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
        signal: AbortSignal.timeout(20_000),
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
    const respectMotion = () => setRotationEnabled(!motion.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    respectMotion();
    updateVisibility();
    motion.addEventListener("change", respectMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setCarouselVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", respectMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setSlide((current) => (current + 1) % scenarios.length),
      4000,
    );
    return () => window.clearTimeout(timer);
  }, [rotating, slide]);

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
            src="/images/dominica-solar-hero.png"
            alt="A lush Caribbean coastline and a home with rooftop solar"
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>ISLAND LIFE. THOUGHTFULLY POWERED.</p>
            <h1 id="caribbean-title">
              More confidence
              <br />
              in your home’s
              <br />
              <em>energy.</em>
            </h1>
            <p>
              Solar and battery solutions for Caribbean homes.
              <br />
              Clear guidance. Thoughtful planning. Support beyond installation.
            </p>
            <div className={styles.actions}>
              <SectionAnchor href="#countries" className={styles.primary}>
                Explore your country <span aria-hidden="true">↗</span>
              </SectionAnchor>
              <SectionAnchor href="#journey" className={styles.heroLink}>
                See how it works <span aria-hidden="true">↓</span>
              </SectionAnchor>
            </div>
          </div>
          <div className={styles.heroBottom}>
            <span>
              Rooted in island life.
              <br />
              <strong>Designed around your home.</strong>
            </span>
            <span>
              Currently serving
              <br />
              <strong>Antigua & Barbuda · Dominica</strong>
            </span>
          </div>
        </section>

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
            <p>Your local solar solutions, savings and support start here.</p>
          </div>
          <div className={styles.countryGrid}>
            {(
              [
                [
                  "AG",
                  "antigua",
                  "Antigua & Barbuda",
                  "Sunshine, savings and a smarter backup plan.",
                ],
                [
                  "DM",
                  "dominica",
                  "Dominica",
                  "Thoughtful energy solutions for the Nature Island.",
                ],
              ] as const
            ).map(([code, slug, title, copy]) => (
              <Link
                href={`/${slug}`}
                prefetch={false}
                className={styles.countryCard}
                key={code}
              >
                <div className={styles.countryTop}>
                  <div className={styles.countryFlag}>
                    <RegionFlag country={code} large />
                  </div>
                </div>
                <div className={styles.countryCopy}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <div className={styles.countryBottom}>
                  <span>Explore your island</span>
                  <span className={styles.arrow} aria-hidden="true">
                    ↗
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <aside className={styles.expansion} aria-labelledby="expansion-title">
            <div className={styles.expansionCopy}>
              <h3 id="expansion-title">
                The horizon is
                <br />
                <em>only the beginning.</em>
              </h3>
              <p>
                Starting with Antigua &amp; Barbuda and Dominica, our vision
                reaches further across the Caribbean. More island homes. More
                possibilities for brighter, cleaner energy.
              </p>
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
                <h4>Your wish is on our list.</h4>
                <p>
                  We’ve received your request. You’ll be among the first to hear
                  when we launch in your area.
                </p>
                <p>Thank you for helping shape our next chapter.</p>
              </div>
            ) : (
              <form
                className={styles.wishlist}
                aria-labelledby="wishlist-title"
                aria-busy={wishlistStatus === "sending"}
                onSubmit={submitWishlist}
              >
                <div className={styles.wishlistHeading}>
                  <h4 id="wishlist-title">Bring solar to your island</h4>
                </div>
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
                  <option value="BB">Barbados</option>
                  <option value="LC">Saint Lucia</option>
                  <option value="GD">Grenada</option>
                  <option value="KN">St. Kitts &amp; Nevis</option>
                  <option value="OTHER">
                    Other Caribbean island or territory
                  </option>
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
                <button type="submit" disabled={wishlistStatus === "sending"}>
                  {wishlistStatus === "sending"
                    ? "Sending…"
                    : "Notify me when launched"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
                <p
                  id="wishlist-disclaimer"
                  className={styles.wishlistDisclaimer}
                >
                  We’ll use your email for launch updates in your area.{" "}
                  <Link href="/privacy">Privacy policy</Link>
                </p>
                {wishlistStatus === "error" && (
                  <p className={styles.wishlistFeedback} role="alert">
                    {wishlistError}
                  </p>
                )}
              </form>
            )}
          </aside>
        </section>

        <section
          className={`${styles.section} ${styles.journey}`}
          id="journey"
          tabIndex={-1}
          aria-labelledby="journey-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>CARE AT EVERY STEP</p>
              <h2 id="journey-title">
                A clear path.
                <br />
                Not a leap of faith.
              </h2>
            </div>
            <p>
              From your first question to your finished system, know what
              happens next — and why it matters.
            </p>
          </div>
          <div className={styles.journeyGrid}>
            <div className={styles.stickyStory}>
              <div className={styles.storyImages}>
                {steps.map((item, index) => (
                  <Image
                    key={item.image}
                    src={`/images/caribbean/${item.image}.webp`}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 800px) 90vw, 46vw"
                    className={styles.storyImage}
                    data-active={index === step}
                  />
                ))}
                <span className={styles.imageLabel}>Illustrative imagery</span>
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
                    <Image
                      src={`/images/caribbean/${item.image}.webp`}
                      alt={item.alt}
                      width={900}
                      height={600}
                      sizes="90vw"
                    />
                    <span>Illustrative imagery</span>
                  </div>
                  <p className={styles.stepLabel}>
                    0{index + 1} <span>{item.label}</span>
                  </p>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <div className={styles.outcome}>
                    <span>WHAT YOU TAKE AWAY</span>
                    <p>{item.outcome}</p>
                  </div>
                </article>
              ))}
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
            <p className={styles.kicker}>HYBRID SOLAR &amp; STORAGE</p>
            <h2 id="scenarios-title">
              Save the sunshine
              <br />
              <em>for life after sunset.</em>
            </h2>
            <p>
              Rooftop solar, battery storage and intelligent energy management,
              working with the grid as one connected home energy system.
            </p>
            <ul
              className={styles.systemParts}
              aria-label="Hybrid system components"
            >
              <li>Solar generation</li>
              <li>Battery storage</li>
              <li>Grid connection</li>
              <li>Smart monitoring</li>
            </ul>
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
                    key={item.tag}
                    className={styles.scenarioCard}
                    data-position={position}
                    aria-hidden={position !== 0}
                  >
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 700px) 84vw, 60vw"
                    />
                    <div>
                      <span>{item.tag}</span>
                      <h3>{item.title}</h3>
                      <p>{item.copy}</p>
                    </div>
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
          <p className={styles.scenarioNote}>
            Concept visuals for illustration, not completed customer projects.
          </p>
          <div className={styles.hybridControl}>
            <div className={styles.hybridControlHeading}>
              <div>
                <p className={styles.kicker}>ONE CONNECTED SYSTEM</p>
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
            <SectionAnchor href="#countries" className={styles.hybridLink}>
              Explore solutions in your country{" "}
              <span aria-hidden="true">↗</span>
            </SectionAnchor>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.faq}`}
          id="questions"
          tabIndex={-1}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.kicker}>A LITTLE CLARITY</p>
            <h2 id="faq-title">
              Good questions.
              <br />A good place to start.
            </h2>
            <p>
              You don’t need all the answers
              <br />
              before you talk to us.
            </p>
            <Link href="/faq" prefetch={false} className={styles.faqLink}>
              Explore all FAQs <span aria-hidden="true">→</span>
            </Link>
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
          <p>YOUR NEXT CHAPTER STARTS HERE</p>
          <h2>
            Let’s find your
            <br />
            <em>local solution.</em>
          </h2>
          <div>
            <Link href="/antigua" prefetch={false}>
              <RegionFlag country="AG" /> Antigua & Barbuda{" "}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/dominica" prefetch={false}>
              <RegionFlag country="DM" /> Dominica{" "}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter caribbean />
    </div>
  );
}
