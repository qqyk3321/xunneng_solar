"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  SERVICE_COUNTRIES,
  type ServiceCountry,
} from "@/lib/consultation-intake";
import styles from "./site-region.module.css";

const KEY = "sol-tide:installation-region:v1";
const RegionContext = createContext<{
  country: ServiceCountry | null;
  open: boolean;
  choose: () => void;
}>({ country: null, open: false, choose: () => {} });
export const useSiteRegion = () => useContext(RegionContext);

export function SiteRegionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [country, setCountry] = useState<ServiceCountry | null>(null);
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState<ServiceCountry | null>(null);
  const [confirmChange, setConfirmChange] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const publicPage = [
    "/",
    "/faq",
    "/consultation",
    "/home-preview",
    "/antigua-calculator-preview",
  ].includes(pathname);
  const open = manual || (ready && !country && publicPage);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "AG" || saved === "DM") setCountry(saved);
    } catch {
      /* Browser storage is optional. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  function choose() {
    setDraft(country);
    setConfirmChange(false);
    setManual(true);
  }
  function save() {
    if (!draft) return;
    if (
      country &&
      draft !== country &&
      pathname === "/consultation" &&
      !confirmChange
    ) {
      setConfirmChange(true);
      return;
    }
    try {
      localStorage.setItem(KEY, draft);
    } catch {
      /* Keep the in-memory choice. */
    }
    setCountry(draft);
    setManual(false);
    setConfirmChange(false);
  }
  return (
    <RegionContext.Provider value={{ country, open, choose }}>
      {children}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="region-title"
        aria-describedby="region-description"
        onCancel={(event) => {
          event.preventDefault();
          if (country) setManual(false);
        }}
      >
        {country && (
          <button
            className={styles.close}
            aria-label="Close location selection"
            onClick={() => setManual(false)}
          >
            ×
          </button>
        )}
        <p className={styles.eyebrow}>YOUR LOCATION</p>
        <h2 id="region-title">Where would you like to install your system?</h2>
        <p id="region-description" className={styles.description}>
          Choose your installation location so we can show the relevant
          equipment information and electricity estimates.
        </p>
        <div
          className={styles.options}
          role="group"
          aria-label="Installation location"
        >
          {(["AG", "DM"] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={draft === code}
              onClick={() => {
                setDraft(code);
                setConfirmChange(false);
              }}
            >
              <RegionFlag country={code} large />
              <strong>
                {SERVICE_COUNTRIES[code].label}
                <span aria-hidden="true">{draft === code ? "✓" : ""}</span>
              </strong>
              <small>
                {code === "AG"
                  ? "Antigua & Barbuda"
                  : "Commonwealth of Dominica"}
              </small>
            </button>
          ))}
        </div>
        <p className={styles.coming}>
          <strong>More Caribbean locations are coming soon.</strong>
          <br />
          Stay tuned as we expand our service coverage.
        </p>
        {confirmChange && (
          <p className={styles.warning} role="alert">
            Changing location restarts your assessment and clears the current
            address, map selection and unsent form. Continue?
          </p>
        )}
        <button className={styles.save} disabled={!draft} onClick={save}>
          {confirmChange
            ? "Change location and restart"
            : country
              ? "Save location"
              : "Continue"}
        </button>
        <p className={styles.hint}>
          We’ll remember your choice on this browser. You can change your
          location anytime in the header or footer.
        </p>
      </dialog>
    </RegionContext.Provider>
  );
}

export function RegionSwitcher() {
  const { country, choose } = useSiteRegion();
  return (
    <button
      type="button"
      className={styles.switcher}
      onClick={choose}
      aria-haspopup="dialog"
      aria-label="Change installation location"
    >
      {country && <RegionFlag country={country} />}
      {country ? SERVICE_COUNTRIES[country].label : "Location"}{" "}
      <span aria-hidden="true">▾</span>
    </button>
  );
}

export function RegionCertification() {
  const { country } = useSiteRegion();
  return <>{country === "AG" ? "UL" : country === "DM" ? "CE" : "UL/CE"}</>;
}

/** Decorative beside the country name; local SVG avoids emoji/font differences. */
export function RegionFlag({ country, large = false }: { country: ServiceCountry; large?: boolean }) {
  return <Image src={`/flags/${country.toLowerCase()}.svg`} alt="" aria-hidden="true" width={large ? 48 : 24} height={large ? 36 : 18} unoptimized className={large ? styles.flagLarge : styles.flag} />;
}
