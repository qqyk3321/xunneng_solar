"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-namespace -- Maps API custom element JSX declarations require this shape. */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gmp-map": {
        id?: string;
        className?: string;
        zoom?: string;
        "map-id"?: string;
        ref?: React.Ref<HTMLElement>;
        children?: React.ReactNode;
      };
      "gmp-advanced-marker": {
        ref?: React.Ref<HTMLElement>;
      };
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

type Selection = {
  address: string;
  placeId: string;
  latitude?: number;
  longitude?: number;
  source: "Address search" | "Map selection";
};

export type ConfirmedGoogleMapLocation = {
  address: string;
  lat: number;
  lng: number;
  source: "address_search" | "map_click";
};

type PlacePickerElement = HTMLElement & {
  value?: {
    formattedAddress?: string;
    id?: string;
    location?: { lat: () => number; lng: () => number };
  } | null;
};

type MapElement = HTMLElement & {
  center?: { lat: number; lng: number };
  zoom?: number;
  innerMap?: {
    addListener: (
      eventName: string,
      handler: (event: {
        latLng?: { lat: () => number; lng: () => number };
      }) => void,
    ) => { remove: () => void };
  };
};

export function GoogleMapsAddressSelection({
  apiKey,
  enableMapPointSelection = false,
  embedded = false,
  onConfirmed,
}: {
  apiKey: string;
  enableMapPointSelection?: boolean;
  embedded?: boolean;
  onConfirmed?: (location: ConfirmedGoogleMapLocation) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [library, setLibrary] = useState<
    typeof import("@googlemaps/extended-component-library/react") | null
  >(null);
  const mapRef = useRef<MapElement | null>(null);
  const markerRef = useRef<
    (HTMLElement & { position?: { lat: number; lng: number } }) | null
  >(null);

  useEffect(() => {
    let active = true;

    import("@googlemaps/extended-component-library/react")
      .then((loadedLibrary) => {
        if (active) setLibrary(loadedLibrary);
      })
      .catch(() => {
        if (active)
          setError("Google Maps could not load. Please refresh and try again.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const position =
      selection?.latitude != null && selection.longitude != null
        ? { lat: selection.latitude, lng: selection.longitude }
        : { lat: 31.2304, lng: 121.4737 };

    customElements.whenDefined("gmp-map").then(() => {
      if (mapRef.current) {
        // Map clicks only update the marker, preserving the current view.
        if (!selection || selection.source === "Address search") {
          mapRef.current.center = position;
          mapRef.current.zoom = selection ? 16 : 11;
        }
      }
    });

    if (selection?.latitude == null || selection.longitude == null) return;

    customElements.whenDefined("gmp-advanced-marker").then(() => {
      if (markerRef.current) markerRef.current.position = position;
    });
  }, [selection]);

  useEffect(() => {
    if (!enableMapPointSelection || !library) return;

    let cancelled = false;
    let clickListener: { remove: () => void } | undefined;

    const attachMapClickListener = async () => {
      const { APILoader } =
        await import("@googlemaps/extended-component-library/api_loader.js");
      await APILoader.importLibrary("maps");
      await customElements.whenDefined("gmp-map");

      for (let attempt = 0; attempt < 100 && !cancelled; attempt += 1) {
        const innerMap = mapRef.current?.innerMap;
        if (innerMap) {
          clickListener = innerMap.addListener("click", (event) => {
            const latitude = event.latLng?.lat();
            const longitude = event.latLng?.lng();
            if (latitude == null || longitude == null) return;

            setSelection({
              address: "Full address will be confirmed next",
              placeId: "",
              latitude,
              longitude,
              source: "Map selection",
            });
            setError("");
          });
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
    };

    void attachMapClickListener();
    return () => {
      cancelled = true;
      clickListener?.remove();
    };
  }, [enableMapPointSelection, library]);

  const handlePlaceChange = (event: Event) => {
    const picker = event.currentTarget as PlacePickerElement;
    const place = picker.value;

    if (!place) {
      setSelection(null);
      return;
    }

    const latitude = place.location?.lat();
    const longitude = place.location?.lng();
    setSelection({
      address: place.formattedAddress ?? "No formatted address returned",
      placeId: place.id ?? "",
      latitude,
      longitude,
      source: "Address search",
    });
    setError("");
  };

  const handleCheckout = async () => {
    if (!selection) return;

    const finishCheckout = (place: Selection) => {
      if (place.latitude == null || place.longitude == null) return;
      setIsCheckoutOpen(true);
    };

    if (selection.source !== "Map selection") {
      finishCheckout(selection);
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      if (selection.latitude == null || selection.longitude == null) {
        throw new Error("Selected coordinates are missing");
      }

      const response = await fetch("/api/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: selection.latitude,
          lng: selection.longitude,
        }),
      });
      const payload = (await response.json()) as {
        address?: string;
        placeId?: string;
        error?: string;
        providerStatus?: string;
      };
      if (!response.ok || !payload.address) {
        throw new Error(
          payload.providerStatus ?? payload.error ?? "Reverse geocoding failed",
        );
      }

      const confirmedPlace = {
        ...selection,
        address: payload.address,
        placeId: payload.placeId ?? "",
      };
      setSelection(confirmedPlace);
      finishCheckout(confirmedPlace);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "UNKNOWN";
      setError(
        `Address lookup failed (Google: ${detail}). Please check the server API key configuration.`,
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFinalConfirmation = () => {
    if (!selection || selection.latitude == null || selection.longitude == null)
      return;

    if (onConfirmed) {
      onConfirmed({
        address: selection.address,
        lat: selection.latitude,
        lng: selection.longitude,
        source:
          selection.source === "Address search"
            ? "address_search"
            : "map_click",
      });
      return;
    }

    setIsCheckoutOpen(false);
  };

  if (!apiKey) {
    return (
      <div className={!embedded ? "tailwind-scope" : undefined}>
        <main
          className={
            embedded ? "w-full" : "min-h-screen bg-background p-space-xl"
          }
        >
          <section
            className={`rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-xl shadow-[0_12px_24px_-6px_rgba(0,122,135,0.08),0_4px_8px_-2px_rgba(15,23,42,0.03)]${embedded ? "" : " mx-auto max-w-[1360px]"}`}
          >
            <p className="mb-space-2xs font-label-md text-label-md font-bold uppercase tracking-wider text-primary">
              Google Maps Platform
            </p>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              API key not found
            </h1>
            <p className="mt-space-sm font-body-md text-body-md text-on-surface-variant">
              Set `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` in `.env`, then restart
              the development server.
            </p>
            <Link
              href="/"
              className="mt-space-lg inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-low px-space-md py-space-xs font-label-md text-body-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary-fixed/30"
            >
              Back to home
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const markerPosition =
    selection?.latitude != null && selection.longitude != null
      ? `${selection.latitude},${selection.longitude}`
      : undefined;
  const APILoader = library?.APILoader;
  const PlacePicker = library?.PlacePicker;

  return (
    <div className={!embedded ? "tailwind-scope" : undefined}>
      <main
        className={
          embedded ? "w-full" : "min-h-screen bg-background p-space-xl"
        }
      >
        <section
          className={
            embedded
              ? "w-full"
              : "mx-auto max-w-[1360px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-xl shadow-[0_12px_24px_-6px_rgba(0,122,135,0.08),0_4px_8px_-2px_rgba(15,23,42,0.03)]"
          }
        >
          <div className="mb-space-lg flex flex-col gap-space-md md:mb-space-xl md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-space-2xs font-label-md text-label-md font-bold uppercase tracking-wider text-primary">
                {embedded
                  ? "Step 1 · Installation location"
                  : "Standalone test · Google Maps ECL"}
              </p>
              <div className="flex flex-wrap items-center gap-space-xs">
                <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">
                  {embedded
                    ? "Choose your installation location"
                    : "Address selection"}
                </h1>
                {!embedded && (
                  <span className="rounded-full border border-primary-fixed bg-primary-fixed/30 px-space-sm py-space-2xs font-label-sm text-label-sm font-bold text-on-primary-fixed-variant">
                    {enableMapPointSelection ? "v0.3.2" : "v0.2.1"}
                  </span>
                )}
              </div>
              <p className="mt-space-sm max-w-2xl font-body-md text-body-md leading-relaxed text-on-surface-variant">
                {enableMapPointSelection
                  ? "Search for an address or click anywhere on the map. Both methods update the marker and final coordinates."
                  : "Search for and select an address to centre the map and place a marker."}
              </p>
            </div>
            {!embedded && (
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-low px-space-md py-space-xs font-label-md text-body-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary-fixed/30"
              >
                Back to home
              </Link>
            )}
          </div>

          {APILoader && (
            <APILoader
              apiKey={apiKey}
              version="beta"
              language="en"
              region="GB"
            />
          )}

          <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-[minmax(300px,0.85fr)_minmax(460px,1.5fr)]">
            <section className="flex min-h-[520px] flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-[0_1px_3px_0_rgba(0,122,135,0.04),0_1px_2px_-1px_rgba(15,23,42,0.06)]">
              <label
                className="font-label-md text-body-sm font-bold text-on-surface-variant"
                htmlFor="address-picker"
              >
                Installation address
              </label>
              {PlacePicker ? (
                <PlacePicker
                  id="address-picker"
                  forMap="address-selection-map"
                  type="address"
                  placeholder="Enter an address, for example: 10 Downing Street, London"
                  onPlaceChange={handlePlaceChange}
                  onRequestError={() =>
                    setError(
                      "Address search failed. Check the Places API, billing, and HTTP referrer restrictions on the API key.",
                    )
                  }
                />
              ) : (
                <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
                  Loading Google Maps address search…
                </p>
              )}
              <p className="mt-space-sm font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                {enableMapPointSelection
                  ? "Choose a suggested address, or click anywhere on the map."
                  : "Choose an item from the suggested addresses to get its full address and coordinates."}
              </p>

              {error && (
                <p className="mt-space-sm font-body-sm text-body-sm leading-relaxed text-error">
                  {error}
                </p>
              )}

              <div
                className="mt-space-lg grid gap-space-xs rounded-lg border border-primary-fixed/60 bg-primary-fixed/20 p-space-md"
                aria-live="polite"
              >
                <span className="font-label-md text-body-sm font-bold uppercase tracking-wider text-primary">
                  Your selection
                </span>
                {selection ? (
                  <>
                    <strong className="font-headline-sm text-body-md text-on-surface">
                      {selection.address}
                    </strong>
                    <code className="font-mono text-[12px] leading-relaxed text-on-surface-variant">
                      Source: {selection.source}
                    </code>
                    <code className="font-mono text-[12px] leading-relaxed text-on-surface-variant">
                      placeId: {selection.placeId || "—"}
                    </code>
                    <code className="font-mono text-[12px] leading-relaxed text-on-surface-variant">
                      Coordinates: {selection.latitude?.toFixed(6) ?? "—"},{" "}
                      {selection.longitude?.toFixed(6) ?? "—"}
                    </code>
                  </>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    No address selected yet
                  </p>
                )}
              </div>

              <button
                className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-container px-space-lg py-space-sm font-label-md text-body-md font-bold text-on-primary shadow-[0_4px_14px_rgba(0,122,135,0.25)] transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selection}
                onClick={handleCheckout}
                type="button"
              >
                {isConfirming ? "Confirming address…" : "Confirm selection"}
              </button>
            </section>

            <section
              className="min-h-[520px] overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_1px_3px_0_rgba(0,122,135,0.04),0_1px_2px_-1px_rgba(15,23,42,0.06)]"
              aria-label="Google map"
            >
              <gmp-map
                id="address-selection-map"
                ref={mapRef}
                className="block h-[520px] w-full"
                map-id="DEMO_MAP_ID"
              >
                {markerPosition && <gmp-advanced-marker ref={markerRef} />}
              </gmp-map>
            </section>
          </div>
        </section>

        {isCheckoutOpen && selection && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/65 p-space-md backdrop-blur-sm"
            role="presentation"
            onMouseDown={() => setIsCheckoutOpen(false)}
          >
            <section
              aria-labelledby="maps-demo-checkout-title"
              aria-modal="true"
              className="w-full max-w-[560px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-xl shadow-[0_24px_48px_-12px_rgba(15,23,42,0.16),0_0_0_1px_rgba(15,23,42,0.05)]"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <p className="mb-space-2xs font-label-md text-label-md font-bold uppercase tracking-wider text-primary">
                Location confirmed
              </p>
              <h2
                id="maps-demo-checkout-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Confirm your location
              </h2>
              <dl className="my-space-lg grid gap-space-sm">
                <div className="grid gap-space-2xs rounded-lg border border-outline-variant/30 bg-surface-container-low p-space-sm">
                  <dt className="font-label-md text-body-sm font-bold text-on-surface-variant">
                    Full address
                  </dt>
                  <dd className="m-0 font-body-md text-body-md leading-relaxed text-on-surface">
                    {selection.address}
                  </dd>
                </div>
                <div className="grid gap-space-2xs rounded-lg border border-outline-variant/30 bg-surface-container-low p-space-sm">
                  <dt className="font-label-md text-body-sm font-bold text-on-surface-variant">
                    Selection method
                  </dt>
                  <dd className="m-0 font-body-md text-body-md text-on-surface">
                    {selection.source}
                  </dd>
                </div>
                <div className="grid gap-space-2xs rounded-lg border border-outline-variant/30 bg-surface-container-low p-space-sm">
                  <dt className="font-label-md text-body-sm font-bold text-on-surface-variant">
                    Latitude
                  </dt>
                  <dd className="m-0 font-body-md text-body-md text-on-surface">
                    {selection.latitude?.toFixed(6) ?? "—"}
                  </dd>
                </div>
                <div className="grid gap-space-2xs rounded-lg border border-outline-variant/30 bg-surface-container-low p-space-sm">
                  <dt className="font-label-md text-body-sm font-bold text-on-surface-variant">
                    Longitude
                  </dt>
                  <dd className="m-0 font-body-md text-body-md text-on-surface">
                    {selection.longitude?.toFixed(6) ?? "—"}
                  </dd>
                </div>
              </dl>
              {onConfirmed ? (
                <div className="flex flex-col gap-space-sm sm:flex-row sm:justify-end">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-low px-space-md py-space-xs font-label-md text-body-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary-fixed/30"
                    onClick={() => setIsCheckoutOpen(false)}
                    type="button"
                  >
                    Choose again
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-container px-space-md py-space-xs font-label-md text-body-sm font-bold text-on-primary shadow-[0_4px_14px_rgba(0,122,135,0.25)] transition-colors hover:bg-primary"
                    onClick={handleFinalConfirmation}
                    type="button"
                  >
                    Confirm and continue
                  </button>
                </div>
              ) : (
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-container px-space-md py-space-xs font-label-md text-body-sm font-bold text-on-primary shadow-[0_4px_14px_rgba(0,122,135,0.25)] transition-colors hover:bg-primary"
                  onClick={() => setIsCheckoutOpen(false)}
                  type="button"
                >
                  Close
                </button>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
