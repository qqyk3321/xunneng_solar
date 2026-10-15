import { ImageResponse } from "next/og";

export const alt =
  "Solortide by Sol & Tide Energy — Solar and battery storage for Caribbean homes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SocialImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#073d40",
        color: "#ffffff",
        padding: "64px 76px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 44,
            background: "#f59a45",
          }}
        />
        <div style={{ fontSize: 32 }}>Solortide | Sol &amp; Tide Energy</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.12 }}>
          Solar &amp; battery storage
        </div>
        <div style={{ fontSize: 46, color: "#cee9df" }}>
          For your Caribbean home.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 25,
        }}
      >
        <div style={{ color: "#ffb76c" }}>Antigua · Dominica</div>
        <div>www.solortide.com</div>
      </div>
    </div>,
    size,
  );
}
