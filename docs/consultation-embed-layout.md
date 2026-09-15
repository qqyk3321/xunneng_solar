# Consultation layout and Tally height

The consultation route uses its own compact brand header, URL-derived country
badge and three-step progress indicator. It does not use the homepage header or
footer. Privacy confirmation still precedes loading Tally. The form itself has
no outer card or scrolling container.

## Dynamic height

Use `src` alone on the iframe, with `dynamicHeight=1` from
`buildTallyIntakeUrl`. Do not combine `src` and `data-tally-src`: the Tally widget
initializes either `iframe[data-tally-src]:not([src])` or iframes without
`data-tally-src`; combining the attributes skips both initialization paths.

The official widget owns iframe resizing. Call `Tally.loadEmbeds()` when the
script is ready and when the iframe is remounted for a manual retry. The 720px
HTML height is an initial placeholder, not a fixed CSS height or maximum.
Do not manually hide scrolling to mask an uninitialized resizer, since that can
make questions inaccessible if the widget fails to load.

The loading indicator still waits for the trusted frame's `Tally.FormLoaded`
event. Slow connections offer manual retry or a separate questionnaire link;
there is no automatic reload of entered answers.

Reference: https://tally.so/help/embed-your-form (Dynamic height).

## Verification

`tests/consultation-layout.browser.cjs` loads the real public questionnaire at
390px and 1440px, checks actual frame height versus content height, and writes
screenshots to `/tmp/consultation-layout-<width>.png`. It never fills or submits.
Optional `REGION_BUILD_DIR` serves an isolated production build through browser
request interception without starting another server.
