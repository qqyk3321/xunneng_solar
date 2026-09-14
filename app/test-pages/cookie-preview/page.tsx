import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CookiePreview } from "./preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cookie UI prototype | Sol & Tide Energy",
  robots: { index: false, follow: false },
};
export default function CookiePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CookiePreview />;
}
