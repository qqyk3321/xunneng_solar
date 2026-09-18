"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  countryFromPath,
  switchedRegionPath,
  regionPath,
} from "@/lib/site-region-routing";
import Image from "next/image";
import {
  SERVICE_COUNTRIES,
  type ServiceCountry,
} from "@/lib/consultation-intake";
import styles from "./site-region.module.css";

const RegionContext = createContext<{
  country: ServiceCountry | null;
  ready: boolean;
  open: boolean;
  choose: (intent?: "savings" | "assessment" | "faq") => void;
}>({ country: null, ready: false, open: false, choose: () => {} });
export const useSiteRegion = () => useContext(RegionContext);

export function SiteRegionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <RegionForPath pathname={pathname}>{children}</RegionForPath>;
}

function RegionForPath({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const country = countryFromPath(pathname);
  const ready = true;
  const [manual, setManual] = useState(false);
  const [intent, setIntent] = useState<
    "savings" | "assessment" | "faq" | undefined
  >();
  // A focused option must not look selected while Continue is disabled.
  // Only the dialog draft defaults; the URL country changes after confirmation.
  const [draft, setDraft] = useState<ServiceCountry>(country ?? "AG");
  const [confirmChange, setConfirmChange] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const navigationFrame = useRef<number | undefined>(undefined);
  useEffect(() => {
    setManual(false);
    setConfirmChange(false);
    setNavigating(false);
    setDraft(country ?? "AG");
  }, [pathname, country]);
  useEffect(() => {
    const ended = () => {
      // A failed navigation must allow another attempt on the original page.
      if (window.location.pathname === pathname) setNavigating(false);
    };
    window.addEventListener("solortide:navigation-end", ended);
    return () => {
      window.removeEventListener("solortide:navigation-end", ended);
      window.cancelAnimationFrame(navigationFrame.current ?? 0);
    };
  }, [pathname]);
  // Region selection is always voluntary, including the Caribbean entry page.
  const open = !navigating && manual;
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
  function choose(nextIntent?: "savings" | "assessment" | "faq") {
    opener.current = document.activeElement as HTMLElement;
    setIntent(nextIntent);
    setDraft(country ?? "AG");
    setConfirmChange(false);
    setManual(true);
  }
  function save() {
    if (!draft || navigating) return;
    if (
      country &&
      draft !== country &&
      pathname.endsWith("/consultation") &&
      !confirmChange
    ) {
      setConfirmChange(true);
      return;
    }
    setManual(false);
    setConfirmChange(false);
    // Native modal dialogs sit above every CSS z-index. Close before showing
    // the already-mounted loader, then give the browser a frame to paint it.
    dialog.current?.close();
    const destination =
      intent === "assessment"
        ? regionPath(draft, "/consultation")
        : intent === "faq"
          ? regionPath(draft, "/faq")
          : intent === "savings"
            ? regionPath(draft)
            : switchedRegionPath(pathname, draft);
    const hash =
      intent === "savings" ? "#calculator" : intent ? "" : window.location.hash;
    if (destination === pathname) return;
    setNavigating(true);
    window.dispatchEvent(
      new CustomEvent("solortide:navigation-start", {
        detail: { immediate: true },
      }),
    );
    navigationFrame.current = window.requestAnimationFrame(() => {
      navigationFrame.current = window.requestAnimationFrame(() => {
        router.push(destination + hash);
      });
    });
  }
  return (
    <RegionContext.Provider value={{ country, ready, open, choose }}>
      {children}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="region-title"
        aria-describedby="region-description"
        onClose={() => {
          if (navigating || !opener.current?.isConnected) return;
          if (opener.current.getClientRects().length) opener.current.focus();
          else
            opener.current
              .closest("header")
              ?.querySelector<HTMLButtonElement>(
                'button[aria-controls="regional-main-nav"]',
              )
              ?.focus();
        }}
        onCancel={(event) => {
          event.preventDefault();
          setManual(false);
        }}
      >
        <button
          className={styles.close}
          aria-label="Close location selection"
          onClick={() => setManual(false)}
        >
          ×
        </button>
        <h2 id="region-title">Where would you like to install your system?</h2>
        <p id="region-description" className={styles.description}>
          Choose your country.
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
            unsent form. Continue?
          </p>
        )}
        <button
          className={styles.save}
          disabled={!draft || navigating}
          onClick={save}
        >
          {confirmChange
            ? "Change location and restart"
            : country
              ? "Save location"
              : "Continue"}
        </button>
      </dialog>
    </RegionContext.Provider>
  );
}

export function RegionSwitcher({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "text";
  className?: string;
} = {}) {
  const { country, choose } = useSiteRegion();
  return (
    <button
      type="button"
      className={`${styles.switcher} ${className}`}
      onClick={() => choose()}
      aria-haspopup="dialog"
      aria-label="Change installation location"
    >
      {country && <RegionFlag country={country} />}
      <span>
        {country
          ? SERVICE_COUNTRIES[country].label
          : variant === "text"
            ? "Choose location"
            : "Location"}
      </span>
      {variant === "default" && <span aria-hidden="true">▾</span>}
    </button>
  );
}

export function RegionCertification() {
  const { country } = useSiteRegion();
  return <>{country === "AG" ? "UL" : country === "DM" ? "CE" : "UL/CE"}</>;
}

/** Decorative beside the country name; local SVG avoids emoji/font differences. */
export function RegionFlag({
  country,
  large = false,
}: {
  country: ServiceCountry;
  large?: boolean;
}) {
  return (
    <Image
      src={`/flags/${country.toLowerCase()}.svg`}
      alt=""
      aria-hidden="true"
      width={large ? 48 : 24}
      height={large ? 36 : 18}
      unoptimized
      className={large ? styles.flagLarge : styles.flag}
    />
  );
}
