export type AddressDetails = {
  town: string;
  district: string;
  street: string;
  building: string;
  postalCode: string;
  directions: string;
};
export type AddressComponent = {
  types: string[];
  longText?: string;
  long_name?: string;
};
export const EMPTY_ADDRESS: AddressDetails = {
  town: "",
  district: "",
  street: "",
  building: "",
  postalCode: "",
  directions: "",
};
export function parseAddressComponents(
  components: AddressComponent[] = [],
): AddressDetails {
  const find = (...types: string[]) => {
    for (const type of types) {
      const component = components.find((item) => item.types.includes(type));
      const text = component?.longText ?? component?.long_name;
      if (text) return text;
    }
    return "";
  };
  return {
    town: find("locality", "postal_town", "sublocality_level_1", "sublocality"),
    district: find(
      "administrative_area_level_1",
      "administrative_area_level_2",
    ),
    street: find("route"),
    building: [find("street_number"), find("premise"), find("subpremise")]
      .filter(Boolean)
      .join(", "),
    postalCode: find("postal_code"),
    directions: "",
  };
}
export function addressSummary(details: AddressDetails, country: string) {
  return [
    details.building,
    details.street,
    details.town,
    details.district,
    details.postalCode,
    country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}
