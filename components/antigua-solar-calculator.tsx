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
import { calculate } from "@/lib/antigua-calculator/calculate";
import { CURRENCIES, FX_DATE, currencyBounds, defaultCurrencyBill, formatMoney, fromEc, toEc, type Currency } from "@/lib/antigua-calculator/currency";
import styles from "./antigua-solar-calculator.module.css";

const hours = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

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
  const [currency, setCurrency] = useState<Currency>("USD");
  const bounds = currencyBounds(config, currency);
  const [requestedBill, setBill] = useState(defaultCurrencyBill(config, "USD"));
  const [currencyChanged, setCurrencyChanged] = useState(false);
  const bill = Math.min(
    Math.floor(bounds.max),
    Math.max(Math.ceil(bounds.min), requestedBill),
  );
  const [tariffOpen, setTariffOpen] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const result = calculate(toEc(bill, currency), "bill", config);
  const money = (value: number) => formatMoney(value, currency);
  const convertedMoney = (value: number) => money(fromEc(value, currency));
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
          <div className={styles.currencyRow}>
          <label className={styles.currencyPicker}>
            <span>Currency</span>
            <select aria-label="Calculator currency" value={currency} onChange={(event) => {
              const next = event.target.value as Currency;
              setCurrency(next);
              setBill(defaultCurrencyBill(config, next));
              setCurrencyChanged(true);
            }}>
              {Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{item.label}</option>)}
            </select>
          </label>
          <span className={styles.fxHelp}
            onPointerEnter={event => { if (event.pointerType === "mouse") setFxOpen(true); }}
            onPointerLeave={event => { if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setFxOpen(false); }}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFxOpen(false); }}
            onKeyDown={event => { if (event.key === "Escape") setFxOpen(false); }}>
            <button type="button" className={styles.helpButton} aria-label="About exchange rates" aria-expanded={fxOpen} aria-controls={fxOpen ? id + "-fx" : undefined} onFocus={() => setFxOpen(true)} onClick={() => setFxOpen(true)}>?</button>
            {fxOpen && <span id={id + "-fx"} role="region" aria-label="Fixed exchange rates" className={styles.tooltip}>
              <strong>EC$ is our calculation base.</strong>
              Fixed reference: {FX_DATE}. US$1 = EC$2.70; €1 = EC$3.09501; Cg1 ≈ EC$1.50838.
              <a href="https://www.eccb-centralbank.org/history-of-the-ec-currency" target="_blank" rel="noopener noreferrer">ECCB · EC dollar / USD peg</a>
              <a href="https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml" target="_blank" rel="noopener noreferrer">ECB · EUR/USD reference (1 EUR = 1.1463 USD on 22 Sep 2026)</a>
              <a href="https://www.centralbank.cw/functions/banknotes-coins/caribbean-guilder/frequently-asked-questions" target="_blank" rel="noopener noreferrer">CBCS · XCG / USD peg (1 USD = 1.79 XCG)</a>
              Rates were checked on 23 Sep 2026 and are not updated automatically. Provider fees are excluded. Changing currency resets the bill slider; adjust it again to match your bill. Currency does not change your location or electricity tariff.
            </span>}
          </span>
          </div>
          {currencyChanged && <p className={styles.currencyHint} role="status">Currency changed. Adjust the slider to match your monthly bill.</p>}
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
            onChange={(event) => { setBill(Number(event.target.value)); setCurrencyChanged(false); }}
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
              <div className={styles.scenarioNotice} data-testid="scenario-notice">
                <p>
                  <strong>Planning scenario</strong> · Assumes an{" "}
                  {Math.round(config.savingsFraction * 100)}% bill reduction · Not a quotation
                </p>
                <p data-testid="tariff-reference">
                  {country === "AG"
                    ? `APUA · ${config.tariff.sourceDate} reference · Not a live rate`
                    : `DOMLEC · ${config.tariff.sourceDate} · Historical reference, not a verified current tariff. October 2026 structure not included.`}
                </p>
              </div>
              <dl className={styles.results}>
                <div className={styles.row + " " + styles.highlight}>
                  <dt>Monthly savings</dt>
                  <dd data-testid="monthly-saving">
                    {money(Math.round(bill * config.savingsFraction))}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Annual savings</dt>
                  <dd data-testid="annual-saving">
                    {convertedMoney(result.annualSaving)}
                  </dd>
                </div>
                <div className={styles.row + " " + styles.highlight}>
                  <dt>Assumed payback period</dt>
                  <dd className={styles.payback} data-testid="payback">
                    <span className={styles.approx} aria-label="Approximately">
                      ~
                    </span>
                    {hours.format(result.years)} <span>years</span>
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Estimated bill under this assumption</dt>
                  <dd data-testid="remaining-bill">
                    {money(bill - Math.round(bill * config.savingsFraction))}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt>Illustrative budget</dt>
                  <dd data-testid="price">
                    <span className={styles.approx} aria-label="Approximately">
                      ~
                    </span>
                    {convertedMoney(result.price)}
                  </dd>
                </div>
              </dl>
              <p className={styles.budgetExplanation} data-testid="budget-explanation">
                Budget is calculated from assumed annual savings × the assumed
                payback period, not equipment and installation costs.
              </p>
              <dl className={styles.backupResults}>
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
