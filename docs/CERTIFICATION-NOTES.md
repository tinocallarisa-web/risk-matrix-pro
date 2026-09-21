# Certification Notes — Risk Matrix Pro

**Version 1.0.0.0 · TCViz · first submission**

> The text to paste into *Notes for certification* is `docs/CERTIFICATION-NOTES-SHORT.txt`: that field
> truncates at 2,500 characters without warning. This file is the full reference, reached through the
> `certification` branch.

---

## 1. Source code

| Item | Value |
|---|---|
| Repository | https://github.com/tinocallarisa-web/risk-matrix-pro (private; `pbicvsupport` and `OSDC1033` invited) |
| **Certification branch** | https://github.com/tinocallarisa-web/risk-matrix-pro/tree/certification |
| Branch contents | Exactly the code that produced the submitted package. No `node_modules`, `dist` or `.tmp`. |
| Build command | `npm install` then `npx pbiviz package` |
| Lint / audit | `npx eslint src` (0 errors), `npm audit` (0 vulnerabilities) |
| API version | 5.11.1 · `powerbi-visuals-tools` 7.2.1 |
| GUID | `riskMatrixProEA50FD0540E0418BA9354F645C4AAA7A` |
| Sample data | `docs/sample-risks.csv` (25 risks with inherent, residual and target positions) |

## 2. Public pages

| Page | URL |
|---|---|
| Support &amp; documentation | https://tinocallarisa-web.github.io/risk-matrix-pro/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/risk-matrix-pro/privacy.html |
| Terms &amp; licence | https://tinocallarisa-web.github.io/risk-matrix-pro/terms.html |
| Changelog | https://tinocallarisa-web.github.io/risk-matrix-pro/changelog.html |
| Demo video | https://www.youtube.com/watch?v=0ps6t6t70JY |
| Support email | support@tcviz.com |

## 3. What the visual does

A likelihood × impact risk matrix. Each row of the **Risk** field becomes one marker, placed by
**Likelihood** (horizontal) and **Impact** (vertical) on a grid from 3 × 3 to 10 × 10. The grid size is
detected from the data unless the author fixes it. Cells are coloured by score band (likelihood ×
impact). Input can be levels, fractions (0–1) or percentages (0–100).

Pro adds residual and target positions, drawn as a path (inherent → residual → target) for the hovered,
focused or selected risk, a ring on risks still above their target score, custom band thresholds, a
risk appetite line, conditional marker colours through fx rules, shapes by category and a cell detail
panel.

## 4. Data roles and limits

| Role | Kind | Max | Notes |
|---|---|---|---|
| `risk` | Grouping | 1 | One marker per value |
| `category` | Grouping | 1 | Colours, legend, Pro shapes |
| `likelihood`, `impact` | Measure | 1 each | Required |
| `residualLikelihood`, `residualImpact` | Measure | 1 each | Pro |
| `targetLikelihood`, `targetImpact` | Measure | 1 each | Pro |
| `tooltips` | Measure | 5 | Formatted with the model format string |

`dataReductionAlgorithm: top 1000`. The limits are identical in Free and Pro.

## 5. Testing

Load `docs/sample-risks.csv` and map: Risk → `RiskID`, Category → `Category`, Likelihood, Impact,
Residual likelihood / impact, Target likelihood / impact, Tooltips → `Owner`, `Exposure`.

### Pro (active plan, or `node build-test.js`, which sets `isPro` to true and appends `_test` to the GUID)

1. With Risk, Category, Likelihood and Impact: a 5 × 5 matrix, legend, one marker per risk.
2. Hover a marker: tooltip with likelihood, impact, score and band. Click: other visuals filter.
   Ctrl + click adds. Click a cell: selects its risks. Click a legend entry: selects its category.
   Click empty space: clears. Right click: context menu.
3. Add residual and target fields. Hover a risk: its path appears (solid to residual, dashed to target,
   diamond at the target). Risks above target carry a red dashed ring. *Movement arrows → All risks*
   shows every path.
4. *Risk appetite* on: stepped line. *Custom thresholds* on: bands follow the scores entered.
   *Cell detail panel* on: clicking a cell opens a side panel with its risks. *Shape by category* on.
   *Marker color → fx* with a rule: colours per risk. No watermark, no licence notification.
5. Filter from another visual: non-matching markers dim (highlight).

### Free (no plan, or `node build-test.js --free`: real licence check, GUID `_testfree`)

6. Edit mode: every Pro setting still renders, under a "Pro preview" watermark. Power BI shows
   `notifyFeatureBlocked` naming the capability, then the persistent `notifyLicenseRequired` bar.
7. Reading view: free result — inherent positions, automatic bands, no appetite line, no movement, no
   detail panel — and no watermark.
8. Free-only settings never produce a watermark or notification.

### Accessibility

9. Tab enters the matrix (one tab stop). Arrow keys move to the nearest risk in that direction; Home /
   End; Page Up / Page Down move ten; Enter or Space selects (Ctrl adds); Escape clears; Shift + F10 or
   the context menu key opens the context menu. The tooltip appears on focus.
10. Windows high contrast theme: only system colours; bands encoded as border thickness; appetite line
    dashed.

## 6. Privacy and network access

**The visual makes no network requests of any kind.** `"privileges": []`; no `fetch`, `XMLHttpRequest`
or WebSocket; no external scripts, fonts, analytics or telemetry; no cookies, `localStorage` or
`sessionStorage`.

The visual does not call `persistProperties`. Only the standard format settings chosen by the author
are saved in the `.pbix` by Power BI. Selection goes through `ISelectionManager`.

Rendering uses `document.createElementNS` and `textContent` only; the visual's code contains no
`innerHTML`. Colours coming from settings or fx rules are validated as hex or `rgb()` before reaching
the DOM, and font names are sanitised. The only `http://` string is the SVG namespace identifier
(`http://www.w3.org/2000/svg`), which is not requested.

Bundled dependencies: `powerbi-visuals-utils-formattingmodel`, `powerbi-visuals-utils-formattingutils`,
`powerbi-visuals-utils-dataviewutils`. None reach the network.

## 7. Licence validation

- Official `IVisualLicenseManager` only. TCViz operates no licence server.
- `getAvailableServicePlans()` (IPromise2, consumed with `then(ok, err)`) is requested once, deferred
  with `setTimeout(..., 0)` after `update()` has emitted its rendering events.
- Pro when a plan matches the plan ID as the full Service ID (`publisher.offer.plan`) or as the plan ID
  alone, with state Active (1) or Warning (2).
- `isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` are honoured: where licences cannot be read,
  the free result is shown with no watermark and no purchase prompt, so a paying customer is never
  asked to buy again.
- On error: Free. The entitlement is never inferred from the environment.
- Notifications: when a Pro capability is newly used without a licence, the visual clears the current
  notification, calls `notifyFeatureBlocked` with a message naming the capability (English or Spanish,
  under 500 characters) and, after the banner, `notifyLicenseRequired(General)`. The notification is
  cleared when no Pro capability is in use.
- The visual shows no licensing UI of its own: every Pro setting is labelled "(Pro)" in the format pane
  and field wells, and the purchase path is Power BI's.

## 8. Free and Pro

| Capability | Free | Pro |
|---|---|---|
| Matrix 3 × 3 to 10 × 10, auto-sized; levels / fraction / percent input | ✓ | ✓ |
| Automatic score bands, band colours | ✓ | ✓ |
| Markers, +n badge, category colours, legend | ✓ | ✓ |
| Axis titles, level labels, fonts and colours | ✓ | ✓ |
| Tooltips, report page tooltips | ✓ | ✓ |
| Selection, multi-selection, highlight, bookmarks, context menu | ✓ | ✓ |
| Keyboard navigation, ARIA labels, high contrast | ✓ | ✓ |
| Data warnings | ✓ | ✓ |
| Residual and target positions, movement arrows, above-target flag | — | ✓ |
| Custom score thresholds | — | ✓ |
| Risk appetite line | — | ✓ |
| Conditional marker colours (fx) | — | ✓ |
| Shapes by category | — | ✓ |
| Cell detail panel | — | ✓ |

## 9. Power BI integration

| Feature | Implementation |
|---|---|
| Rendering events | `renderingStarted` / `renderingFinished` / `renderingFailed` on every path of `update()` |
| Tooltips | `host.tooltipService` with `identities`; `tooltips.supportedTypes.canvas` for report tooltips |
| Highlight | `supportsHighlight`; markers not highlighted are dimmed |
| Selection | `ISelectionManager.select` with category selection IDs; `showContextMenu` |
| Bookmarks | `registerOnSelectCallback` restores the selection |
| Filter sync | `supportsSynchronizingFilterState` |
| Multi-visual selection | `supportsMultiVisualSelection` |
| Landing page | `supportsLandingPage` + `supportsEmptyDataView`; lists the missing fields |
| `allowInteractions` | Checked before every selection |
| Format pane | `getFormattingModel()` (formatting model utils), conditional formatting via `ConstantOrRule` |
| High contrast | `host.colorPalette.isHighContrast` |
| Keyboard focus | `supportsKeyboardFocus` with a roving tabindex, implemented (not only declared) |
| Localisation | `stringResources` en-US and es-ES for roles and cards; licence messages in English and Spanish |

## 10. Known limitations

- Drilldown is not supported: a risk matrix has no hierarchical render that a drill level would map to.
- Movement needs both fields of a pair (residual likelihood and impact, or target likelihood and
  impact). A single field produces a data warning in edit mode.
- Fractions and percentages are converted to grid levels before scoring.
