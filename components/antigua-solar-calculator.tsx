"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SmoothEstimateValue } from "./smooth-estimate-value";
import { useSiteRegion } from "./site-region";
import { AssessmentLink } from "./assessment-link";
import { RegionLinks } from "./region-links";
import { SolarEquipmentScene } from "./solar-equipment-scene";
import { SOLAR_PACKAGES } from "@/lib/solar-packages";
import { useSolarPackageSelection } from "./solar-package-selection";
import type { ServiceCountry } from "@/lib/consultation-intake";
import { ANTIGUA_CONFIG, DOMINICA_CONFIG } from "@/lib/antigua-calculator/config";
import { calculate, parseInput } from "@/lib/antigua-calculator/calculate";
import { CURRENCIES, FX_DATE, currencyBounds, defaultCurrencyBill, formatMoney, fromEc, toEc, type Currency } from "@/lib/antigua-calculator/currency";
import { tariffReference } from "@/lib/antigua-calculator/tariff-reference";
import styles from "./antigua-solar-calculator.module.css";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Native popovers escape the calculator's surface and support light dismiss. */
function CalculatorHelp({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  function clearTimer() { clearTimeout(closeTimer.current); }
  function position() {
    const el = panel.current;
    if (!el?.matches(":popover-open") || !trigger.current || window.matchMedia("(max-width: 800px)").matches) return;
    const box = trigger.current.getBoundingClientRect();
    el.style.left = `${Math.min(innerWidth - el.offsetWidth - 16, Math.max(16, box.left - 90))}px`;
    el.style.top = `${box.bottom + el.offsetHeight + 8 < innerHeight ? box.bottom + 8 : Math.max(16, box.top - el.offsetHeight - 8)}px`;
  }
  function hide(restore = false) {
    clearTimer();
    panel.current?.hidePopover();
    pinned.current = false;
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
  }
  function show(pin: boolean) {
    clearTimer();
    pinned.current = pin;
    panel.current?.showPopover();
    setOpen(true);
    position();
    if (pin) closeButton.current?.focus({ preventScroll: true });
  }
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return;
    const reposition = () => position();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);
  return <div className={styles.helpRoot}
    onPointerEnter={event => {
      clearTimer();
      if (event.pointerType === "mouse" && window.matchMedia("(min-width: 801px)").matches && !pinned.current) show(false);
    }}
    onPointerLeave={event => {
      if (event.pointerType === "mouse" && !pinned.current) closeTimer.current = setTimeout(() => hide(), 160);
    }}
    onKeyDown={event => { if (event.key === "Escape" && panel.current?.matches(":popover-open")) { event.preventDefault(); event.stopPropagation(); hide(true); } }}>
    <button ref={trigger} type="button" className={styles.info} aria-label={label} aria-expanded={open} aria-controls={id}
      onClick={() => { if (pinned.current && panel.current?.matches(":popover-open")) hide(true); else show(true); }}>
      <span aria-hidden="true">i</span>
    </button>
    <div ref={panel} id={id} popover="auto" className={styles.helpPanel} role="region" aria-labelledby={`${id}-title`}
      onToggle={event => {
        const visible = event.currentTarget.matches(":popover-open");
        setOpen(visible);
        if (!visible) pinned.current = false;
      }}>
      <div className={styles.helpHeading}>
        <h3 id={`${id}-title`}>{title}</h3>
        <button ref={closeButton} type="button" aria-label="Close explanation" onClick={() => hide(true)}>×</button>
      </div>
      {children}
    </div>
  </div>;
}

function TariffDetails({ country }: { country: ServiceCountry }) {
  const reference = tariffReference(country);
  return <details className={styles.helpDetails}>
    <summary>Electricity rates</summary>
    <p><strong>{reference.title}</strong></p>
    <p>{reference.description}</p>
    <p>{reference.caveat}</p>
    {reference.sources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a>)}
  </details>;
}

export function AntiguaSolarCalculator({ country: explicitCountry }: { country?: ServiceCountry | null } = {}) {
  const { country: contextCountry } = useSiteRegion();
  const country = explicitCountry === undefined ? contextCountry : explicitCountry;
  if (!country) return <section className={styles.module}>
    <h3>Choose your location to explore your savings.</h3>
    <RegionLinks suffix="#calculator" />
  </section>;
  return <RegionalCalculator key={country} country={country} />;
}

function RegionalCalculator({ country }: { country: ServiceCountry }) {
  const { selectPackage } = useSolarPackageSelection();
  const id = useId();
  const config = country === "AG" ? ANTIGUA_CONFIG : DOMINICA_CONFIG;
  const [currency, setCurrency] = useState<Currency>("USD");
  const [text, setText] = useState(String(defaultCurrencyBill(config, "USD")));
  const [lastBill, setLastBill] = useState(defaultCurrencyBill(config, "USD"));
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const calculatorRoot = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = calculatorRoot.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const { min, max } = currencyBounds(config, currency);
  const parsed = parseInput(text);
  const valid = parsed !== null && parsed >= min && parsed <= max;
  const result = calculate(valid ? toEc(parsed, currency) : null, "bill", config);
  const ready = result.status === "ready";
  const plan = ready ? SOLAR_PACKAGES.find(plan => plan.inverter === result.system.inverterKw) : undefined;
  const bill = valid ? parsed : lastBill;
  const prefix = CURRENCIES[currency].prefix;
  const money = (value: number) => formatMoney(value, currency);
  const converted = (value: number) => integer.format(fromEc(value, currency));
  const error = !valid && touched ? `Enter ${money(min)}–${money(max)}.` : "";
  const sliderStyle = { "--progress": `${((bill - min) / (max - min)) * 100}%` } as CSSProperties;

  function updateText(value: string) {
    setText(value);
    const amount = parseInput(value);
    if (amount !== null && amount >= min && amount <= max) setLastBill(amount);
  }

  return <section ref={calculatorRoot} className={styles.module} tabIndex={-1} aria-label="Home solar and battery calculator" data-testid="calculator-module" data-calculator-visible={visible || undefined}>
    <div className={styles.workspace}>
      <form className={styles.inputPanel} data-testid="calculator-input" noValidate onSubmit={event => {
        event.preventDefault(); setTouched(true);
        if (ready) input.current?.blur();
        else input.current?.focus();
      }}>
        <h3 className={styles.mobileTitle}>Find your solar fit</h3>
        <div className={styles.labelLine}>
          <label className={styles.billLabel} htmlFor={`${id}-bill`}>
            <span className={styles.desktopBillLabel}>Monthly electricity bill</span>
            <span className={styles.mobileBillLabel}>Monthly bill</span>
          </label>
          <CalculatorHelp title="Your electricity bill" label="About your electricity bill">
            <p>Use your monthly electricity charges, excluding arrears, water and other services.</p>
            <details className={styles.helpDetails}>
              <summary>Currency conversion</summary>
              <p>Fixed reference: {FX_DATE}. US$1 = EC$2.70; €1 = EC$3.09501; Cg1 ≈ EC$1.50838.</p>
              <p>Rates are not updated automatically. Provider fees are excluded. Changing currency resets the amount; adjust it to match your bill. Currency does not change your location or electricity tariff.</p>
              <a href="https://www.eccb-centralbank.org/history-of-the-ec-currency" target="_blank" rel="noopener noreferrer">ECCB · EC dollar / USD peg</a>
              <a href="https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml" target="_blank" rel="noopener noreferrer">ECB · EUR/USD reference</a>
              <a href="https://www.centralbank.cw/functions/banknotes-coins/caribbean-guilder/frequently-asked-questions" target="_blank" rel="noopener noreferrer">CBCS · XCG / USD peg</a>
            </details>
            <TariffDetails country={country} />
          </CalculatorHelp>
        </div>
        <div className={styles.amountField}>
          <span className={styles.amountPrefix} aria-hidden="true">{prefix}</span>
          <input ref={input} id={`${id}-bill`} type="text" inputMode="decimal" value={text} autoComplete="off" spellCheck={false}
            aria-label={`Monthly electricity bill in ${currency}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
            data-testid="bill-input" onChange={event => updateText(event.target.value)} onBlur={() => setTouched(true)} />
          <select aria-label="Calculator currency" value={currency} onChange={event => {
            const next = event.target.value as Currency;
            const nextBill = defaultCurrencyBill(config, next);
            setCurrency(next); setText(String(nextBill)); setLastBill(nextBill); setTouched(false);
          }}>
            {Object.keys(CURRENCIES).map(code => <option key={code} value={code}>{code === "XCD" ? "EC$" : code}</option>)}
          </select>
        </div>
        {error && <p className={styles.error} id={`${id}-error`} role="alert">{error}</p>}
        <div className={styles.rangeGroup}>
          <input id={`${id}-slider`} type="range" min={min} max={max} step="1" value={bill} style={sliderStyle}
            className={styles.slider} aria-label="Adjust monthly bill" aria-valuetext={`${money(bill)} per month`}
            onChange={event => { const amount = Number(event.target.value); setText(event.target.value); setLastBill(amount); setTouched(false); }} />
          <div className={styles.rangeLabels}><span>{money(min)}</span><span>{money(max)}</span></div>
        </div>
        <div className={styles.usageSummary}>
          <span className={styles.sliderHint} aria-hidden="true">Adjust your monthly bill</span>
          <div className={styles.metricLabel}>
            <span id={`${id}-usage-label`}>Monthly usage</span>
            <CalculatorHelp title="Monthly electricity usage" label="About estimated monthly usage">
              <p>Estimated from your monthly bill using the electricity rates for {country === "AG" ? "Antigua & Barbuda" : "Dominica"}. Check your bill for your actual kWh usage.</p>
              <TariffDetails country={country} />
            </CalculatorHelp>
          </div>
          <output className={styles.usageValue} htmlFor={`${id}-bill ${id}-slider`} aria-labelledby={`${id}-usage-label`} data-testid="monthly-usage">
            {ready ? `~${integer.format(result.kwh)}` : "—"} <span className={styles.unit}>kWh</span>
          </output>
        </div>
      </form>
      <div className={styles.recommendation}>
          <span><span className={styles.desktopRecommendationLabel}>Recommended package</span><span className={styles.mobileRecommendationLabel}>Recommended for your home</span></span>
          <strong data-testid="recommended-package" aria-live="polite" aria-atomic="true">{ready ? <a href="#packages" className={styles.recommendationLink} aria-label={`View ${result.system.name} package`} aria-controls={`package-${result.system.inverterKw}`} onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            selectPackage(result.system.inverterKw);
            window.history.pushState(null, "", "#packages");
            requestAnimationFrame(() => {
              document.getElementById(`package-${result.system.inverterKw}`)?.focus({ preventScroll: true });
              document.getElementById("packages")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            });
          }}><span>{result.system.name}</span><span className={styles.recommendationArrow} aria-hidden="true">↑</span></a> : "—"}</strong>
        </div>
      <div className={styles.mobileEquipment} data-testid="recommended-equipment">
        {plan ? <SolarEquipmentScene plan={plan} /> : <p>Enter your monthly bill to see your recommended package.</p>}
      </div>
      {plan && <div className={styles.mobileSpecs} data-testid="recommended-specs"><span><b>{plan.inverter} kW</b> inverter</span><span><b>{plan.battery} kWh</b> battery</span><span><b>{plan.panelRange}</b> panels</span></div>}
      <section className={styles.resultPanel} aria-label="Your solar estimate" data-testid="calculator-results">
        <dl className={styles.results} data-testid="estimate">
          <div className={styles.budget} data-metric="budget">
            <dt className={styles.metricLabel}>Estimated budget
              <CalculatorHelp title="Estimated budget" label="About estimated budget">
                <p>The starting price of your recommended package, shown in your selected currency.</p>
                <p>The + means the final cost may be higher. A free assessment confirms the configuration, included work and quote for your home.</p>
              </CalculatorHelp>
            </dt>
            <dd className={styles.budgetValue} data-testid="price">{ready ? <><span className={styles.moneyPrefix}>~{prefix}</span> <SmoothEstimateValue key={currency} value={result.price} format={converted} active={visible} /><span className={styles.budgetPlus}>+</span></> : "—"}</dd>
          </div>
          <div className={`${styles.metricRow} ${styles.prominent}`} data-metric="payback">
            <dt className={styles.metricLabel}>Payback
              <CalculatorHelp title="Payback" label="About payback">
                <p>Package starting price ÷ estimated annual savings.</p>
                <p>This simple estimate uses the starting budget and an {Math.round(config.savingsFraction * 100)}% bill-saving assumption. A higher final price or lower savings increases the payback period. Financing, maintenance and equipment replacement are excluded.</p>
              </CalculatorHelp>
            </dt>
            <dd className={styles.metricValue} data-testid="payback">{ready ? <>~<SmoothEstimateValue key={currency} value={result.years} format={decimal.format} active={visible} /> <span className={styles.unit}>years</span></> : "—"}</dd>
          </div>
          <div className={styles.metricRow} data-metric="annual">
            <dt className={styles.metricLabel}><span className={styles.desktopMetricLabel}>Annual savings</span><span className={styles.mobileMetricLabel}>Saved / year</span>
              <CalculatorHelp title="Annual savings" label="About annual savings">
                <p>{money(bill)} × {Math.round(config.savingsFraction * 100)}% × 12 months.</p>
                <p>This estimate assumes an {Math.round(config.savingsFraction * 100)}% reduction in your electricity bill. Actual savings depend on your system, usage and electricity rates.</p>
                <TariffDetails country={country} />
              </CalculatorHelp>
            </dt>
            <dd className={styles.metricValue} data-testid="annual-saving">{ready ? <><span className={styles.unit}>~{prefix}</span> <SmoothEstimateValue key={currency} value={result.annualSaving} format={converted} active={visible} /></> : "—"}</dd>
          </div>
          <div className={styles.metricRow} data-metric="backup">
            <dt className={styles.metricLabel}><span className={styles.desktopMetricLabel}>Outage backup</span><span className={styles.mobileMetricLabel}>Backup</span>
              <CalculatorHelp title="Outage backup" label="About outage backup">
                {ready && <p>Uses the {result.system.batteryKwh} kWh battery in the {result.system.name} package.</p>}
                <p>Based on a {config.backup.loadKw} kW average load, {Math.round(config.backup.usableFraction * 100)}% usable battery capacity and {Math.round(config.backup.efficiency * 100)}% efficiency.</p>
                <p>Runtime varies with the appliances you use and the battery’s charge level.</p>
              </CalculatorHelp>
            </dt>
            <dd className={styles.metricValue} data-testid="backup">{ready ? <>~<SmoothEstimateValue key={currency} value={result.backupHours} format={decimal.format} active={visible} /> <span className={styles.unit}>hrs</span></> : "—"}</dd>
          </div>
        </dl>
        <div className={styles.assessmentArea}>
          {ready ? <AssessmentLink country={country} className={`${styles.primary} ${styles.assessment}`} />
            : <button type="button" disabled className={`${styles.primary} ${styles.assessment}`}>Get Your Free Assessment</button>}
        </div>
      </section>
    </div>
  </section>;
}
