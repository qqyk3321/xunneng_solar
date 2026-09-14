"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddressDetailsFields } from "./address-details-fields";
import { normalizeParish } from "@/lib/service-parishes";
import {
  findMapAddresses,
  type MapAddressCandidate,
} from "@/lib/map-address-search";
import {
  EMPTY_ADDRESS,
  parseAddressComponents,
  addressSummary,
  type AddressDetails,
  type AddressComponent,
} from "@/lib/address-details";

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
  pickRevision?: number;
  addressResolved?: boolean;
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
  addressDetails?: AddressDetails;
  mapAddress?: string;
};

type PlacePickerElement = HTMLElement & {
  value?: {
    formattedAddress?: string;
    id?: string;
    addressComponents?: AddressComponent[];
    location?: { lat: () => number; lng: () => number };
  } | null;
};

type MapElement = HTMLElement & {
  center?: { lat: number; lng: number };
  zoom?: number;
  innerMap?: {
    fitBounds?: (bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }) => void;
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
  initialCenter,
  countryName,
  region = "GB",
  addressPlaceholder = "Enter an address, for example: 10 Downing Street, London",
  onConfirmed,
}: {
  apiKey: string;
  enableMapPointSelection?: boolean;
  embedded?: boolean;
  initialCenter?: { lat: number; lng: number };
  countryName?: string;
  region?: string;
  addressPlaceholder?: string;
  onConfirmed?: (location: ConfirmedGoogleMapLocation) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [candidates, setCandidates] = useState<MapAddressCandidate[]>([]);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapNotice, setMapNotice] = useState("");
  const [pinReviewed, setPinReviewed] = useState(false);
  const [details, setDetails] = useState<AddressDetails>({ ...EMPTY_ADDRESS });
  const editedFields = useRef(new Set<keyof AddressDetails>());
  const detailsForm = useRef<HTMLFormElement>(null);
  const selectionVersion = useRef(0);
  useEffect(
    () => () => {
      selectionVersion.current += 1;
    },
    [],
  );
  const fillAddress = useCallback(
    (components: AddressComponent[] = []) => {
      const parsed = parseAddressComponents(components);
      if (countryName)
        parsed.district = normalizeParish(parsed.district, region);
      setDetails(
        (current) =>
          Object.fromEntries(
            Object.keys(parsed).map((key) => [
              key,
              editedFields.current.has(key as keyof AddressDetails)
                ? current[key as keyof AddressDetails]
                : parsed[key as keyof AddressDetails],
            ]),
          ) as AddressDetails,
      );
    },
    [countryName, region],
  );
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
        : (initialCenter ?? { lat: 31.2304, lng: 121.4737 });

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
  }, [selection, initialCenter]);

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

            selectionVersion.current += 1;
            setCandidates([]);
            setMapSearching(false);
            setPinReviewed(false);
            setMapNotice("Looking up the address for this pin…");
            setIsCheckoutOpen(false);
            fillAddress();

            setSelection({
              pickRevision: selectionVersion.current,
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

    void attachMapClickListener().catch(() => {
      if (!cancelled)
        setError("The map could not load. Please refresh or try again later.");
    });
    return () => {
      cancelled = true;
      clickListener?.remove();
    };
  }, [enableMapPointSelection, library, fillAddress]);

  const pinLat = selection?.latitude;
  const pinLng = selection?.longitude;
  const pinSource = selection?.source;
  const pinRevision = selection?.pickRevision;
  useEffect(() => {
    if (
      !countryName ||
      pinSource !== "Map selection" ||
      pinLat == null ||
      pinLng == null
    )
      return;
    const controller = new AbortController();
    const version = selectionVersion.current;
    setIsConfirming(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/reverse-geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pinLat, lng: pinLng }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        const payload = (await response.json()) as {
          address?: string;
          placeId?: string;
          addressComponents?: AddressComponent[];
        };
        if (controller.signal.aborted || version !== selectionVersion.current)
          return;
        if (!response.ok || !payload.address) throw new Error("lookup_failed");
        fillAddress(payload.addressComponents);
        setSelection((current) =>
          current
            ? {
                ...current,
                address: payload.address!,
                placeId: payload.placeId ?? "",
                addressResolved: true,
              }
            : current,
        );
        setMapNotice(
          "Address details updated from the map. Your manually entered fields have been kept. Please review them before using this location.",
        );
        setError("");
      } catch {
        if (
          !controller.signal.aborted &&
          version === selectionVersion.current
        ) {
          setMapNotice(
            "We couldn’t fill the address automatically. Your pin is saved on this page; enter the missing details manually.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsConfirming(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
      setIsConfirming(false);
    };
  }, [countryName, pinLat, pinLng, pinSource, pinRevision, fillAddress]);

  async function searchMap(parish?: string) {
    if (!countryName) return;
    if (!parish && !normalizeParish(details.district, region)) {
      setError("Please select your parish first.");
      return;
    }
    if (!parish && !details.town.trim() && !details.street.trim()) {
      setError("Enter a town or street before searching the map.");
      return;
    }
    const version = ++selectionVersion.current;
    setCandidates([]);
    setMapSearching(true);
    setIsCheckoutOpen(false);
    setPinReviewed(false);
    setError("");
    setMapNotice(
      parish ? "Finding the parish area…" : "Finding possible locations…",
    );
    // Provider promises cannot be cancelled; the version check discards stale results.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const query = parish
        ? `${parish} Parish, ${countryName}`
        : [
            details.street,
            details.town,
            details.district,
            details.postalCode,
            countryName,
          ]
            .filter(Boolean)
            .join(", ");
      const matches = await Promise.race([
        findMapAddresses(query, region),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("timeout")), 12000);
        }),
      ]);
      if (version !== selectionVersion.current) return;
      if (!matches.length) throw new Error("no_results");
      if (parish) {
        const match = matches[0];
        if (mapRef.current) {
          mapRef.current.center = { lat: match.lat, lng: match.lng };
          mapRef.current.zoom = 12;
          if (match.viewport)
            mapRef.current.innerMap?.fitBounds?.(match.viewport);
        }
        setMapNotice(
          "Showing the parish area, not a property location. Search your address or click the map to place a pin.",
        );
      } else {
        setCandidates(matches);
        setMapNotice(
          "Choose a possible location below, then check or adjust the pin on the map.",
        );
      }
    } catch {
      if (version === selectionVersion.current)
        setMapNotice(
          "We couldn’t locate this address. Try a nearby town or street, or place the pin directly on the map.",
        );
    } finally {
      clearTimeout(timeout);
      if (version === selectionVersion.current) setMapSearching(false);
    }
  }

  function chooseCandidate(candidate: MapAddressCandidate) {
    selectionVersion.current += 1;
    setMapSearching(false);
    setPinReviewed(false);
    setCandidates([]);
    fillAddress(candidate.components);
    setSelection({
      address: candidate.address,
      placeId: candidate.id,
      latitude: candidate.lat,
      longitude: candidate.lng,
      source: "Address search",
    });
    setMapNotice(
      "This is a suggested position, not a verified property. Adjust the pin if needed, then use this location.",
    );
  }

  const handlePlaceChange = (event: Event) => {
    selectionVersion.current += 1;
    setIsCheckoutOpen(false);
    const picker = event.currentTarget as PlacePickerElement;
    const place = picker.value;

    if (!place) {
      setSelection(null);
      fillAddress();
      return;
    }

    const latitude = place.location?.lat();
    const longitude = place.location?.lng();
    fillAddress(place.addressComponents);
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
    if (!selection || isConfirming) return;
    if (countryName && !normalizeParish(details.district, region)) {
      setError("Please select your parish first.");
      return;
    }
    const version = selectionVersion.current;

    const finishCheckout = (place: Selection) => {
      if (place.latitude == null || place.longitude == null) return;
      if (countryName) {
        setPinReviewed(true);
        setMapNotice(
          "Location selected. Review the address on the left, including any details you entered, then continue.",
        );
        return;
      }
      setIsCheckoutOpen(true);
    };

    if (selection.source !== "Map selection" || selection.addressResolved) {
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
        addressComponents?: AddressComponent[];
        placeId?: string;
        error?: string;
        providerStatus?: string;
      };
      if (version !== selectionVersion.current) return;
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
      fillAddress(payload.addressComponents);
      finishCheckout(confirmedPlace);
    } catch (error) {
      if (version !== selectionVersion.current) return;
      if (countryName) {
        setError(
          "Google could not find a street address here. You can continue with your map pin and the address details you entered.",
        );
        finishCheckout(selection);
        return;
      }
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
    if (
      countryName &&
      (!details.town.trim() || !normalizeParish(details.district, region))
    )
      return;

    if (onConfirmed) {
      onConfirmed({
        address: countryName
          ? addressSummary(details, countryName)
          : selection.address,
        ...(countryName
          ? {
              addressDetails: Object.fromEntries(
                Object.entries(details).map(([key, value]) => [
                  key,
                  value.trim(),
                ]),
              ) as AddressDetails,
              mapAddress: selection.address,
            }
          : {}),
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
                  ? "Installation location"
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
                {countryName
                  ? "Enter your address details and click the map to mark your property. Please review both before continuing."
                  : enableMapPointSelection
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
              region={region}
            />
          )}

          <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-[minmax(300px,0.85fr)_minmax(460px,1.5fr)]">
            <section className="flex min-h-[520px] flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-[0_1px_3px_0_rgba(0,122,135,0.04),0_1px_2px_-1px_rgba(15,23,42,0.06)]">
              {!countryName && (
                <>
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
                      placeholder={addressPlaceholder}
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
                </>
              )}

              {error && (
                <p className="mt-space-sm font-body-sm text-body-sm leading-relaxed text-error">
                  {error}
                </p>
              )}

              {!countryName && (
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
                      {!countryName && (
                        <code className="font-mono text-[12px] leading-relaxed text-on-surface-variant">
                          placeId: {selection.placeId || "—"}
                        </code>
                      )}
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
              )}

              {countryName && (
                <form
                  ref={detailsForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCheckout();
                  }}
                >
                  <AddressDetailsFields
                    country={countryName}
                    countryCode={region}
                    value={details}
                    onChange={(key, value) => {
                      editedFields.current.add(key);
                      setDetails((current) => ({ ...current, [key]: value }));
                      selectionVersion.current += 1;
                      setCandidates([]);
                      setMapSearching(false);
                      setIsCheckoutOpen(false);
                      if (key !== "building" && key !== "directions") {
                        setPinReviewed(false);
                        setMapNotice(
                          "Address changed. Find it on the map or review your existing pin before using this location.",
                        );
                      }
                      if (key === "district") {
                        setSelection(null);
                        if (value) void searchMap(value);
                      }
                    }}
                  />
                </form>
              )}

              {countryName && (
                <div className="mb-space-md">
                  <button
                    type="button"
                    className="w-full rounded-lg border border-primary px-space-md py-space-sm font-bold text-primary disabled:opacity-50"
                    disabled={
                      mapSearching ||
                      isConfirming ||
                      !normalizeParish(details.district, region) ||
                      (!details.town.trim() && !details.street.trim())
                    }
                    onClick={() => void searchMap()}
                  >
                    {mapSearching ? "Finding…" : "Find on map"}
                  </button>
                  {candidates.length > 0 && (
                    <ul
                      className="mt-space-sm grid list-none gap-space-xs p-0"
                      aria-label="Possible locations"
                    >
                      {candidates.map((candidate) => (
                        <li key={candidate.id}>
                          <button
                            className="w-full rounded-lg border border-outline-variant p-space-sm text-left text-body-sm"
                            type="button"
                            onClick={() => chooseCandidate(candidate)}
                          >
                            {candidate.address}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {countryName && (
                <p className="mb-space-md text-body-sm" role="status">
                  {mapNotice ||
                    (selection
                      ? "Map pin placed. Please confirm it marks your property."
                      : "Click the map to place your property pin before continuing.")}
                </p>
              )}

              <button
                className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-container px-space-lg py-space-sm font-label-md text-body-md font-bold text-on-primary shadow-[0_4px_14px_rgba(0,122,135,0.25)] transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  (countryName && !normalizeParish(details.district, region)) ||
                  !selection ||
                  selection.latitude == null ||
                  selection.longitude == null ||
                  isConfirming ||
                  mapSearching
                }
                onClick={handleCheckout}
                type="button"
              >
                {isConfirming
                  ? "Checking location…"
                  : countryName
                    ? "Use this location"
                    : "Confirm selection"}
              </button>
              {countryName && (
                <button
                  type="button"
                  className="mt-space-sm w-full rounded-lg bg-primary px-space-md py-space-sm font-bold text-on-primary disabled:opacity-50"
                  disabled={!pinReviewed || isConfirming || mapSearching}
                  onClick={() => {
                    if (detailsForm.current?.reportValidity())
                      setIsCheckoutOpen(true);
                  }}
                >
                  Review and continue
                </button>
              )}
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
                    {countryName
                      ? addressSummary(details, countryName)
                      : selection.address}
                  </dd>
                </div>
                {countryName && details.directions && (
                  <div>
                    <dt className="font-bold">Landmark / directions</dt>
                    <dd className="m-0 whitespace-pre-wrap">
                      {details.directions}
                    </dd>
                  </div>
                )}
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
