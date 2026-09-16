"use client";

import { useId, useState } from "react";
import { useSiteRegion } from "./site-region";
import { AssessmentLink } from "./assessment-link";
import { RegionLinks } from "./region-links";
import type { ServiceCountry } from "@/lib/consultation-intake";
import {
  ANTIGUA_CONFIG,
  DOMINICA_CONFIG,
} from "@/lib/antigua-calculator/config";
import { billBounds, calculate } from "@/lib/antigua-calculator/calculate";
import styles from "./antigua-solar-calculator.module.css";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const hours = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const money = (value: number) => "EC$ " + number.format(value);

export function AntiguaSolarCalculator({
  country: explicitCountry,
}: { country?: ServiceCountry | null } = {}) {
  const id = useId();
  const ids = {
    inputTitle: id + "-input-title",
    resultTitle: id + "-result-title",
    slider: id + "-slider",
    help: id + "-help",
    range: id + "-range",
    tooltip: id + "-tooltip",
  };
  const { country: contextCountry } = useSiteRegion();
  const country = explicitCountry === undefined ? contextCountry : explicitCountry;
  const config = country === "AG" ? ANTIGUA_CONFIG : DOMINICA_CONFIG;
  const bounds = billBounds(config);
  const [requestedBill, setBill] = useState(ANTIGUA_CONFIG.defaultBill);
  const bill = Math.min(
    Math.floor(bounds.max),
    Math.max(Math.ceil(bounds.min), requestedBill),
  );
  const [tariffOpen, setTariffOpen] = useState(false);
  const result = calculate(bill, "bill", config);
  const min = Math.ceil(bounds.min);
  const max = Math.floor(bounds.max);
  const selectedValue = money(bill);

  if (!country) return <section className={styles.module}>
    <h3>Choose your location to explore your savings.</h3>
    <RegionLinks suffix="#calculator" />
  </section>;

  return (
    <section
      className={styles.module}
      aria-label="Home solar and battery calculator"
      data-testid="calculator-module"
    >
      <div className={styles.workspace}>
        <section
          className={styles.inputPanel}
          aria-labelledby={ids.inputTitle}
          data-testid="calculator-input"
        >
          <div className={styles.titleRow}>
            <h2 id={ids.inputTitle}>Your monthly bill</h2>
            <span
              className={styles.tariffHelp}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setTariffOpen(true);
              }}
              onPointerLeave={(event) => {
                if (
                  event.pointerType === "mouse" &&
                  !event.currentTarget.contains(document.activeElement)
                )
                  setTariffOpen(false);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setTariffOpen(false);
              }}
            >
              <button
                type="button"
                className={styles.helpButton}
                aria-label="About the electricity tariff"
                aria-expanded={tariffOpen}
                aria-controls={tariffOpen ? ids.tooltip : undefined}
                onFocus={() => setTariffOpen(true)}
                onClick={() => setTariffOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setTariffOpen(false);
                }}
              >
                ?
              </button>
              {tariffOpen && (
                <span
                  id={ids.tooltip}
                  role="region"
                  aria-label="Tariff sources and assumptions"
                  className={styles.tooltip}
                >
                  {country === "AG" ? (
                    <>
                      <strong>APUA · June 2026</strong>
                      EC$0.40/kWh for the first 300 kWh, EC$0.38 thereafter,
                      plus the June fuel surcharge of EC$0.80/kWh. Fixed June
                      2026 preset, not a live rate.
                      <a
                        href="https://www.apua.ag/customer-service/rates/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source: APUA Rates · Electricity (Domestic)
                      </a>
                    </>
                  ) : (
                    <>
                      <strong>DOMLEC · historical reference</strong>
                      Base: EC$0.58/kWh for the first 50 kWh, EC$0.67 thereafter
                      (WTO Trade Policy Review 2023, Dominica, footnote 150).
                      Fuel: EC$0.33/kWh (July 2026 DOMLEC announcement). VAT:
                      15% on electricity and fuel charges above the first 100
                      kWh; the first 100 kWh are VAT-free.
                      <a
                        href="https://sice.oas.org/ctyindex/OECS/WTO/TPR_2023/s437-02_e.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        WTO 2023 · base rates, footnote 150
                      </a>
                      <a
                        href="https://dominicanewsonline.com/news/homepage/homepage-carousel/domlec-geothermal-energy-helps-cut-july-fuel-surcharge-to-33-cents/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        DOMLEC July 2026 announcement · reported by DNO
                      </a>
                      <a
                        href="https://www.domlec.dm/faqs/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        DOMLEC FAQs · VAT / Billing Queries
                      </a>
                      This combines historical sources, assumes the old base
                      rates still apply, and is not a verified current tariff.
                      The new structure announced for October 1, 2026 is not
                      included.
                      <a
                        href="https://www.ircdominica.org/news/new-electricity-tariff-takes-effect-october-1-what-customers-should-know/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        IRC · October 2026 tariff change
                      </a>
                    </>
                  )}
                  <span className={styles.assumptions}>
                    Savings assume an 80% bill reduction. System sizes,
                    investment and payback use our planning assumptions, not
                    utility forecasts or a quotation.
                  </span>
                </span>
              )}
            </span>
          </div>
          <output
            htmlFor={ids.slider}
            className={styles.selectedValue}
            data-testid="selected-value"
          >
            {selectedValue}
          </output>
          <p id={ids.help} className={styles.help}>
            Electricity charges only. Exclude arrears, water and other services.
          </p>
          <input
            id={ids.slider}
            className={styles.slider}
            aria-describedby={ids.help + " " + ids.range}
            aria-valuetext={selectedValue}
            aria-label="Adjust monthly bill"
            type="range"
            min={min}
            max={max}
            step="1"
            value={bill}
            onChange={(event) => setBill(Number(event.target.value))}
          />
          <div className={styles.range} id={ids.range}>
            <span>{money(min)}</span>
            <span>{money(max)}</span>
          </div>
          {result.status === "ready" && (
            <div className={styles.systemPreview} data-testid="system-preview">
              <p>System preview</p>
              <div className={styles.systemSize}>
                <strong data-testid="inverter">
                  {result.system.inverterKw.toFixed(1)} <span>kW</span>
                </strong>
                <span className={styles.plus}>+</span>
                <strong data-testid="battery">
                  {result.system.batteryKwh} <span>kWh</span>
                </strong>
              </div>
              <p className={styles.systemCaption}>Inverter + battery</p>
            </div>
          )}
          <div className={styles.contact}>
            <p>Ready to explore solar for your home?</p>
            <AssessmentLink className={styles.contactButton} />
          </div>
        </section>

        <section
          className={styles.resultCard}
          aria-labelledby={ids.resultTitle}
          data-testid="calculator-results"
        >
          <h2 id={ids.resultTitle}>Estimate Your Savings</h2>
          {result.status !== "ready" ? (
            <div className={styles.empty} role="status">
              <h3>
                {result.status === "out-of-range"
                  ? "Individual assessment required"
                  : "Enter a valid monthly amount"}
              </h3>
              <p>
                {result.status === "out-of-range"
                  ? "This estimate covers " +
                    money(min) +
                    "–" +
                    money(max) +
                    " per month" +
                    ". Homes outside this range need a tailored assessment."
                  : "Enter a positive number with up to 2 decimal places to see your estimate."}
              </p>
              <p>No system or price is estimated for this input.</p>
            </div>
          ) : (
            <div data-testid="estimate">
              <dl className={styles.results}>
                <div className={styles.row + " " + styles.highlight}>
                  <dt>Monthly savings</dt>
                  <dd data-testid="monthly-saving">
                    {money(result.displaySaving)}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Annual savings</dt>
                  <dd data-testid="annual-saving">
                    {money(result.annualSaving)}
                  </dd>
                </div>
                <div className={styles.row + " " + styles.highlight}>
                  <dt>Simple payback</dt>
                  <dd className={styles.payback} data-testid="payback">
                    <span className={styles.approx} aria-label="Approximately">
                      ~
                    </span>
                    {hours.format(result.years)} <span>years</span>
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Monthly bill after installation</dt>
                  <dd data-testid="remaining-bill">
                    {money(result.displayRemaining)}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Suggested investment</dt>
                  <dd data-testid="price">
                    <span className={styles.approx} aria-label="Approximately">
                      ~
                    </span>
                    {money(result.price)}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>
                    Outage backup{" "}
                    <small>At a {config.backup.loadKw} kW average load</small>
                  </dt>
                  <dd data-testid="backup">
                    ~{hours.format(result.backupHours)} <span>hours</span>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
