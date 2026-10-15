/** Approved showcase packages. panelRange is the offered range; panels is the illustration count. Prices are starting amounts in EC$, not final quotes. */
export const SOLAR_PACKAGES = [
  { name: "Basic", inverter: 5, battery: 5, panels: 8, panelRange: "6–12", priceFromEc: 20000, homeMaxKwh: 700, property: "Small homes & townhouses", homes: "Up to 700", shops: "Up to 600", scene: "Single-storey Caribbean home with eight rooftop solar panels" },
  { name: "Plus", inverter: 8, battery: 10, panels: 18, panelRange: "12–18", priceFromEc: 30000, homeMaxKwh: 1000, property: "Family homes & villas", homes: "700–1000", shops: "600–1000", scene: "Modern two-storey villa with eighteen rooftop solar panels" },
  { name: "Premium", inverter: 10, battery: 20, panels: 24, panelRange: "16–24", priceFromEc: 40000, homeMaxKwh: null, property: "Large homes & guesthouses", homes: "Over 1000", shops: "1000–1500", scene: "Small guesthouse with separate room entrances and twenty-four rooftop solar panels" },
] as const;
