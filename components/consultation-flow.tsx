"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, FileJson, MapPin, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Step = "location" | "form" | "thanks";

type SelectedPlace = {
  address: string;
  lat: number;
  lng: number;
  locationJson: string;
};

type DraftLocation = {
  address: string;
  lat: number;
  lng: number;
};

const TALLY_FORM_ID = "QKQpNX";

export function ConsultationFlow() {
  const [step, setStep] = useState<Step>("location");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);

  return (
    <main className="shell">
      <section className="workspace" aria-label="家庭设备与位置收集">
        <header className="topbar">
          <div>
            <p className="kicker">Xunneng Solar</p>
            <h1>方案咨询收集</h1>
          </div>
          <StepMeter step={step} />
        </header>

        {step === "location" && (
          <LocationStep
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
  );
}

function StepMeter({ step }: { step: Step }) {
  const steps = [
    { id: "location", label: "位置" },
    { id: "form", label: "表单" },
    { id: "thanks", label: "完成" },
  ] as const;
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="steps" aria-label="进度">
      {steps.map((item, index) => (
        <li className={index <= activeIndex ? "active" : ""} key={item.id}>
          <span>{index + 1}</span>
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function LocationStep({ onConfirm }: { onConfirm: (place: SelectedPlace) => void }) {
  const [address, setAddress] = useState("上海市黄浦区人民广场");
  const [lat, setLat] = useState("31.230416");
  const [lng, setLng] = useState("121.473701");

  const draftLocation = useMemo<DraftLocation | null>(() => {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!address.trim() || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return null;
    }

    return {
      address: address.trim(),
      lat: parsedLat,
      lng: parsedLng,
    };
  }, [address, lat, lng]);

  const previewJson = draftLocation
    ? JSON.stringify({
        address: draftLocation.address,
        lat: draftLocation.lat,
        lng: draftLocation.lng,
        source: "manual_test",
        capturedAt: "<set-on-confirm>",
      })
    : null;

  return (
    <div className="location-grid">
      <div className="panel">
        <div className="panel-title">
          <MapPin aria-hidden="true" />
          <h2>确认安装位置</h2>
        </div>

        <label className="field-stack">
          <span>地址</span>
          <input
            onChange={(event) => setAddress(event.target.value)}
            placeholder="输入用户确认的地址"
            type="text"
            value={address}
          />
        </label>

        <div className="coordinate-row">
          <label className="field-stack">
            <span>Latitude</span>
            <input onChange={(event) => setLat(event.target.value)} step="any" type="number" value={lat} />
          </label>
          <label className="field-stack">
            <span>Longitude</span>
            <input onChange={(event) => setLng(event.target.value)} step="any" type="number" value={lng} />
          </label>
        </div>

        <p className="status">当前页面先固定测试 hidden field 提交流程，地址和坐标会一起打包。</p>

        {draftLocation && previewJson && (
          <div className="selection">
            <strong>location_json</strong>
            <code>{previewJson}</code>
            <span>
              {draftLocation.lat.toFixed(6)}, {draftLocation.lng.toFixed(6)}
            </span>
          </div>
        )}

        <button
          className="primary"
          disabled={!draftLocation}
          onClick={() => {
            if (!draftLocation) return;

            const locationPayload = {
              address: draftLocation.address,
              lat: draftLocation.lat,
              lng: draftLocation.lng,
              source: "manual_test",
              capturedAt: new Date().toISOString(),
            };

            onConfirm({
              ...draftLocation,
              locationJson: JSON.stringify(locationPayload),
            });
          }}
          type="button"
        >
          <Check aria-hidden="true" />
          确认并进入表单
        </button>
      </div>

      <div className="map-wrap">
        <div className="json-preview">
          <FileJson aria-hidden="true" />
          <pre>{previewJson ?? "请输入有效地址和经纬度"}</pre>
        </div>
      </div>
    </div>
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
      if (typeof event.data !== "string" || !event.data.includes("Tally.FormSubmitted")) return;

      try {
        const message = JSON.parse(event.data) as { event?: string; payload?: { formId?: string } };
        if (message.event === "Tally.FormSubmitted" && message.payload?.formId === TALLY_FORM_ID) {
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
    <div className="form-stage">
      <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
      <div className="form-toolbar">
        <button className="ghost" onClick={onBack} type="button">
          <ChevronLeft aria-hidden="true" />
          重新填写位置
        </button>
        <div className="confirmed-location">
          <MapPin aria-hidden="true" />
          <span>{place.address}</span>
        </div>
      </div>
      <iframe
        className="tally-frame"
        data-tally-src={tallyUrl}
        height="720"
        src={tallyUrl}
        title="家庭设备与素材收集表"
        width="100%"
      />
    </div>
  );
}

function ThanksModal({ place, onClose }: { place: SelectedPlace; onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="modal-backdrop" role="presentation">
      <div aria-labelledby="thanks-title" aria-modal="true" className="modal" role="dialog">
        <button aria-label="关闭" className="icon-button" onClick={() => router.push("/")} type="button">
          <X aria-hidden="true" />
        </button>
        <div className="success-mark">
          <Send aria-hidden="true" />
        </div>
        <h2 id="thanks-title">感谢你的参与</h2>
        <p>具体方案以及报价稍后由我们工作人员确定后发送到你的邮箱，你的提交也可以在邮件中查询。</p>
        <div className="modal-location">
          <MapPin aria-hidden="true" />
          <span>{place.address}</span>
        </div>
        <button
          className="primary"
          onClick={() => {
            onClose();
            router.push("/");
          }}
          type="button"
        >
          <Check aria-hidden="true" />
          返回首页
        </button>
      </div>
    </div>
  );
}
