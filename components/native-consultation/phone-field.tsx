"use client";
import { useEffect, useRef, useState } from "react";
import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import { getCountries, type Country } from "react-phone-number-input/max";
import PhoneInput from "react-phone-number-input/input";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { LOCAL_AREA_CODES, phonePrefix, phoneLocalDigits, regionalPhoneValue, switchPhoneCountry } from "@/lib/native-consultation/phone-input";
import flags from "react-phone-number-input/flags";
import en from "react-phone-number-input/locale/en";
import styles from "./form.module.css";

type SelectProps = { value?: Country; onChange: (country?: Country) => void; disabled?: boolean; options: { value?: Country; label: string }[] };
// Keep the searchable menu below the site's sticky header, including on short screens.
const menuPadding = { top: 96, right: 16, bottom: 16, left: 16 };
function CountrySelect({ value, onChange, disabled, options }: SelectProps) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null), searchInput = useRef<HTMLInputElement>(null), button = useRef<HTMLButtonElement>(null);
  const { refs, floatingStyles } = useFloating({
    open,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: menuPadding }), shift({ padding: menuPadding }), size({
      padding: menuPadding,
      apply({ availableHeight, elements }) {
        elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
      },
    })],
  });
  const countries = options.filter(o => o.value && getCountries().includes(o.value));
  const visible = countries.filter(o => `${o.label} ${phonePrefix(o.value!)}`.toLowerCase().includes(search.toLowerCase()));
  const Flag = value ? flags[value] : undefined;
  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div ref={root} className={styles.countrySelect} onKeyDown={e => {
    if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    if (e.key === "ArrowDown" && e.target === searchInput.current) { e.preventDefault(); root.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus(); }
  }}>
    <button type="button" ref={node => { button.current = node; refs.setReference(node); }} disabled={disabled} className={styles.countryButton} aria-label={`Phone country: ${value ? en[value] : "Choose country"}`} aria-expanded={open} aria-haspopup="listbox" onClick={() => { setSearch(""); setOpen(!open); }}>
      {Flag && <span className={styles.flag}><Flag title={en[value!]} /></span>}<span>{value ? phonePrefix(value) : "Country"}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div ref={refs.setFloating} style={floatingStyles} className={styles.countryMenu}>
      <input ref={searchInput} value={search} onChange={e => setSearch(e.target.value)} aria-label="Search phone countries" placeholder="Country or calling code" autoComplete="off" />
      <div role="listbox" aria-label="Phone countries" className={styles.countryOptions} onKeyDown={e => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
        const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')], index = items.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault(); items[e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
      }}>
        {visible.map(o => { const Icon = flags[o.value!]; return <button key={o.value} type="button" role="option" aria-selected={value === o.value} onClick={() => { onChange(o.value); setOpen(false); button.current?.focus(); }}>
          <span className={styles.flag}>{Icon && <Icon title={o.label} />}</span><span>{o.label}</span><small>{phonePrefix(o.value!)}</small>
        </button>; })}
        {!visible.length && <p>No matching countries.</p>}
      </div>
    </div>}
  </div>;
}
export function PhoneField({ value, country, onChange, onCountryChange, onBlur, error }: {
  value: string; country: string; onChange: (value: string) => void; onCountryChange: (country: string) => void; onBlur: () => void; error?: string;
}) {
  const selected = country as Country;
  const changeNumber = (next: string) => {
    const parsed = parsePhoneNumberFromString(next);
    if (parsed?.isValid() && parsed.country && parsed.country !== selected) onCountryChange(parsed.country);
    onChange(next);
  };
  const inputProps = {
    id: "phone", name: "phone", onBlur, required: true, autoComplete: "tel",
    "aria-invalid": !!error, "aria-describedby": error ? "phone-error" : undefined,
    onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData("text").trim();
      if (!/^(\+|00)/.test(text)) return;
      const parsed = parsePhoneNumberFromString(text.replace(/^00/, "+"));
      if (!parsed?.isValid() || !parsed.country) return;
      event.preventDefault();
      onCountryChange(parsed.country);
      onChange(parsed.number);
    },
  };
  return <div className={styles.phone}>
    <CountrySelect value={selected} options={getCountries().map(c => ({ value: c, label: en[c] }))} onChange={next => {
      if (!next || next === selected) return;
      onCountryChange(next);
      onChange(switchPhoneCountry(value, selected, next));
    }} />
    {LOCAL_AREA_CODES[selected]
      ? <input {...inputProps} type="tel" inputMode="tel" value={phoneLocalDigits(value, selected)} onChange={event => changeNumber(regionalPhoneValue(event.target.value, selected))} />
      : <PhoneInput {...inputProps} country={selected} value={value} onChange={v => changeNumber(v || "")} />}
  </div>;
}
