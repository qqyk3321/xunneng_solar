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
  source: "地址搜索" | "地图选点";
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
      handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void,
    ) => { remove: () => void };
  };
};

type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      Geocoder: new () => {
        geocode: (request: { location: { lat: number; lng: number } }) => Promise<{
          results: Array<{ formatted_address?: string; place_id?: string }>;
        }>;
      };
    };
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
  const [library, setLibrary] = useState<typeof import("@googlemaps/extended-component-library/react") | null>(null);
  const mapRef = useRef<MapElement | null>(null);
  const markerRef = useRef<(HTMLElement & { position?: { lat: number; lng: number } }) | null>(null);

  useEffect(() => {
    let active = true;

    import("@googlemaps/extended-component-library/react")
      .then((loadedLibrary) => {
        if (active) setLibrary(loadedLibrary);
      })
      .catch(() => {
        if (active) setError("Google Maps 组件加载失败，请刷新页面后重试。");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const position = selection?.latitude != null && selection.longitude != null
      ? { lat: selection.latitude, lng: selection.longitude }
      : { lat: 31.2304, lng: 121.4737 };

    customElements.whenDefined("gmp-map").then(() => {
      if (mapRef.current) {
        // 点击地图时仅更新标记，保留用户正在查看的中心点和缩放级别。
        if (!selection || selection.source === "地址搜索") {
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
      const { APILoader } = await import("@googlemaps/extended-component-library/api_loader.js");
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
              address: "确认后获取完整地址",
              placeId: "",
              latitude,
              longitude,
              source: "地图选点",
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
      address: place.formattedAddress ?? "未返回格式化地址",
      placeId: place.id ?? "",
      latitude,
      longitude,
      source: "地址搜索",
    });
    setError("");
  };

  const handleCheckout = async () => {
    if (!selection) return;

    const finishCheckout = (place: Selection) => {
      if (place.latitude == null || place.longitude == null) return;

      const location = {
        address: place.address,
        lat: place.latitude,
        lng: place.longitude,
        source: place.source === "地址搜索" ? "address_search" : "map_click",
      } as const;

      if (onConfirmed) {
        onConfirmed(location);
      } else {
        setIsCheckoutOpen(true);
      }
    };

    if (selection.source !== "地图选点") {
      finishCheckout(selection);
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      const maps = (window as GoogleMapsWindow).google?.maps;
      if (!maps || selection.latitude == null || selection.longitude == null) {
        throw new Error("Google Maps API is not ready");
      }

      const response = await new maps.Geocoder().geocode({
        location: { lat: selection.latitude, lng: selection.longitude },
      });
      const confirmedPlace = {
        ...selection,
        address: response.results[0]?.formatted_address ?? "未找到对应的格式化地址",
        placeId: response.results[0]?.place_id ?? "",
      };
      setSelection(confirmedPlace);
      finishCheckout(confirmedPlace);
    } catch {
      setError("地址反向解析失败。你仍可通过经纬度确认该位置。");
      finishCheckout(selection);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!apiKey) {
    return (
      <main className={embedded ? "maps-demo-embedded" : "maps-demo-shell"}>
        <section className={`maps-demo-card maps-demo-error${embedded ? " maps-demo-card-embedded" : ""}`}>
          <p className="kicker">Google Maps Platform</p>
          <h1>未找到 API Key</h1>
          <p>请确认 `.env` 中设置了 `GOOGLE_MAP_API`，然后重启开发服务器。</p>
          <Link href="/" className="ghost">返回首页</Link>
        </section>
      </main>
    );
  }

  const markerPosition = selection?.latitude != null && selection.longitude != null
    ? `${selection.latitude},${selection.longitude}`
    : undefined;
  const APILoader = library?.APILoader;
  const PlacePicker = library?.PlacePicker;

  return (
    <main className={embedded ? "maps-demo-embedded" : "maps-demo-shell"}>
      <section className={`maps-demo-card${embedded ? " maps-demo-card-embedded" : ""}`}>
        <div className="maps-demo-heading">
          <div>
            <p className="kicker">{embedded ? "第一步 · 安装位置" : "独立测试页 · Google 官方 ECL"}</p>
            <div className="maps-demo-title-row">
              <h1>{embedded ? "选择安装位置" : "Address Selection"}</h1>
              {!embedded && <span className="maps-demo-version">{enableMapPointSelection ? "v0.3.2" : "v0.2.1"}</span>}
            </div>
            <p>
              {enableMapPointSelection
                ? "搜索地址，或直接点击地图选点；两种方式都会更新标记和最终坐标。"
                : "搜索并选择地址，组件会自动将地图定位，并显示对应标记。"}
            </p>
          </div>
          {!embedded && <Link href="/" className="ghost">返回首页</Link>}
        </div>

        {APILoader && <APILoader apiKey={apiKey} version="beta" language="zh-CN" region="CN" />}

        <div className="maps-demo-layout">
          <section className="maps-demo-panel">
            <label htmlFor="address-picker">安装地址</label>
            {PlacePicker ? (
              <PlacePicker
                id="address-picker"
                forMap="address-selection-map"
                type="address"
                placeholder="输入地址，例如：上海市静安区南京西路"
                onPlaceChange={handlePlaceChange}
                onRequestError={() => setError("地址服务请求失败。请检查 Places API、账单和 API Key 的 HTTP Referrer 限制。")}
              />
            ) : (
              <p className="maps-demo-hint">正在加载 Google Maps 地址选择组件…</p>
            )}
            <p className="maps-demo-hint">
              {enableMapPointSelection
                ? "请选择下拉建议，或直接点击右侧地图任意位置。"
                : "请选择下拉列表中的建议项，以获取完整地址与坐标。"}
            </p>

            {error && <p className="maps-demo-request-error">{error}</p>}

            <div className="maps-demo-result" aria-live="polite">
              <span>选择结果</span>
              {selection ? (
                <>
                  <strong>{selection.address}</strong>
                  <code>来源: {selection.source}</code>
                  <code>placeId: {selection.placeId || "—"}</code>
                  <code>
                    坐标: {selection.latitude?.toFixed(6) ?? "—"}, {selection.longitude?.toFixed(6) ?? "—"}
                  </code>
                </>
              ) : (
                <p>尚未选择地址</p>
              )}
            </div>

            <button
              className="primary maps-demo-checkout"
              disabled={!selection}
              onClick={handleCheckout}
              type="button"
            >
              {isConfirming ? "正在获取完整地址…" : "确认选择"}
            </button>
          </section>

          <section className="maps-demo-map-frame" aria-label="Google 地图">
            <gmp-map
              id="address-selection-map"
              ref={mapRef}
              className="maps-demo-map"
              map-id="DEMO_MAP_ID"
            >
              {markerPosition && <gmp-advanced-marker ref={markerRef} />}
            </gmp-map>
          </section>
        </div>
      </section>

      {isCheckoutOpen && selection && (
        <div className="maps-demo-modal-backdrop" role="presentation" onMouseDown={() => setIsCheckoutOpen(false)}>
          <section
            aria-labelledby="maps-demo-checkout-title"
            aria-modal="true"
            className="maps-demo-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p className="kicker">已确认位置</p>
            <h2 id="maps-demo-checkout-title">地址选择结果</h2>
            <dl>
              <div><dt>完整地址</dt><dd>{selection.address}</dd></div>
              <div><dt>纬度（lat）</dt><dd>{selection.latitude?.toFixed(6) ?? "—"}</dd></div>
              <div><dt>经度（lon）</dt><dd>{selection.longitude?.toFixed(6) ?? "—"}</dd></div>
            </dl>
            <button className="primary" onClick={() => setIsCheckoutOpen(false)} type="button">关闭</button>
          </section>
        </div>
      )}
    </main>
  );
}
