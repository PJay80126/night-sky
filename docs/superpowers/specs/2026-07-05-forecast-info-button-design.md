# Forecast Tab: Stat Explainer Info Buttons

**Date:** 2026-07-05
**Status:** Approved (user chose inline-expand pattern; rides on the
`forecast-stat-fixes` branch before merge)

## Problem

The Forecast tab's scoring badges (Outlook, Seeing, Transparency, Dew
Risk, Precip. Chance) use terms of art an amateur astronomer may not
know, and several were just re-defined (peak precip, min-spread dew).
There is no in-app explanation of what any badge means.

## Design

Inline-expandable explainer panels, toggled by a small ⓘ button — no
overlay (the only existing overlay is the image lightbox; a text modal
would be a bigger new component than the problem warrants).

### Placement

Exactly two cards get a button — the two whose stats are non-obvious:

1. **Tonight's Outlook card** — ⓘ appended as the last child of the
   flex `.fc-outlook-row`; panel after `.fc-stats-grid`. Explains: badge
   = median cloud over the real dusk-to-dawn (nautical twilight) window
   named in the title; what Unsettled and Variable mean; boxes are night
   medians.
2. **Astronomy Conditions card** — ⓘ appended as the last child of the
   flex `.section-header`; panel after `.fc-cond-grid`. Explains each of
   the four badges in observer terms (seeing blurs planets at high
   power; transparency matters for faint DSOs; dew risk = smallest
   temp–dew gap, usually pre-dawn; precip = peak hourly chance).

Current Conditions, the charts, and Tomorrow Night get no button:
their numbers are self-explanatory, and Tomorrow's badge semantics are
covered by the Outlook explanation.

### Mechanics

- `js/forecast.js`: one shared `fcToggleInfo(id)` that flips the
  panel's `hidden` attribute and syncs `aria-expanded` on the button
  (found via `[aria-controls="<id>"]`). Buttons are real `<button>`
  elements with `aria-controls`, `aria-expanded="false"`, and an
  `aria-label`. Panels start `hidden`.
- Markup is emitted by the existing card builders (`buildOutlookHTML`,
  `buildAstroConditionsHTML`) — cards are JS-built, so `index.html` is
  untouched. A tiny `_fcInfoBtn(panelId)` helper avoids duplicating the
  button markup.
- `styles.css`: `.fc-info-btn` (small round gold-outline button,
  `margin-left: auto` inside the flex headers) and `.fc-info-panel`
  (muted `--text-dim` text, top hairline border, own padding since both
  host cards clip with `overflow: hidden`).
- Panel state is not persisted; re-renders start collapsed. Fine —
  explainers are read once.

### Housekeeping

- No cache bump needed beyond the v49 already on this branch (it
  invalidates `styles.css` and `js/forecast.js` together).
- CLAUDE.md gets a one-line convention note (`fcToggleInfo` + the
  two-panel placement).

## Verification

Extend the branch's Node `vm` smoke test: both builders emit the button
and a `hidden` panel with matching `aria-controls`/`id`; `fcToggleInfo`
flips `hidden` and `aria-expanded` both ways against a stubbed DOM.
`node --check` on `js/forecast.js`.
