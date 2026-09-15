import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestDirectory } from "./test-directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Retired experiments | Sol & Tide Energy",
  robots: { index: false, follow: false },
};

export default function TestPages() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TestDirectory />;
}
