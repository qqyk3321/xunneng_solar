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
  regionIntentPath,
  type RegionIntent,
} from "@/lib/site-region-routing";
import Image from "next/image";
import {
  SERVICE_COUNTRIES,
  type ServiceCountry,
} from "@/lib/consultation-intake";
import styles from "./site-region.module.css";
import { UPCOMING_ISLANDS, UPCOMING_SHORT_NAMES } from "@/lib/upcoming-islands";

const RegionContext = createContext<{
  country: ServiceCountry | null;
  ready: boolean;
  open: boolean;
  choose: (intent?: RegionIntent) => void;
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
    RegionIntent | undefined
  >();
  const [navigating, setNavigating] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const navigationFrame = useRef<number | undefined>(undefined);
  useEffect(() => {
    setManual(false);
    setNavigating(false);
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
  function choose(nextIntent?: RegionIntent) {
    opener.current = document.activeElement as HTMLElement;
    setIntent(nextIntent);
    setManual(true);
  }
  function selectCountry(nextCountry: ServiceCountry) {
    if (navigating) return;
    if (
      country &&
      nextCountry !== country &&
      pathname.endsWith("/consultation") &&
      !window.confirm(
        "Changing location restarts your assessment and clears the current unsent form. Continue?",
      )
    ) {
      return;
    }
    setManual(false);
    // Native modal dialogs sit above every CSS z-index. Close before showing
    // the already-mounted loader, then give the browser a frame to paint it.
    dialog.current?.close();
    const destination = intent
      ? regionIntentPath(nextCountry, intent)
      : switchedRegionPath(pathname, nextCountry);
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
        <div
          className={styles.options}
          role="group"
          aria-label="Installation location"
        >
          {(["AG", "DM"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => selectCountry(code)}
            >
              <RegionFlag country={code} large />
              <strong>{SERVICE_COUNTRIES[code].label}</strong>
              <small>
                {code === "AG"
                  ? "Antigua & Barbuda"
                  : "Commonwealth of Dominica"}
              </small>
            </button>
          ))}
        </div>
        <section
          className={styles.coming}
          aria-label="Coming soon — not yet available"
        >
          <strong>More island locations are coming soon.</strong>
          <ul className={styles.upcomingLocations}>
            {Object.entries(UPCOMING_ISLANDS).map(([code, name]) => (
              <li
                key={code}
                aria-disabled="true"
                aria-label={name}
                title={name}
              >
                <Image
                  src={`/flags/${code.toLowerCase()}.svg`}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={18}
                  unoptimized
                />
                <span className={styles.fullName}>{name}</span>
                <span className={styles.shortName} aria-hidden="true">
                  {
                    UPCOMING_SHORT_NAMES[
                      code as keyof typeof UPCOMING_SHORT_NAMES
                    ]
                  }
                </span>
              </li>
            ))}
          </ul>
        </section>
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
