"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { SERVICE_COUNTRIES, type ServiceCountry } from "@/lib/consultation-intake";
import { SOLAR_PACKAGES as PACKAGES } from "@/lib/solar-packages";
import { SITE_CONTACT } from "@/lib/site-contact";
import { useSolarPackageSelection } from "./solar-package-selection";
import { SolarEquipmentScene } from "./solar-equipment-scene";
import styles from "./solar-packages.module.css";

const price = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

type ImageView = "installed" | "equipment";
const wrap = (index: number) => (index + PACKAGES.length) % PACKAGES.length;


export function SolarPackages({ country = null }: { country?: ServiceCountry | null }) {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const selection = useSolarPackageSelection();
  const selected = PACKAGES.findIndex(plan => plan.inverter === selection.inverter);
  const [interacted, setInteracted] = useState(false);
  const cards = useRef<Array<HTMLElement | null>>([]);
  const viewFromScroll = useRef(false);
  const galleries = useRef<Array<HTMLDivElement | null>>([]);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const current = PACKAGES[selected];
  const consultationLocation = country ? ` in ${SERVICE_COUNTRIES[country].label}` : "";
  const consultationUrl = new URL(SITE_CONTACT.whatsappUrl);
  consultationUrl.searchParams.set("text", `Hello Solortide, I'd like to ask about the ${current.name} solar package (${current.inverter} kW inverter, ${current.battery} kWh battery, ${current.panelRange} panels) for my property${consultationLocation}. Could you help me check whether it suits my home and provide a quote?`);

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (viewFromScroll.current) { viewFromScroll.current = false; return; }
    const gallery = galleries.current[selected];
    if (gallery && window.matchMedia("(max-width: 800px)").matches) {
      gallery.scrollTo({ left: selection.imageView === "equipment" ? gallery.clientWidth : 0, behavior: "instant" });
    }
  }, [selected, selection.imageView]);

  useEffect(() => {
    const sync = () => {
      if (!window.matchMedia("(max-width: 800px)").matches) return;
      const gallery = galleries.current[selected];
      if (gallery) gallery.scrollTo({ left: selection.imageView === "equipment" ? gallery.clientWidth : 0, behavior: "instant" });
    };
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [selected, selection.imageView]);

  function choose(index: number, focus = false) {
    const next = wrap(index);
    selection.selectPackage(PACKAGES[next].inverter);
    setInteracted(true);
    if (focus) cards.current[next]?.focus({ preventScroll: true });
  }

  function setImageView(index: number, view: ImageView) {
    if (index !== selected) return;
    if (window.matchMedia("(max-width: 800px)").matches) {
      const gallery = galleries.current[index];
      gallery?.scrollTo({ left: view === "equipment" ? gallery.clientWidth : 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    } else selection.setImageView(view);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("[data-package-images]")) return;
    let next: number;
    if (event.key === "ArrowRight") next = selected + 1;
    else if (event.key === "ArrowLeft") next = selected - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = PACKAGES.length - 1;
    else return;
    event.preventDefault();
    const fromPicker = event.currentTarget.hasAttribute("data-package-picker");
    choose(next, !fromPicker);
    if (fromPicker) event.currentTarget.querySelector<HTMLButtonElement>(`[data-plan-index="${wrap(next)}"]`)?.focus({ preventScroll: true });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || window.matchMedia("(max-width: 800px)").matches) return;
    suppressClickUntil.current = 0;
    if ((event.target as HTMLElement).closest("button,a")) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function resetPointer() { pointer.current = null; }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    const start = pointer.current;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    resetPointer();
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppressClickUntil.current = performance.now() + 400;
      choose(selected + (dx < 0 ? 1 : -1));
    }
  }

  function onImageKeyDown(index: number, event: KeyboardEvent<HTMLDivElement>) {
    let view: ImageView;
    if (event.key === "ArrowRight" || event.key === "End") view = "equipment";
    else if (event.key === "ArrowLeft" || event.key === "Home") view = "installed";
    else return;
    event.preventDefault();
    event.stopPropagation();
    setImageView(index, view);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${view}"]`)?.focus({ preventScroll: true });
  }

  return (
    <section ref={section} data-packages-visible={visible || undefined} id="packages" className={`${styles.packages} ${styles["is-entering"]}`} aria-labelledby="packages-heading" data-testid="solar-packages" tabIndex={-1}>
      <div className={styles.container}>
        <div className={styles["section-heading"]}>
          <h2 id="packages-heading"><span className={styles["desktop-title"]}>Solortide solar packages</span><span className={styles["mobile-title"]}>Solortide packages</span></h2>
          <div className={styles["mobile-picker"]} role="group" aria-label="Choose solar package" data-package-picker onKeyDown={onKeyDown}>
            {PACKAGES.map((plan, index) => (
              <button key={plan.inverter} type="button" data-plan-index={index} aria-pressed={index === selected} aria-controls={`package-${plan.inverter}`} onClick={() => choose(index)}>{plan.name}</button>
            ))}
          </div>
        </div>
        <div className={styles.deck} role="region" aria-label="Solar packages" onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={resetPointer} onLostPointerCapture={event => { if (event.target === event.currentTarget) resetPointer(); }} onPointerLeave={event => { if (event.pointerType === "mouse" && !event.buttons) resetPointer(); }} onClickCapture={event => { if (performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
          {PACKAGES.map((plan, index) => {
            const active = index === selected;
            const imageView = active ? selection.imageView : "installed";
            const delta = wrap(index - selected);
            const slot = active ? "center" : delta === 1 ? "right" : "left";
            return (
              <article key={plan.inverter} ref={node => { cards.current[index] = node; }} id={`package-${plan.inverter}`} className={styles.card} data-slot={slot} data-package={plan.inverter} tabIndex={active ? 0 : -1} role="group" aria-roledescription="slide" aria-label={`${index + 1} of 3: ${plan.name} package`}>
                <button className={styles["card-select"]} type="button" aria-label={`View ${plan.name} package`} disabled={active} tabIndex={active ? -1 : 0} onClick={event => choose(index, event.detail === 0)} />
                <div className={styles["card-content"]} aria-hidden={!active} inert={!active}>
                  <div className={styles["card-top"]}>
                    <h3>{plan.name}</h3>
                    <p className={styles.price}><b>EC$</b>{price.format(plan.priceFromEc)}+<span>Estimated price</span></p>
                  </div>
                  <div ref={node => { galleries.current[index] = node; }} onScroll={event => {
                    if (!active || !window.matchMedia("(max-width: 800px)").matches) return;
                    const gallery = event.currentTarget;
                    const view = gallery.scrollLeft >= gallery.clientWidth / 2 ? "equipment" : "installed";
                    if (view !== selection.imageView) { viewFromScroll.current = true; selection.setImageView(view); }
                  }} className={styles["card-art"]} data-image-view={imageView} data-image-index={index} role="group" aria-roledescription="carousel" aria-label={`${plan.name} images`} aria-describedby={`package-images-help-${plan.inverter}`} tabIndex={active ? 0 : -1} onKeyDown={event => onImageKeyDown(index, event)}>
                    <div className={styles["image-frame"]} data-image-kind="installed" data-visible={imageView === "installed"} aria-hidden={imageView !== "installed"}>
                      <Image src={plan.inverter === 5 ? "/images/packages/home-5-hip-roof-v2.webp" : `/images/packages/home-${plan.inverter}.webp`} alt={`${plan.scene}; illustrative installation scene`} fill sizes="(max-width: 800px) 360px, 440px" quality={80} draggable={false} className={styles["installed-image"]} />
                    </div>
                    <div className={styles["image-frame"]} data-image-kind="equipment" data-visible={imageView === "equipment"} aria-hidden={imageView !== "equipment"}>
                      <SolarEquipmentScene plan={plan} />
                    </div>
                  </div>
                  <span className={styles["sr-only"]} id={`package-images-help-${plan.inverter}`}>Swipe left or right, or use the arrow keys, to view installation and equipment images.</span>
                  <div className={styles["mobile-image-status"]} aria-live={active ? "polite" : "off"}>
                    <span>{imageView === "installed" ? "Installed" : "Equipment"}</span>
                    <span className={styles["image-dots"]} aria-hidden="true"><i data-current={imageView === "installed"} /><i data-current={imageView === "equipment"} /></span>
                  </div>
                  <div className={styles["image-picker"]} role="group" aria-label={`${plan.name} package image`} data-package-images onKeyDown={event => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    event.stopPropagation();
                    const next = imageView === "installed" ? "equipment" : "installed";
                    setImageView(index, next);
                    event.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus({ preventScroll: true });
                  }}>
                    {(["installed", "equipment"] as const).map(view => <button key={view} type="button" data-view={view} aria-pressed={imageView === view} disabled={!active} onClick={() => setImageView(index, view)}>{view === "installed" ? "Installed" : "Equipment"}</button>)}
                  </div>
                  <div className={styles["card-body"]}>
                    <p className={styles["property-type"]}>{plan.property}</p>
                    <dl className={styles.specs}>
                      <div><dt>Inverter</dt><dd>{plan.inverter} kW</dd></div>
                      <div><dt>Battery</dt><dd>{plan.battery} kWh</dd></div>
                      <div><dt>Panels</dt><dd>{plan.panelRange}</dd></div>
                    </dl>
                    <dl className={styles.suitability}>
                      <div><dt>Homes</dt><dd>{plan.homes}<span className={styles["usage-unit"]}>kWh/mo</span></dd></div>
                      <div><dt>Shops</dt><dd>{plan.shops}<span className={styles["usage-unit"]}>kWh/mo</span></dd></div>
                    </dl>
                    {active && <div className={styles["card-consultation"]}>
                      <a href={consultationUrl.toString()} target="_blank" rel="noopener noreferrer" className={styles.assessment} aria-label={`Ask about ${current.name}${consultationLocation} on WhatsApp`}>
                        <Image src="/contact/whatsapp-logo-white-v1.png" alt="" width={20} height={20} />Ask about {current.name}<span aria-hidden="true">↗</span>
                      </a>
                    </div>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className={styles["sr-only"]} aria-live="polite" aria-atomic="true">{interacted ? `${current.name}, ${current.inverter} kW inverter, ${current.battery} kWh battery, ${current.panelRange} panels, estimated price EC$${price.format(current.priceFromEc)}+` : ""}</p>

      </div>
    </section>
  );
}
