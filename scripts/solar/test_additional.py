"""Offline unit tests; no external requests and no repository writes."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

import numpy as np
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("collector", Path(__file__).with_name("collect-additional.py"))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class AdditionalCollectorTests(unittest.TestCase):
    def test_geometry_coverage(self):
        configs = list(collector.configs())
        self.assertEqual(len(configs), 36)
        self.assertEqual(len({c["id"] for c in configs}), 36)
        self.assertEqual(sum(c["tilt"] == 0 for c in configs), 4)
        self.assertTrue(all(c["mounting"] == "roof" for c in configs if c["tilt"] > 0))

    def test_utc_boundary(self):
        for year in [2014, 2022]:
            index = collector.local_year_index(year)
            self.assertEqual(len(index), 8760)
            utc = index.tz_convert("UTC")
            self.assertEqual(str(utc[0]), f"{year}-01-01 04:00:00+00:00")
            self.assertEqual(str(utc[-1]), f"{year + 1}-01-01 03:00:00+00:00")

    def test_month_aggregation_preserves_energy(self):
        hourly = np.arange(8760, dtype=float)
        months = collector.monthly_curve(hourly)
        self.assertEqual(len(months), 12)
        self.assertEqual([m["days"] for m in months], collector.DAYS)
        self.assertAlmostEqual(sum(m["monthly_energy_kwh"] for m in months), hourly.sum() / 1000)
        for m in months:
            self.assertEqual(len(m["average_day_hourly_generation_wh"]), 24)
            self.assertAlmostEqual(sum(m["average_day_hourly_generation_wh"]) * m["days"] / 1000, m["monthly_energy_kwh"])

    def test_invalid_power_rejected(self):
        for invalid in [np.zeros(8760), np.ones(8759), np.full(8760, np.nan), np.full(8760, -1)]:
            with self.assertRaises(AssertionError):
                collector.validate_power(invalid)
        self.assertEqual(len(collector.validate_power(np.ones(8760))), 8760)

    def test_inverter_caps_and_never_creates_energy(self):
        dc = np.array([0, 1, 100, 800, 1000, 1500])
        ac = collector.reference_ac(dc)
        self.assertEqual(ac[0], 0)
        self.assertTrue((ac >= 0).all())
        self.assertTrue((ac <= dc).all())
        self.assertTrue((ac <= 1000 / 1.2).all())

    def test_cache_checks_request_and_hash_without_network(self):
        with tempfile.TemporaryDirectory(prefix="solar-collector-test-") as directory:
            cache = Path(directory) / "raw.json.gz"
            checksum = collector.save(cache, {"example": [0, 1.25]}, True)
            receipt = cache.with_suffix(".request.json")
            collector.save(receipt, {"url": "https://example.test/one", "raw_sha256": checksum})
            self.assertEqual(collector.fetch_json("https://example.test/one", cache), {"example": [0, 1.25]})
            with self.assertRaises(AssertionError):
                collector.fetch_json("https://example.test/two", cache)
            collector.save(receipt, {"url": "https://example.test/one", "raw_sha256": "wrong"})
            with self.assertRaises(AssertionError):
                collector.fetch_json("https://example.test/one", cache)

    def test_nasa_horizontal_is_orientation_independent(self):
        # Use the archived inputs, not an external API or fabricated generation.
        with patch.object(collector.subprocess, "run", side_effect=AssertionError("Tests must not request external APIs")):
            frame, raw_files, sources = collector.nasa_weather("antigua", collector.BASE / "nasa-power")
        self.assertEqual(frame.shape, (8760, 5))
        self.assertEqual(frame.index[0].hour, 0)
        weather = {"antigua": (frame, raw_files, sources)}
        config = {"site": "antigua", "azimuth": 0, "tilt": 0, "mounting": "roof"}
        ac_n, dc_n, _ = collector.nasa(config, weather)
        ac_s, dc_s, _ = collector.nasa({**config, "azimuth": 180}, weather)
        np.testing.assert_allclose(dc_n, dc_s, atol=1e-10)
        np.testing.assert_allclose(ac_n, ac_s, atol=1e-10)
        self.assertGreater(dc_n.sum(), 0)
        self.assertTrue((dc_n[frame.ALLSKY_SFC_SW_DWN.to_numpy() == 0] == 0).all())


if __name__ == "__main__":
    unittest.main()
