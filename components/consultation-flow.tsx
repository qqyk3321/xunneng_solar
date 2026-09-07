"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, MapPin, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  GoogleMapsAddressSelection,
  type ConfirmedGoogleMapLocation,
} from "@/components/google-maps-address-selection";

type Step = "location" | "form" | "thanks";

type SelectedPlace = {
  address: string;
  lat: number;
  lng: number;
  locationJson: string;
};

const TALLY_FORM_ID = process.env.NEXT_PUBLIC_TALLY_FORM_ID?.trim();

export function ConsultationFlow({ apiKey }: { apiKey: string }) {
  const [step, setStep] = useState<Step>("location");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null,
  );

  if (!TALLY_FORM_ID) {
    throw new Error("Missing NEXT_PUBLIC_TALLY_FORM_ID");
  }

  return (
    <div className="tailwind-scope">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(151,240,255,0.48),transparent_30%),linear-gradient(180deg,#f2f3ff_0%,#faf8ff_42%,#eaedff_100%)] px-margin-mobile py-space-xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-2xl">
        <section
          className="mx-auto max-w-[1360px]"
          aria-label="Consultation details"
        >
          <header className="mb-space-xl flex flex-col gap-space-lg md:mb-space-2xl md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-space-2xs font-label-md text-label-md font-bold uppercase tracking-wider text-primary">
                Xunneng Solar · Consultation
              </p>
              <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                Start your assessment
              </h1>
            </div>
            <StepMeter step={step} />
          </header>

          {step === "location" && (
            <LocationStep
              apiKey={apiKey}
              onConfirm={(place) => {
                setSelectedPlace(place);
                setStep("form");
              }}
            />
          )}

          {step === "form" && selectedPlace && (
            <FormStep
              place={selectedPlace}
              onBack={() => setStep("location")}
              onSubmitted={() => setStep("thanks")}
            />
          )}

          {step === "thanks" && selectedPlace && (
            <ThanksModal
              place={selectedPlace}
              onClose={() => {
                setSelectedPlace(null);
                setStep("location");
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function StepMeter({ step }: { step: Step }) {
  const steps = [
    { id: "location", label: "Location" },
    { id: "form", label: "Details" },
    { id: "thanks", label: "Complete" },
  ] as const;
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol
      className="m-0 flex list-none gap-space-xs overflow-x-auto p-0 pb-1"
      aria-label="Progress"
    >
      {steps.map((item, index) => (
        <li
          className={`flex min-h-9 flex-none items-center gap-space-xs rounded-full border px-space-sm py-space-2xs font-body-sm text-body-sm transition-colors ${
            index <= activeIndex
              ? "border-primary-container bg-surface-container-lowest font-bold text-on-surface shadow-sm"
              : "border-outline-variant/50 bg-surface-container-low text-on-surface-variant"
          }`}
          key={item.id}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-label-sm text-label-sm ${
              index <= activeIndex
                ? "bg-primary-container text-on-primary"
                : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            {index + 1}
          </span>
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function LocationStep({
  apiKey,
  onConfirm,
}: {
  apiKey: string;
  onConfirm: (place: SelectedPlace) => void;
}) {
  const handleConfirmedLocation = (location: ConfirmedGoogleMapLocation) => {
    const locationPayload = {
      ...location,
      capturedAt: new Date().toISOString(),
    };

    onConfirm({
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      locationJson: JSON.stringify(locationPayload),
    });
  };

  return (
    <GoogleMapsAddressSelection
      apiKey={apiKey}
      embedded
      enableMapPointSelection
      onConfirmed={handleConfirmedLocation}
    />
  );
}

function FormStep({
  place,
  onBack,
  onSubmitted,
}: {
  place: SelectedPlace;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const tallyUrl = useMemo(() => {
    const url = new URL(`https://tally.so/embed/${TALLY_FORM_ID}`);
    url.searchParams.set("alignLeft", "1");
    url.searchParams.set("hideTitle", "1");
    url.searchParams.set("transparentBackground", "1");
    url.searchParams.set("dynamicHeight", "1");
    url.searchParams.set("location_json", place.locationJson);
    return url.toString();
  }, [place]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        typeof event.data !== "string" ||
        !event.data.includes("Tally.FormSubmitted")
      )
        return;

      try {
        const message = JSON.parse(event.data) as {
          event?: string;
          payload?: { formId?: string };
        };
        if (
          message.event === "Tally.FormSubmitted" &&
          message.payload?.formId === TALLY_FORM_ID
        ) {
          onSubmitted();
        }
      } catch {
        onSubmitted();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSubmitted]);

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md shadow-[0_12px_24px_-6px_rgba(0,122,135,0.08),0_4px_8px_-2px_rgba(15,23,42,0.03)] md:p-space-lg">
      <Script
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
      />
      <div className="mb-space-md flex flex-col gap-space-sm md:flex-row md:items-center md:justify-between">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-space-xs rounded-lg border border-outline-variant/60 bg-surface-container-low px-space-md py-space-xs font-label-md text-body-sm font-bold text-primary transition-all hover:border-primary hover:bg-primary-fixed/30"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-[18px] w-[18px]" />
          Change location
        </button>
        <div className="flex min-w-0 items-center gap-space-xs rounded-lg bg-primary-fixed/30 px-space-md py-space-xs text-on-surface-variant">
          <MapPin
            aria-hidden="true"
            className="h-[18px] w-[18px] shrink-0 text-primary"
          />
          <span className="truncate font-body-sm text-body-sm">
            {place.address}
          </span>
        </div>
      </div>
      <iframe
        className="block min-h-[720px] w-full rounded-lg border-0"
        data-tally-src={tallyUrl}
        height="720"
        src={tallyUrl}
        title="Assessment details form"
        width="100%"
      />
    </div>
  );
}

function ThanksModal({
  place,
  onClose,
}: {
  place: SelectedPlace;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div
      className="tailwind-scope fixed inset-0 z-50 flex items-center justify-center bg-on-surface/65 p-space-md backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-labelledby="thanks-title"
        aria-modal="true"
        className="relative w-full max-w-[440px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-xl text-center shadow-[0_24px_48px_-12px_rgba(15,23,42,0.16),0_0_0_1px_rgba(15,23,42,0.05)]"
        role="dialog"
      >
        <button
          aria-label="Close"
          className="absolute right-space-md top-space-md inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
          onClick={() => router.push("/")}
          type="button"
        >
          <X aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
        <div className="mb-space-lg inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed/40 text-primary">
          <Send aria-hidden="true" className="h-7 w-7" />
        </div>
        <p className="mb-space-2xs font-label-md text-label-md font-bold uppercase tracking-wider text-primary">
          Submission received
        </p>
        <h2
          id="thanks-title"
          className="font-headline-md text-headline-md font-bold text-on-surface"
        >
          Thank you for your submission
        </h2>
        <p className="mt-space-md font-body-md text-body-md leading-relaxed text-on-surface-variant">
          Our team will review your details and send your tailored proposal and
          quotation by email. You can also reply to that email if you need
          further assistance.
        </p>
        <div className="my-space-lg flex items-center gap-space-xs rounded-lg bg-surface-container-low px-space-md py-space-sm text-left text-on-surface-variant">
          <MapPin
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-primary"
          />
          <span className="font-body-sm text-body-sm leading-relaxed">
            {place.address}
          </span>
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-space-xs rounded-lg bg-primary-container px-space-lg py-space-sm font-label-md text-body-md font-bold text-on-primary shadow-[0_4px_14px_rgba(0,122,135,0.25)] transition-all hover:bg-primary"
          onClick={() => {
            onClose();
            router.push("/");
          }}
          type="button"
        >
          <Check aria-hidden="true" className="h-[18px] w-[18px]" />
          Back to home
        </button>
      </div>
    </div>
  );
}
