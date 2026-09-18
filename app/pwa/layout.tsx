import type { Metadata } from "next";
import "../solar-analysis/solar-analysis.css";
import "./offline.css";

export const metadata: Metadata = {
  title: "Sol&Tide · Offline Solar",
  robots: { index: false, follow: false, nocache: true },
};

export default function PwaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
