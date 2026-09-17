"""Offline, resumable collectors. No API keys; no requests from the web application.

Run with Python + scripts/solar/requirements.txt installed. Downloaded responses
are gzip-compressed without changing their numeric values. UTC boundary data is
requested explicitly; no missing hours are filled or borrowed from another year.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import time
from datetime import datetime, timezone
from urllib.parse import urlencode

import numpy as np
import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data/solar-generation/additional-v1"
SITES = {"antigua": (17.1274, -61.8468), "dominica": (15.301, -61.388)}
DIRECTIONS = {"north": 0, "east": 90, "south": 180, "west": 270}
DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
SETTINGS = {
    "pvgis-era5": {"year": 2022, "version": "v5_3", "database": "PVGIS-ERA5"},
    "pvgis-nsrdb": {"year": 2014, "version": "v5_2", "database": "PVGIS-NSRDB"},
    "nasa-power": {"year": 2022, "database": "NASA POWER CERES SYN1DEG / MERRA-2"},
}


def configs():
    for site in SITES:
        for direction, azimuth in DIRECTIONS.items():
            for tilt in [10, 15, 20, 30]:
                yield {"id": f"{site}/{direction}/tilt-{tilt}", "site": site,
                       "direction": direction, "azimuth": azimuth, "tilt": tilt, "mounting": "roof"}
        for mounting in ["roof", "open-rack"]:
            yield {"id": f"{site}/horizontal/tilt-0/{mounting}", "site": site,
                   "direction": "horizontal", "azimuth": 0, "tilt": 0, "mounting": mounting}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, data, compressed=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(data, ensure_ascii=False, allow_nan=False,
                          separators=(",", ":") if compressed else None,
                          indent=None if compressed else 2) + "\n").encode()
    if compressed:
        encoded = gzip.compress(encoded, mtime=0)
    path.write_bytes(encoded)
    return digest(encoded)


def fetch_json(url, cache):
    if cache.exists():
        receipt = json.loads(cache.with_suffix(".request.json").read_text())
        assert receipt["url"] == url, "Cached request differs: use a new archive directory"
        assert receipt["raw_sha256"] == digest(cache.read_bytes()), "Cached raw checksum mismatch"
        return json.loads(gzip.decompress(cache.read_bytes()))
    for attempt in range(8):
        # curl uses the system trust store (NASA's chain is unavailable in this
        # environment's Node trust store). TLS verification is never disabled.
        result = subprocess.run(["curl", "--silent", "--show-error", "--connect-timeout", "15",
                                 "--max-time", "90", "--write-out", "\n%{http_code}", url],
                                capture_output=True, text=True)
        body, _, status = result.stdout.rpartition("\n")
        if result.returncode == 0 and status == "200":
            payload = json.loads(body)
            save(cache, payload, True)
            save(cache.with_suffix(".request.json"), {"url": url, "retrieved_at": datetime.now(timezone.utc).isoformat(),
                                                      "raw_sha256": digest(cache.read_bytes())})
            return payload
        if status in ["400", "401", "403", "404", "422"]:
            raise RuntimeError(f"Non-retryable HTTP {status}: {body[:250]}")
        delay = min(15 * 2 ** attempt, 300)
        print(f"Transient download failure HTTP {status or 'network'}; attempt {attempt + 1}/8; waiting {delay}s", flush=True)
        if attempt < 7:
            time.sleep(delay)
    raise RuntimeError("Download retry budget exhausted; cached successful models remain resumable")


def local_year_index(year):
    return pd.date_range(f"{year}-01-01", periods=8760, freq="h", tz="Etc/GMT+4")


def validate_power(values):
    values = np.asarray(values, dtype=float)
    assert len(values) == 8760 and np.isfinite(values).all() and (values >= 0).all()
    assert values.sum() > 0
    return values


def monthly_curve(ac):
    months, offset = [], 0
    for month, days in enumerate(DAYS, 1):
        block = ac[offset:offset + days * 24].reshape(days, 24)
        months.append({"month": month, "days": days, "monthly_energy_kwh": float(block.sum() / 1000),
                       "average_day_hourly_generation_wh": block.mean(axis=0).tolist()})
        offset += days * 24
    assert offset == len(ac) == 8760
    return months


def reference_ac(dc):
    pac = 1000 / 1.2
    startup = 0.004931 * pac
    return np.clip(pac * (dc - startup) / (pac / 0.96 - startup), 0, pac)


def pvgis(config, source, folder):
    settings = SETTINGS[source]
    lat, lon = SITES[config["site"]]
    # PVGIS: south=0, west=90, east=-90, north=180 (not PVWatts azimuth).
    aspect = ((config["azimuth"] - 180 + 180) % 360) - 180
    parameters = {"lat": lat, "lon": lon, "startyear": settings["year"], "endyear": settings["year"] + 1,
                  "raddatabase": settings["database"], "pvcalculation": 1, "peakpower": 1,
                  "loss": 14, "angle": config["tilt"], "aspect": aspect, "pvtechchoice": "crystSi",
                  "mountingplace": "building" if config["mounting"] == "roof" else "free",
                  "usehorizon": 1, "outputformat": "json"}
    url = f"https://re.jrc.ec.europa.eu/api/{settings['version']}/seriescalc?{urlencode(parameters)}"
    raw_path = folder / config["id"] / "raw.json.gz"
    raw = fetch_json(url, raw_path)
    assert raw["inputs"]["meteo_data"]["radiation_db"] == settings["database"]
    assert abs(raw["inputs"]["location"]["latitude"] - lat) < 1e-6
    assert abs(raw["inputs"]["location"]["longitude"] - lon) < 1e-6
    assert raw["meta"]["outputs"]["hourly"]["variables"]["P"]["units"] == "W"
    assert raw["inputs"]["pv_module"]["peak_power"] == 1
    assert raw["inputs"]["pv_module"]["system_loss"] == 14
    fixed = raw["inputs"]["mounting_system"]["fixed"]
    assert float(fixed["slope"]["value"]) == config["tilt"]
    returned_aspect = float(fixed["azimuth"]["value"])
    # Observed in both API versions: exact north (-180 or +180) returns -179.
    # Do not silently call this exact north or assume it is just output rounding.
    # Accept ONLY this documented 1-degree exception, and expose it in the UI.
    assert (returned_aspect - aspect) % 360 == 0 or (aspect == -180 and returned_aspect == -179)
    records = raw["outputs"]["hourly"]
    stamps = pd.to_datetime([r["time"] for r in records], format="%Y%m%d:%H%M", utc=True)
    # ERA5 records are stamped at :30; group by the UTC hour they describe,
    # then convert to civil UTC-4. Keep original timestamps in the raw archive.
    series = pd.Series([r["P"] for r in records], index=stamps.floor("h").tz_convert("Etc/GMT+4"))
    assert not series.index.has_duplicates
    ac = validate_power(series.reindex(local_year_index(settings["year"])).to_numpy())
    metadata = {"parameters": parameters, "api_inputs": raw["inputs"], "api_output_metadata": raw["meta"]["outputs"],
                "input_timestamp_minutes": sorted(set(stamps.minute.tolist())), "raw": [str(raw_path.relative_to(folder))],
                "conversion": "PVGIS P: system electrical output W. Linear capacity scaling + AC cap only; no second inverter efficiency applied.",
                "mounting_note": "PVGIS building means building-integrated without rear airflow; not identical to PVWatts fixed roof.",
                "requested_azimuth_clockwise_from_north": config["azimuth"],
                "api_reported_azimuth_clockwise_from_north": (returned_aspect + 180) % 360,
                "orientation_note": "North requests return -179 in PVGIS convention (1 degree clockwise from north); treated as approximate north, not claimed exact. Horizontal azimuth is irrelevant."}
    return ac, None, metadata


def nasa_weather(site, folder):
    lat, lon = SITES[site]
    params = "ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF,T2M,WS10M"
    raw_files, pieces, sources = [], [], set()
    for start, end in [("20220101", "20221231"), ("20230101", "20230101")]:
        query = {"latitude": lat, "longitude": lon, "start": start, "end": end, "community": "RE",
                 "parameters": params, "format": "JSON", "time-standard": "UTC"}
        target = folder / "weather" / site / f"{start}-{end}.json.gz"
        raw = fetch_json("https://power.larc.nasa.gov/api/temporal/hourly/point?" + urlencode(query), target)
        assert raw["header"]["time_standard"] == "UTC"
        for parameter in ["ALLSKY_SFC_SW_DWN", "ALLSKY_SFC_SW_DNI", "ALLSKY_SFC_SW_DIFF"]:
            assert raw["parameters"][parameter]["units"] == "Wh/m^2"
        assert raw["parameters"]["T2M"]["units"] == "C"
        assert raw["parameters"]["WS10M"]["units"] == "m/s"
        sources.update(raw["header"]["sources"])
        frame = pd.DataFrame(raw["properties"]["parameter"])
        frame.index = pd.to_datetime(frame.index, format="%Y%m%d%H", utc=True).tz_convert("Etc/GMT+4")
        pieces.append(frame)
        raw_files.append(str(target.relative_to(folder)))
    frame = pd.concat(pieces).reindex(local_year_index(2022)).astype(float)
    assert frame.shape == (8760, 5) and np.isfinite(frame.to_numpy()).all()
    assert (frame.to_numpy() != -999).all(), "Missing weather values; do not interpolate silently"
    assert (frame.drop(columns=["T2M"]).to_numpy() >= 0).all()
    return frame, raw_files, sorted(sources)


def nasa(config, weather):
    frame, raw_files, sources = weather[config["site"]]
    lat, lon = SITES[config["site"]]
    # NASA hour labels are treated as interval starts, geometry at midpoint.
    position = pvlib.solarposition.get_solarposition(frame.index + pd.Timedelta(minutes=30), lat, lon)
    zenith, sun_azimuth = position.apparent_zenith.to_numpy(), position.azimuth.to_numpy()
    poa = pvlib.irradiance.get_total_irradiance(config["tilt"], config["azimuth"], zenith, sun_azimuth,
            dni=frame.ALLSKY_SFC_SW_DNI.to_numpy(), ghi=frame.ALLSKY_SFC_SW_DWN.to_numpy(),
            dhi=frame.ALLSKY_SFC_SW_DIFF.to_numpy(), albedo=0.2, model="isotropic")
    aoi = pvlib.irradiance.aoi(config["tilt"], config["azimuth"], zenith, sun_azimuth)
    effective = poa["poa_direct"] * pvlib.iam.ashrae(aoi, b=0.05) + poa["poa_diffuse"]
    temperature_key = "close_mount_glass_glass" if config["mounting"] == "roof" else "open_rack_glass_glass"
    temp_parameters = pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"][temperature_key]
    cell_temp = pvlib.temperature.sapm_cell(poa["poa_global"], frame.T2M.to_numpy(), frame.WS10M.to_numpy(), **temp_parameters)
    dc = validate_power(np.maximum(0, pvlib.pvsystem.pvwatts_dc(effective, cell_temp, pdc0=1000, gamma_pdc=-0.004) * 0.86))
    metadata = {"raw": raw_files, "weather_sources": sources, "pvlib_version": pvlib.__version__,
                "conversion": "NASA irradiance -> isotropic POA -> ASHRAE direct IAM -> SAPM cell temperature -> PVWatts V5 DC * 0.86; not NASA-provided generation",
                "parameters": {"albedo": 0.2, "iam_b": 0.05, "diffuse_iam": 1, "gamma_pdc_per_c": -0.004,
                               "system_losses_percent": 14, "temperature_model": temperature_key, "temperature_parameters": temp_parameters},
                "timestamp_note": "UTC hour treated as start; midpoint solar geometry; converted to UTC-4 with explicit next-year boundary weather",
                "limitations": "Coarse satellite/reanalysis grid; generic modules, no terrain/roof shadow, snow or site-specific soiling."}
    return reference_ac(dc), dc, metadata


def collect(source):
    folder = BASE / source
    folder.mkdir(parents=True, exist_ok=True)
    manifest = {"schema_version": 2, "source": source, "status": "collecting", "expected_models": 36,
                "year": SETTINGS[source]["year"], "started_at": datetime.now(timezone.utc).isoformat(), "models": []}
    save(folder / "manifest.json", manifest)
    weather = {site: nasa_weather(site, folder) for site in SITES} if source == "nasa-power" else None
    for index, config in enumerate(configs(), 1):
        ac, dc, provenance = nasa(config, weather) if weather is not None else pvgis(config, source, folder)
        ac = validate_power(ac)
        full_id = source + "/" + config["id"]
        model = {"id": full_id, "source": source, "referenceCapacityKwp": 1,
                 "weatherSource": SETTINGS[source]["database"], "historicalYear": SETTINGS[source]["year"],
                 "provenance": provenance, "localUtcOffsetHours": -4,
                 "dcPowerW" if dc is not None else "acPowerW": (dc if dc is not None else ac).tolist()}
        runtime_path, curve_path = config["id"] + "/hourly.json.gz", config["id"] + "/curve.json"
        runtime_hash = save(folder / runtime_path, model, True)
        curve = {"schema_version": 2, "id": full_id, "source": source, "site": {"id": config["site"], "latitude": SITES[config["site"]][0], "longitude": SITES[config["site"]][1]},
                 "geometry": {"orientation": config["direction"], "tilt_degrees_from_horizontal": config["tilt"],
                              "azimuth_degrees_clockwise_from_north": config["azimuth"] if config["tilt"] != 0 else None, "mounting": config["mounting"]},
                 "system": {"dc_capacity_kwp": 1}, "time_basis": {"kind": "historical_year", "year": SETTINGS[source]["year"], "utc_offset_hours": -4, "interval_hours": 1, "days": 365},
                 "units": {"average_day_hourly_generation_wh": "Wh AC per hourly interval on average day", "monthly_energy_kwh": "kWh AC"},
                 "annual_generation_kwh": float(ac.sum() / 1000), "months": monthly_curve(ac), "provenance": provenance}
        curve_hash = save(folder / curve_path, curve)
        raw_hashes = {p: digest((folder / p).read_bytes()) for p in provenance["raw"]}
        manifest["models"].append({"id": full_id, "runtime": runtime_path, "runtime_sha256": runtime_hash,
                                  "curve": curve_path, "curve_sha256": curve_hash, "raw_sha256": raw_hashes,
                                  "annual_generation_kwh": curve["annual_generation_kwh"]})
        save(folder / "manifest.json", manifest)
        print(f"{source} {index}/36 {config['id']}: {curve['annual_generation_kwh']:.2f} kWh/kWp", flush=True)
    manifest["status"] = "complete"
    manifest["completed_at"] = datetime.now(timezone.utc).isoformat()
    save(folder / "manifest.json", manifest)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=list(SETTINGS), required=True)
    args = parser.parse_args()
    collect(args.source)
