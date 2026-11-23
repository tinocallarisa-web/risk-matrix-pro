# Risk Matrix Pro — Product Page Content

**TCViz** · Video: https://www.youtube.com/watch?v=sDFYPunjZ-M

Draft for the four tabs of the product page on tcviz.com. The live page is built from
`C:\tcviz\web\src\data.jsx` — edit that file (not `data.js`) and run `node scripts/build.js`.

---

# TAB 1 — OVERVIEW

## The problem

A risk register in a spreadsheet or table lists every risk, its likelihood, its impact and its owner.
It does not show the shape of the exposure: whether the critical risks cluster, how much sits above the
board's appetite, or whether the controls are actually moving anything.

The usual answer is a risk heat map drawn once in PowerPoint, which is out of date the day after the
committee. And even a good heat map shows only where a risk is today — not where it started, nor where
it is supposed to end up.

## How it works

Risk Matrix Pro turns the register into a live likelihood × impact matrix inside Power BI. Each risk is
a marker; each cell is coloured by its score band. The grid sizes itself from your data, and likelihood
and impact can be levels, probabilities or percentages.

In Pro, each risk carries its story: inherent position, residual position after controls, target
still to reach, drawn for every risk or only the one you point at. Risks that have not reached their target wear a red
ring, so the committee agenda writes itself. Draw your risk appetite across the matrix, set the band
thresholds of your own methodology, and click any cell to list what is inside. The risk list ranks
every risk beside the matrix by score or gap to target, and the six collection styles match the rest
of your TCViz visuals.

## Who it is for

Internal audit · Compliance and GRC · Cybersecurity · Health and safety · Project and programme
management · Enterprise risk management

---

# TAB 2 — FEATURES

## Free

- Likelihood × impact matrix from 3 × 3 to 10 × 10, sized from the data
- Levels, probabilities (0–1) or percentages (0–100) as input
- Automatic Low / Medium / High / Critical bands with your own colours
- One marker per risk, with a +n badge for busy cells
- Category colours and a clickable legend
- Axis titles and level labels
- Tooltips and report page tooltips
- Selection, multi-selection, cross-filtering, highlighting and bookmarks
- Keyboard navigation, screen reader labels, high contrast
- Data warnings while editing
- Report theme and Classic templates
- Text that scales with the visual, Accessibility card (high contrast, focus, minimum text size)
- Format on the canvas, setup guide, 12 languages

## Pro

- Residual and target positions: inherent → residual → target
- Red ring on risks still above their target
- Markers at the inherent, residual or target position
- Custom score thresholds
- Risk appetite line
- Conditional marker colours (fx)
- Marker shapes by category
- Cell detail panel
- Risk list: ranked by inherent score, residual score or gap to target (new in 1.1)
- Six collection styles: Boardroom, Ledger, Editorial, Signal, Aurora, Terrace (new in 1.1)

| Capability | Free | Pro |
|---|---|---|
| Matrix, bands, markers, legend, labels | ✓ | ✓ |
| Tooltips, report tooltips, selection, bookmarks | ✓ | ✓ |
| Keyboard, screen reader, high contrast | ✓ | ✓ |
| Data warnings | ✓ | ✓ |
| Report theme and Classic, scaling text, 12 languages | ✓ | ✓ |
| Up to 1,000 risks | ✓ | ✓ |
| Residual and target movement, above-target flag | — | ✓ |
| Custom thresholds, risk appetite line | — | ✓ |
| fx marker colours, shapes by category, cell detail panel | — | ✓ |
| Risk list, six collection styles | — | ✓ |

---

# TAB 3 — TECHNICAL

| Item | Value |
|---|---|
| Power BI API | 5.11.1 |
| Data roles | Risk, Category, Likelihood, Impact, Residual likelihood / impact, Target likelihood / impact, Tooltips |
| Row limit | 1,000 risks |
| Network access | None — `privileges` is empty |
| Licensing | Microsoft `IVisualLicenseManager`, no TCViz server |
| Accessibility | Keyboard focus with roving tabindex, ARIA labels, high contrast (automatic or forced on), focus colour and width, minimum text size |
| Languages | 12: English, Spanish, Portuguese (BR, PT), French, German, Italian, Dutch, Polish, Japanese, Chinese (Simplified), Korean |
| Version | 1.1.0.0 |

Links: [Support](https://tinocallarisa-web.github.io/risk-matrix-pro/support.html) ·
[Privacy](https://tinocallarisa-web.github.io/risk-matrix-pro/privacy.html) ·
[Terms](https://tinocallarisa-web.github.io/risk-matrix-pro/terms.html) ·
[Video](https://www.youtube.com/watch?v=sDFYPunjZ-M)

---

# TAB 4 — CHANGELOG

## 1.1.0.0

Risk list and the six collection styles (Pro). Report theme and Classic templates, paths shown by
default, text that scales with the visual, Accessibility card, format on the canvas, setup guide and
12 languages.

## 1.0.0.0

First release. See https://tinocallarisa-web.github.io/risk-matrix-pro/changelog.html
