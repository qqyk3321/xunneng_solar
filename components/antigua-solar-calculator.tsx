"use client";

import { useId, useState } from "react";
import { AssessmentLink } from "./assessment-link";
import { ANTIGUA_CONFIG as config } from "@/lib/antigua-calculator/config";
import { billBounds, calculate } from "@/lib/antigua-calculator/calculate";
import styles from "./antigua-solar-calculator.module.css";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const hours = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const money = (value: number) => config.currency + " " + number.format(value);
const bounds = billBounds();

export function AntiguaSolarCalculator() {
  const id = useId();
  const ids = {
    inputTitle: id + "-input-title",
    resultTitle: id + "-result-title",
    slider: id + "-slider",
    help: id + "-help",
    range: id + "-range",
    tooltip: id + "-tooltip",
  };
  const [bill, setBill] = useState(config.defaultBill);
  const [tariffOpen, setTariffOpen] = useState(false);
  const result = calculate(bill, "bill");
  const { min, max } = bounds;
  const selectedValue = money(bill);

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
          <h2 id={ids.inputTitle}>Your monthly bill</h2>
          <div className={styles.labelRow}>
            <label htmlFor={ids.slider}>Monthly electricity bill (EC$)</label>
            <span
              className={styles.tariffHelp}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setTariffOpen(true);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setTariffOpen(false);
              }}
            >
              <button
                type="button"
                className={styles.helpButton}
                aria-label="About the electricity tariff"
                aria-expanded={tariffOpen}
                aria-describedby={tariffOpen ? ids.tooltip : undefined}
                onFocus={() => setTariffOpen(true)}
                onBlur={() => setTariffOpen(false)}
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
                  role="tooltip"
                  className={styles.tooltip}
                >
                  <strong>APUA · {config.tariff.sourceDate}</strong>Uses the
                  June fuel surcharge of {config.currency}{" "}
                  {config.tariff.fuelAdjustment.toFixed(2)}/kWh, plus the base
                  electricity tariff. This is a fixed {config.tariff.sourceDate}{" "}
                  preset, not a live rate.
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
                  <dd data-testid="payback">
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
