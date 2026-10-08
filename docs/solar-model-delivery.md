# Solar model table delivery

> 适用范围：本文描述原 `/solar-analysis` 的清单生成与缓存。`/solution-suggest` 复用同一静态模型资产，但有独立清单与缓存键，只使用固定 PVWatts 南向20°模型；`solar:prepare` / `solar:check` 不自动同步其清单。当前说明和检查结果见 [solution-suggest 子项目说明](solution-suggest.md)。

## Data and deployment

- Four demand profiles remain small, fixed 24-point arrays in the analysis component.
- `npm run solar:prepare` reads and verifies the original archives offline, averages each local month/hour, retains the correct AC/DC basis and reference capacity, and rounds to 0.01 Wh. No external API call is made.
- The output contains 145 models (144 installation/source combinations plus Hoymiles), each with 12 × 24 values. Conditions are encoded in the stable model ID; metadata preserves source, year, basis and reference capacity. Current JSON is about 215 KB, gzip about 65 KB.
- Only the allowlisted calculation fields are published: no API credentials, full weather responses or collection receipts.
- Generated files: `public/solar-data/models.<content-hash>.json` and the small `lib/solar-analysis/model-table-manifest.json` imported by the client. `npm run solar:check` verifies reproducibility without writes. Commit both outputs when updating models. The normal website build does not regenerate data or need archive access.
- Vercel serves the public static JSON through its CDN. One-year immutable browser/CDN headers apply only to `/solar-data/`. Changing content changes the URL. Preserve older hashed assets while old open tabs may still need them; do not overwrite an immutable URL.
- The old `/solar-analysis/model` dynamic endpoint is removed, along with its archive deployment tracing. Original files remain in the repository for provenance and future preprocessing, but are not imported by application routes or included in their runtime bundles.

## Client cache

1. Server-side password validation is unchanged. The locked page does not read cached models or request the table. The data file itself is intentionally public, with user approval.
2. After the authorized component mounts, load the table from memory or localStorage key `solortide:solar-model-table:v1`.
3. Match the build's expected SHA-256 content version, then check stored text against the expected non-cryptographic corruption checksum and validate all IDs, dimensions and values. The checksum is not an authentication/security signature.
4. Missing, obsolete or damaged cache triggers one request to the hashed static URL, without credentials. Concurrent mounts share an in-flight request. No separate version-check API is required: the small manifest ships with the current application build.
5. Save the validated payload best-effort. Storage denial/quota failure must not affect calculation. Network/integrity failures show a retry action, never old model results. Retry bypasses the HTTP cache after a failed download.
6. Switching country/orientation/tilt/source looks up a row in memory. Changing batteries, SOC or demand recalculates dispatch, but not generation scaling. Changing only the displayed month does not rerun annual dispatch.

This is a performance cache, not an offline-login mechanism. Page authorization and visit logging still run on page entry. Stored public data is neither secret nor guaranteed permanent; browsers/users can remove it. No customer names, PDF contents, passwords or bills are persisted by this cache.

## Estimation change

The compact table represents monthly average days, not full daily weather. A repeated 365-day year is constructed in memory to preserve battery SOC continuity. Mean reference energy is preserved to rounding accuracy, but averaging before nonlinear inverter clipping/storage constraints can change final generation and savings. The UI and PDF explicitly disclose this, and PDF method version is 3.0. Full archives and their independent validation tests are retained.
