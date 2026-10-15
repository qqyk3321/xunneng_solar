"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { SOLAR_PACKAGES } from "@/lib/solar-packages";

type ImageView = "installed" | "equipment";
type Selection = { inverter: number; imageView: ImageView };
type PackageSelection = Selection & {
  selectPackage: (inverter: number) => void;
  setImageView: (view: ImageView) => void;
};

const SelectionContext = createContext<PackageSelection | null>(null);

/** One selection shared by the package carousel and its calculator shortcut. */
export function SolarPackageSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ inverter: 8, imageView: "installed" });
  return <SelectionContext.Provider value={{
    ...selection,
    selectPackage(inverter) {
      if (SOLAR_PACKAGES.some(plan => plan.inverter === inverter)) {
        setSelection({ inverter, imageView: "installed" });
      }
    },
    setImageView(imageView) {
      setSelection(current => ({ ...current, imageView }));
    },
  }}>{children}</SelectionContext.Provider>;
}

export function useSolarPackageSelection() {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("Solar package selection requires its provider");
  return selection;
}
