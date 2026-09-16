# AppSource Listing — Risk Matrix Pro

Copy ready to paste into Partner Center, English only. **The marketplace description is the
documentation most people read** — update it on every release.

Limits measured in Partner Center: *Search results summary* 100 characters, *Description* 5,000
characters (truncated silently, and the "What's new" block goes inside it). Check with
`node scripts/check-listing-length.js`.

---

## Offer name

```
Risk Matrix Pro
```

---

## Search results summary

```
Risk matrix for Power BI: likelihood x impact, residual and target risk, appetite line.
```

---

## Description

```
A risk register in a table tells you what the risks are. A risk matrix tells you where they are — and Risk Matrix Pro also shows where they are going.

Every risk becomes a marker on a likelihood × impact grid, coloured by score band. Point at a risk and its whole path appears: the inherent position, the residual position after controls, and the target still to reach. Risks that have not reached their target carry a red ring, so the ones that need attention stand out before anyone reads a number.

Built for risk registers in internal audit, compliance, cybersecurity, health and safety, projects and enterprise risk management.

A MATRIX THAT FITS YOUR DATA

• Grid from 3 × 3 to 10 × 10, sized automatically from the highest level in your data
• Likelihood and impact as levels (1–5), probabilities (0–1) or percentages (0–100)
• Automatic Low / Medium / High / Critical bands with your own colours
• One marker per risk, shrinking to fit busy cells, with a +n badge when a cell is full
• Category colours and a clickable legend
• Axis titles and level labels: Rare, Unlikely, Possible, Likely, Almost certain

INTEGRATED WITH POWER BI

• Tooltips with likelihood, impact, score and band, plus up to five extra measures in their model format
• Report page tooltips
• Click a risk, a whole cell or a legend entry to cross-filter the report; Ctrl + click to add
• Filters from other visuals dim the risks that do not match
• Bookmarks restore the selection
• Data warnings while editing: risks with no likelihood or impact, values outside the scale, residual or target fields missing their pair

ACCESSIBLE

• Keyboard navigation: arrow keys move to the nearest risk, Enter selects, Escape clears, Shift + F10 opens the context menu
• Screen reader labels for every risk
• High contrast mode: system colours, bands encoded as border thickness

PRO

• Residual and target positions: inherent → residual → target, shown for the risk you point at, focus or select — or for all risks at once
• A red ring on every risk still above its target score
• Place markers at the inherent, residual or target position
• Custom score thresholds, to match your own methodology
• Risk appetite line across the matrix
• Conditional marker colours with fx rules
• Marker shapes by category — readable in black and white
• Cell detail panel: click a cell to list every risk inside it

FREE AND PRO

The Free tier is a complete, usable risk matrix with the same data limits as Pro: up to 1,000 risks. While you edit a report without a licence, Pro features can be previewed under a "Pro preview" watermark, so you can see exactly what you would get. Reading view shows the free result.

PRIVACY

The visual makes no network requests of any kind: no analytics, no telemetry, no external scripts. Your data never leaves the report. Licences are checked through Microsoft's own licensing API.

GETTING STARTED

1. Add Risk, Likelihood and Impact.
2. Add a Category for colours and a legend.
3. Pro: add Residual and Target likelihood and impact.

Documentation, video and sample data: https://tinocallarisa-web.github.io/risk-matrix-pro/support.html
Support: support@tcviz.com

WHAT'S NEW IN 1.0.0.0

First release.
```

---

## URLs to keep in sync

| Field | URL |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/risk-matrix-pro/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/risk-matrix-pro/privacy.html |
| Terms / licence | https://tinocallarisa-web.github.io/risk-matrix-pro/terms.html |
| Video | https://youtu.be/0ps6t6t70JY |

## Suggested categories and keywords

- Categories: choose in Partner Center from the options it offers for Power BI visuals (not verified here)
- Search keywords: `risk matrix`, `risk heat map`, `risk assessment`, `residual risk`, `risk appetite`

## Plan

| Field | Value |
|---|---|
| Plan ID | `risk-matrix-pro-tcviz` — must match `PLAN_ID` in `src/visual.ts`; the code accepts the full Service ID |
| Plan name | Risk Matrix Pro |
| Plan description | Unlocks residual and target movement, above-target flag, custom thresholds, risk appetite line, fx marker colours, shapes by category and the cell detail panel. |
