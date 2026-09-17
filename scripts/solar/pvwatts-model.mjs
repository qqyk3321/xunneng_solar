export const ENDPOINT = "https://developer.nlr.gov/api/pvwatts/v8.json";
export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const SITES = [
  { id: "antigua", name: "St John's reference point", latitude: 17.1274, longitude: -61.8468, timezone: "America/Antigua" },
  { id: "dominica", name: "Roseau reference point", latitude: 15.301, longitude: -61.388, timezone: "America/Dominica" },
];
export const ORIENTATIONS = { north: 0, east: 90, south: 180, west: 270 };
export function configurations() {
  const tilted = SITES.flatMap(site => Object.entries(ORIENTATIONS).flatMap(([orientation, azimuth]) =>
    [10, 15, 20, 30].map(tilt => ({
      id: `${site.id}/${orientation}/tilt-${tilt}`, site, orientation,
      request: { lat: site.latitude, lon: site.longitude, system_capacity: 1, module_type: 0,
        array_type: 1, losses: 14, dc_ac_ratio: 1.2, inv_eff: 96, gcr: 0.4,
        radius: 100, dataset: "nsrdb", timeframe: "hourly", tilt, azimuth },
    }))));
  const horizontal = SITES.flatMap(site => [1, 0].map(arrayType => ({
    id: `${site.id}/horizontal/tilt-0/${arrayType === 1 ? "roof" : "open-rack"}`,
    site, orientation: "horizontal",
    request: { ...tilted.find(c => c.site.id === site.id).request,
      tilt: 0, azimuth: 0, array_type: arrayType },
  })));
  return [...tilted, ...horizontal];
}

// API responses can reflect authentication even when it was passed in a header.
export function sanitize(value, secret) {
  if (Array.isArray(value)) return value.map(item => sanitize(item, secret));
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key]) => !/^(api[_-]?key|x-api-key|authorization)$/i.test(key))
      .map(([key, item]) => [key, sanitize(item, secret)]));
  if (typeof value === "string" && secret) return value.split(secret).join("[REDACTED]");
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function numbers(values, length, name, nonnegative = true) {
  assert(Array.isArray(values) && values.length === length, `${name}: expected ${length} values`);
  assert(values.every(v => Number.isFinite(v) && (!nonnegative || v >= 0)), `${name}: invalid numeric value`);
}

export function deriveModel(response, config, retrievedAt) {
  assert([0, 1].includes(config.request.array_type), "Only fixed roof/open-rack mounting is supported");
  assert(Array.isArray(response.errors) && response.errors.length === 0, "API reported model errors");
  assert(Array.isArray(response.warnings), "Missing API warnings field");
  const station = response.station_info;
  assert(station?.tz === -4, "Unexpected timezone; do not silently shift the hourly array");
  assert(Number.isFinite(station.distance) && station.distance >= 0 && station.distance <= 10000,
    "Weather grid is missing or farther than 10 km from the reference site");
  assert(Number.isFinite(station.lat) && Number.isFinite(station.lon), "Missing station coordinates");
  assert(String(station.weather_data_source).includes("NSRDB"), "Unexpected weather source");
  assert(response.ssc_info?.module === "pvwattsv8", "Unexpected simulation model");
  for (const [key, expected] of Object.entries(config.request)) {
    assert(String(response.inputs?.[key]) === String(expected), `API input mismatch: ${key}`);
  }
  const outputs = response.outputs;
  assert(outputs && Number.isFinite(outputs.ac_annual) && outputs.ac_annual > 0, "Missing annual energy");
  for (const name of ["ac", "dc", "poa", "dn", "df", "wspd", "alb", "tamb", "tcell"]) {
    numbers(outputs[name], 8760, name, !["tamb", "tcell"].includes(name));
  }
  for (const name of ["ac_monthly", "dc_monthly"]) numbers(outputs[name], 12, name);
  let offset = 0;
  let maxDelta = 0;
  const months = DAYS.map((days, month) => {
    const ac = Array(24).fill(0);
    const dc = Array(24).fill(0);
    for (let day = 0; day < days; day++) for (let hour = 0; hour < 24; hour++) {
      ac[hour] += outputs.ac[offset + day * 24 + hour] / days;
      dc[hour] += outputs.dc[offset + day * 24 + hour] / days;
    }
    offset += days * 24;
    const energy = ac.reduce((sum, v) => sum + v, 0) * days / 1000;
    const dcEnergy = dc.reduce((sum, v) => sum + v, 0) * days / 1000;
    const delta = Math.abs(energy - outputs.ac_monthly[month]);
    maxDelta = Math.max(maxDelta, delta);
    assert(delta <= 0.01, `Month ${month + 1}: AC hourly/monthly energy mismatch`);
    assert(Math.abs(dcEnergy - outputs.dc_monthly[month]) <= 0.01, `Month ${month + 1}: DC energy mismatch`);
    return { month: month + 1, days, monthly_energy_kwh: energy,
      api_monthly_energy_kwh: outputs.ac_monthly[month],
      average_day_hourly_generation_wh: ac, average_day_hourly_dc_energy_wh: dc };
  });
  const annual = months.reduce((sum, m) => sum + m.monthly_energy_kwh, 0);
  assert(Math.abs(annual - outputs.ac_annual) <= 0.02, "Annual energy mismatch");
  return {
    schema_version: 1, id: config.id, source: "PVWatts V8 / NSRDB TMY", retrieved_at: retrievedAt,
    site: { ...config.site, scope: "representative reference point, not a specific roof or entire country" },
    geometry: { orientation: config.orientation,
      azimuth_degrees_clockwise_from_north: config.request.tilt === 0 ? null : config.request.azimuth,
      tilt_degrees_from_horizontal: config.request.tilt,
      ...(config.request.tilt === 0 ? { azimuth_applicable: false,
        note: "Horizontal surface: azimuth is not applicable. Request azimuth=0 is only an API placeholder." } : {}) },
    system: { dc_capacity_kwp: 1, module_type: "standard",
      array_type: config.request.array_type === 0 ? "fixed_open_rack" : "fixed_roof_mounted",
      system_losses_percent: 14, dc_ac_ratio: 1.2, inverter_efficiency_percent: 96 },
    request: { endpoint: ENDPOINT, parameters: config.request },
    api_version: response.version, ssc_info: response.ssc_info, station_info: station,
    warnings: response.warnings,
    time_basis: { kind: "typical_meteorological_year", utc_offset_hours: -4, daylight_saving: false,
      days: 365, interval_hours: 1, first_interval: "01-01 00:00-01:00 local standard time",
      note: "Not an observed calendar year. Array index 0 is the first interval; no leap day." },
    units: { monthly_energy_kwh: "kWh AC", average_day_hourly_generation_wh: "Wh AC per 1-hour interval on the month's average day",
      average_day_hourly_dc_energy_wh: "Wh DC per 1-hour interval on the month's average day" },
    time_periods: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00-${String(h + 1).padStart(2, "0")}:00`),
    annual_generation_kwh: annual, api_annual_generation_kwh: outputs.ac_annual, months,
    validation: { hourly_count: 8760, month_count: 12, hours_per_average_day: 24,
      max_monthly_ac_difference_kwh: maxDelta, annual_ac_difference_kwh: Math.abs(annual - outputs.ac_annual) },
  };
}
