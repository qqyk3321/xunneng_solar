"use client";
import { useId } from "react";
import { Moon, Sun } from "lucide-react";
import { PROFILE_LABELS, type Profile } from "@solortide/consultation-core";
import { PROFILES } from "@/lib/solution-suggest/optimizer";
import { RequiredMark } from "./required-mark";
import styles from "./form.module.css";

const descriptions: Record<Profile, string> = {
  daytime: "Home during the day, working from home, or running a daytime business.",
  rush: "Usually out during the day, with busy mornings and evenings at home.",
  evening: "Most cooking, entertainment and cooling happen after sunset, before bed.",
  night: "Air conditioning or other large appliances run through the night.",
};

// Show a complete midnight-to-midnight day, keeping the original 0–10% scale.
const curve = { width: 240, height: 96, top: 22, baseline: 92, maxPercent: 10, lastHour: 24 };
const hourX = (hour: number) => hour / curve.lastHour * curve.width;
const percentY = (value: number) => curve.baseline - value / curve.maxPercent * (curve.baseline - curve.top);
const timeLabels = [
  { hour: 0, label: "12am" },
  { hour: 6, label: "6am" },
  { hour: 12, label: "Noon" },
  { hour: 18, label: "6pm" },
  { hour: 24, label: "12am" },
];

// Shape-preserving cubic interpolation keeps each hourly value and avoids overshoot.
function dailyPath(values: number[]) {
  const interval = hourX(1);
  const points = values.map((value, hour) => ({ x: hourX(hour), y: percentY(value) }));
  const slopes = points.slice(1).map((point, i) => (point.y - points[i].y) / interval);
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes[slopes.length - 1];
    const left = slopes[i - 1], right = slopes[i];
    return left * right <= 0 ? 0 : 2 * left * right / (left + right);
  });
  return points.slice(1).reduce((path, point, i) => {
    const previous = points[i];
    return `${path} C${previous.x + interval / 3},${previous.y + tangents[i] * interval / 3} ${point.x - interval / 3},${point.y - tangents[i + 1] * interval / 3} ${point.x},${point.y}`;
  }, `M${points[0].x},${points[0].y}`);
}
function DailyCurve({ profile }: { profile: Profile }) {
  const id = useId();
  const values = PROFILES[profile].values;
  // Repeat midnight at 24:00 to close the daily cycle without changing model data.
  const path = dailyPath([...values, values[0]]);
  return <><svg viewBox={`0 0 ${curve.width} ${curve.height}`} aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-day`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#eef2f6" /><stop offset={6 / curve.lastHour} stopColor="#f5f4ed" />
        <stop offset={12 / curve.lastHour} stopColor="#fff5d9" /><stop offset={18 / curve.lastHour} stopColor="#f5f4ed" /><stop offset="1" stopColor="#eef2f6" />
      </linearGradient>
      <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity=".02" />
      </linearGradient>
    </defs>
    <rect width={curve.width} height={curve.height} rx="5" fill={`url(#${id}-day)`} />
    <path d={[6, 12, 18].map(hour => `M${hourX(hour)} ${curve.top}V${curve.baseline}`).join(" ")} className={styles.gridLine} />
    <Moon x="12" y="7" width="11" height="11" stroke="#8693a5" strokeWidth="1.5" />
    <Sun x={hourX(12) - 6} y="6" width="12" height="12" stroke="#b18c3e" strokeWidth="1.5" />
    <Moon x="217" y="7" width="11" height="11" stroke="#8693a5" strokeWidth="1.5" />
    <path d={`${path} L${curve.width},${curve.baseline} L0,${curve.baseline} Z`} fill={`url(#${id}-area)`} />
    <path d={path} className={styles.curveLine} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg><span className={styles.chartAxis} aria-hidden="true">{timeLabels.map(({ hour, label }) => <span key={hour} style={{ left: `${hour / curve.lastHour * 100}%` }}>{label}</span>)}</span></>;
}
export function ProfileField({ value, onChange, error }: { value: string; onChange: (value: Profile) => void; error?: string }) {
  const selected = Object.hasOwn(PROFILES, value) ? value as Profile : null;
  return <fieldset id="daily-pattern" className={styles.profileField} aria-invalid={!!error} aria-describedby={error ? "profile-error" : undefined}>
    <legend><span className={styles.questionTitle}><span className={styles.questionNumber} aria-hidden="true">02</span><span>When do you use electricity most?<RequiredMark /></span></span></legend>
    <div className={styles.profileScale} aria-hidden="true">Daily pattern</div>
    <div className={styles.profiles}>{(Object.keys(PROFILE_LABELS) as Profile[]).map((key, index) =>
      <label key={key} className={styles.profile} data-selected={value === key}>
        <input id={index === 0 ? "profile" : `profile-${key}`} type="radio" name="profile" value={key} required checked={value === key} onChange={() => onChange(key)} aria-labelledby={`profile-title-${key}`} aria-describedby={`profile-desc-${key}${error ? " profile-error" : ""}`} />
        <span className={styles.profileText}><strong id={`profile-title-${key}`}>{PROFILE_LABELS[key][0]}</strong><span id={`profile-desc-${key}`}>{descriptions[key]}</span></span>
        <span className={styles.profileCurve}><DailyCurve profile={key} /></span>
      </label>
    )}</div>
    {error && <p id="profile-error" className={styles.error}>{error}</p>}
    {selected && <details className={styles.mobileCurve}><summary>View daily pattern</summary><div key={selected}><strong>{PROFILE_LABELS[selected][0]}</strong><DailyCurve profile={selected} /></div></details>}
  </fieldset>;
}
