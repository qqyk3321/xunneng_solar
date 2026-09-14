import type { AddressDetails } from "@/lib/address-details";
import { SERVICE_PARISHES } from "@/lib/service-parishes";
import styles from "./address-details-fields.module.css";

const fields: {
  key: keyof AddressDetails;
  label: string;
  placeholder: string;
  autoComplete?: string;
}[] = [
  {
    key: "town",
    label: "Town / village",
    placeholder: "Your town or village",
    autoComplete: "address-level2",
  },
  {
    key: "street",
    label: "Street address",
    placeholder: "Road, street or neighbourhood",
    autoComplete: "address-line1",
  },
  {
    key: "building",
    label: "House / building / unit",
    placeholder: "House name, number or unit",
    autoComplete: "address-line2",
  },
  {
    key: "postalCode",
    label: "Postal code",
    placeholder: "If applicable",
    autoComplete: "postal-code",
  },
];
export function AddressDetailsFields({
  country,
  countryCode,
  value,
  onChange,
}: {
  country: string;
  countryCode: string;
  value: AddressDetails;
  onChange: (key: keyof AddressDetails, value: string) => void;
}) {
  return (
    <fieldset className={styles.fields}>
      <legend>Complete your property address</legend>
      <p>
        Select your parish and add the details that help us find your home. Then
        mark the property on the map.
      </p>
      <label htmlFor="property-country">Country / territory</label>
      <input
        id="property-country"
        value={country}
        readOnly
        autoComplete="country-name"
      />
      <div className={styles.grid}>
        <div className={styles.wide}>
          <label htmlFor="property-district">Parish / district *</label>
          <select
            id="property-district"
            value={value.district}
            onChange={(event) => onChange("district", event.target.value)}
            autoComplete="address-level1"
            required
            aria-describedby="parish-help"
          >
            <option value="" disabled>
              Select your parish
            </option>
            {(SERVICE_PARISHES[countryCode] ?? []).map((parish) => (
              <option key={parish} value={parish}>
                {parish}
              </option>
            ))}
          </select>
          <p id="parish-help">
            Select your parish to continue. If you’re unsure, check your address
            details or ask us for help.
          </p>
        </div>
        {fields.map((field) => (
          <div
            key={field.key}
            className={
              field.key === "street" || field.key === "building"
                ? styles.wide
                : undefined
            }
          >
            <label htmlFor={`property-${field.key}`}>
              {field.label}
              {field.key === "town" ? " *" : <span> · optional</span>}
            </label>
            <input
              id={`property-${field.key}`}
              value={value[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              required={field.key === "town"}
              pattern={field.key === "town" ? ".*\\S.*" : undefined}
              maxLength={180}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
            />
          </div>
        ))}
      </div>
      <label htmlFor="property-directions">
        Landmark / directions <span>· optional</span>
      </label>
      <textarea
        id="property-directions"
        value={value.directions}
        onChange={(event) => onChange("directions", event.target.value)}
        maxLength={600}
        rows={3}
        placeholder="For example: the blue house opposite the school"
      />
      <p className={styles.note}>
        Editing these details does not move the map pin. Please check that the
        pin marks the correct property before continuing.
      </p>
    </fieldset>
  );
}
