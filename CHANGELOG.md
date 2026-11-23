# Changelog

All notable changes to Risk Matrix Pro are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the Power BI
four-part version scheme (`major.minor.patch.build`).

---

## [1.1.0.0] — 2026-11-23

### Added

- **Risk list (Pro).** Format → Risk list → Show risk list: the risks ranked beside the matrix by inherent score,
  residual score or gap to target, each with its band and its path (inherent → residual → target) in the band
  colours, and a red dot when it is still above target. Point at a row to light up its marker; click a row to select
  the risk. Width adjustable (20–50 %).
- **The six collection styles (Pro).** Style template → Boardroom, Ledger, Editorial, Signal, Aurora or Terrace, the
  same styles as the rest of the TCViz visuals. Each style brings its own version of the four risk colours: they still
  read green → red, in the tone of the style. Category colours follow the style palette. Without a licence a style is
  drawn while you edit, under the "Pro preview" watermark; reading view shows Report theme.
- **Report theme and Classic templates (free).** Report theme (the default) takes text and axis colours from the
  report theme; Classic is the look of 1.0.
- **Text that scales with the visual.** Below report size (760 × 480 px) axes, cell scores, legend, labels, the detail
  panel and the markers shrink together, down to 60 % and never under 8 px. No label is removed to make room.
- **Accessibility card.** High contrast Automatic (Windows) or On, focus colour and width for keyboard navigation,
  minimum text size.
- **Format on the canvas (on-object formatting).** In format mode, click the cells, the markers, an axis, the legend or
  the risk list to format them where they are. A click in format mode never filters the page.
- **Setup guide.** While you edit, a card in the corner lists the optional fields (Category, Residual, Target,
  Tooltips) with a tick when each is in place, and the styles. Close it with ✕; turn it back on under Style template.
  It is hidden on tiles smaller than 420 × 280 px.
- **12 languages.** English, Spanish, Portuguese (Brazil and Portugal), French, German, Italian, Dutch, Polish,
  Japanese, Chinese (Simplified) and Korean: the format pane, the field wells and every text drawn by the visual.
- **Dynamic format strings** are declared: tooltips and the detail panel use the format of each row, in the report
  language.

### Changed

- **Movement shown by default.** With residual or target fields, markers now sit at the inherent position and every
  risk's path is drawn (Movement arrows → All risks). Before, markers sat at the residual position and the path
  appeared only for the hovered or selected risk. *Reports that never changed these settings will show the paths.*
- **One marker size.** All markers share the size that fits the busiest cell, so a lone risk is no longer drawn larger
  than its neighbours when the visual shrinks.
- **Marker labels** switch between black and white to contrast with their marker, unless you set a label colour.
- **Selection.** Clicking the same cell or marker again clears the selection; the selected cell gets a border and the
  other cells dim.
- **Interactions** follow the report setting read from the host capabilities.
- **"Pro preview" watermark** is the same as in the rest of the collection.

## [1.0.1.0] — 2026-09-21

### Changed

- Localization connected (English and Spanish), brand icon and resubmission fixes.

## [1.0.0.0] — 2026-09-16

First public release.

### Added

- **Likelihood × impact matrix** from 3 × 3 to 10 × 10, sized automatically from the data, with
  levels, fractions or percentages as input.
- **Automatic score bands** (Low, Medium, High, Critical) with configurable colours.
- **One marker per risk**, fitted to busy cells, with a `+n` badge when a cell holds more than fit.
- **Category** colours, legend (click to select a category) and per-category colour pickers.
- **Axis titles and level labels**, with fonts and colours for axes, legend and cell text.
- **Tooltips and report page tooltips**, including up to 5 extra measures with their model format.
- **Selection, multi-selection, cross-filtering, highlighting and bookmarks.**
- **Keyboard navigation** (arrow keys, Home / End, Page Up / Page Down, Enter, Escape, Shift + F10),
  screen reader labels and **high contrast** support.
- **Data warnings** for risks without likelihood or impact, values outside the scale, and residual or
  target fields added without their pair.
- **Pro:** residual and target positions with movement arrows, shown for the selected or hovered risk
  by default; flag for risks above their target; custom score thresholds; risk appetite line;
  conditional marker colours; shapes by category; cell detail panel.
- **Pro preview:** without a licence, Pro capabilities used while editing render under a "Pro preview"
  watermark, with Power BI's licence notification. Reading view shows the free result.
