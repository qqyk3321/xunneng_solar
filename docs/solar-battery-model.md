# Solar analysis battery reserve and utilization

Only `/solar-analysis` and its client-generated report use this model. Public regional calculators are unchanged.

## Capacity and SOC reserve

- Nominal storage options: 0, 5.12, 10.24, 15.36, 20.48 kWh. These are capacity estimates, not approval to mix battery models.
- Reserve choices: 10% (default), 20%, 30%.
- Usable capacity = nominal capacity × (1 − reserve percentage).
- Discharge stops at the reserve floor; PV can still supply demand directly and the grid fills remaining deficits. No grid charging.
- Charge/discharge power remains 0.5 × **nominal** kWh, in kW; efficiency is the existing generic 95% in each direction, not a manufacturer guarantee.
- The full-year periodic SOC boundary is settled before totals are collected. Midnight is not reset, and initial reserve does not create free energy.

Reference: Hoymiles [LB-5D-G2 datasheet](https://www.hoymiles.com/uploadfile/1/202509/c2202f92e4.pdf), [LB-10D-USG2 datasheet](https://www.hoymiles.com/uploadfile/1/202506/ec05163164.pdf). Their nominal capacities are 5.12 and 10.24 kWh, with 90% DOD. A 10% reserve is an estimation assumption inferred from DOD, **not** a claim about a BMS hard cutoff. Actual inverter/BMS settings and compatibility require verification.

## Battery utilization

This metric describes daily charging-capacity coverage, not round-trip efficiency, peak SOC, financial return, or uncapped equivalent full cycles.

1. Sum actual net stored energy each local day: gross charge input × 95%.
2. Daily utilization = min(100%, net stored energy / usable capacity × 100%).
3. Monthly utilization = arithmetic mean of daily utilization within that month.
4. Annual utilization = sum(monthly utilization × month days) / 365.

Clipping happens **before** monthly averaging. A day with two cycles and a day with no charging average 50%, not 100%. No battery is `null` (UI `—`, PDF `N/A`); an installed battery with no actual charging is 0%. Increasing reserve reduces the denominator and can raise this percentage even as grid purchases increase.

The live page now loads the versioned compact model table described in `solar-model-delivery.md`. All sources use 12 monthly average-day curves repeated over the actual month lengths, then dispatch maintains SOC continuity across days/months. Daily weather variation and extended cloudy spells are not represented. Averaging before inverter clipping and battery dispatch changes generation, savings and utilization compared with the original full-hourly simulation; these are simplified estimates, not a lossless compression of the old calculation.

Displayed values use two decimals. The reference generation table is rounded to 0.01 Wh; subsequent calculations and the PDF snapshot retain full precision. PDF method version: 3.0 (monthly-average-day); reserves and monthly/annual utilization are included in the seven-page A4 proposal.
