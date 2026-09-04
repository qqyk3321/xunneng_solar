# Tally Location Wrapper Design

## Goal

Build a small Next.js wrapper around Tally form `QKQpNX`.

The current site flow is:

1. Home page introduces household solar / PV consultation.
2. User enters the consultation flow from `/consultation`.
3. User searches an address or clicks the map to choose an installation location.
4. User fills the embedded Tally form.
5. User sees a thank-you modal and returns to the home page.

No login system is required.

## Integration Notes

The first step uses Google Maps Platform Extended Component Library. Address
search uses Place Picker data. A map click stores only coordinates; reverse
geocoding is deferred until the user explicitly confirms the location, to avoid
an address lookup for every map click.

Tally is embedded with the form id `QKQpNX`. The consultation page listens for
`Tally.FormSubmitted` `postMessage` events from the embed, shows a thank-you
message, and then sends the user back to the home page.

The confirmed location is encoded into the Tally iframe URL as a query parameter:

- `location_json`

Tally saves this value because form `QKQpNX` has a matching hidden field named
`location_json`.

## Current Pages

- `/`: simple placeholder landing page for solar consultation
- `/consultation`: Google Maps location selection and embedded Tally form

## Non-Goals

- User authentication
- Automatic browser geolocation
- Writing location data directly to Supabase outside the existing Tally webhook
- Editing Tally submissions after they are submitted

## Location JSON Shape

```json
{
  "address": "上海市黄浦区人民广场",
  "lat": 31.230416,
  "lng": 121.473701,
  "source": "manual_test",
  "capturedAt": "2026-09-04T00:00:00.000Z"
}
```
