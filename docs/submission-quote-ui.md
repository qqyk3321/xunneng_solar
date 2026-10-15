# Customer submission quote UI

The approved design uses one large quote card on the left and two stacked result cards on the right. It applies to the shared Antigua and Dominica submission component. On desktop (over 960px), contacts and submission metadata occupy the left column, with the quote above submitted details on the right. On mobile and narrow screens (960px and below), show the quote first, followed by contacts/metadata and submitted details.

- Use the same solid light gray-green (`#eef2f0`) background for all three metric cards. No gradients, decorative icons or visible section heading.
- Only the quote's numeric value uses the brand yellow (`#fea619`). The currency prefix uses the same size and weight as the amount, in dark gray-green (`#334946`). The approximate symbol remains muted gray-green.
- Center the complete quote horizontally and vertically in the space below its field label. Keep the other metrics aligned left and vertically centered below their labels.
- Display `~` instead of `About`. Put `EC$` immediately before the amount; put `kWh` and `years` beside their values in smaller text. Keep an accessible name for the quote region and an expanded approximation label for screen readers.
- On phone viewports up to 600px, keep the full-width price card at 112px high, followed by the savings/payback cards side by side at 92px high. Keep currency and price equally sized; scale longer savings values to leave room for kWh. This replaces the earlier three stacked phone cards.
- Keep WhatsApp and Share quote side by side on phones, with 44px minimum targets and a compact contact heading. Show Submission ID, submitted date/time, use pattern and monthly kWh as four visible fields in a two-column summary. Nothing requires expanding a section. The default overview should fit common portrait screens down to 320×568; unusual long content or action feedback may grow naturally instead of clipping.
- On phones, suppress the duplicate floating contact button while the contact/submission overview is in view. Show it again after scrolling into the Tally preview. Desktop keeps the floating button and QR enlargement.
- Above the phone breakpoint, retain the existing layout: quote-container widths of 680px or less place the price above the other metrics; at 440px or less, stack three 132px cards. Scale the quote to its card width and formatted amount length.
- Keep current calculations, regional validation and the unavailable/missing-input states. Amounts remain live data; the approved `14,900 / 3,600 / 3.5` mock is a visual reference, not hard-coded production values.

Approved reference: `/home/qqyk/.codex/visualizations/2026/10/12/01a12eeb-2d3f-71f1-a47d-98bd63dbd9f3/quote-directions/round-07/`.
