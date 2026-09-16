# Changelog

All notable changes to Risk Matrix Pro are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the Power BI
four-part version scheme (`major.minor.patch.build`).

---

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
