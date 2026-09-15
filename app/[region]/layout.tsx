import type { ReactNode } from "react";
import { requireRegion, type RegionPageProps } from "@/lib/region-seo";

export function generateStaticParams() {
  return [{ region: "antigua" }, { region: "dominica" }];
}
export default async function RegionLayout({
  children,
  params,
}: RegionPageProps & { children: ReactNode }) {
  await requireRegion(params);
  return children;
}
