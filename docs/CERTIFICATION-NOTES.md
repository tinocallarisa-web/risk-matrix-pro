# Certification Notes — Risk Matrix Pro

**Version 1.1.0.0 · TCViz · update of the published visual**

> The text to paste into *Notes for certification* is `docs/CERTIFICATION-NOTES-SHORT.txt`: that field
> truncates at 2,500 characters without warning. This file is the full reference, reached through the
> `certification` branch.

---

## 0. Notes for certification (text pasted in Partner Center)

```
Risk Matrix Pro 1.1.0.0 - GUID riskMatrixProEA50FD0540E0418BA9354F645C4AAA7A
Update. Full notes: docs/CERTIFICATION-NOTES.md, branch
"certification" of github.com/tinocallarisa-web/risk-matrix-pro (private: pbicvsupport
and OSDC1033 invited). Sample data: docs/sample-risks.csv. Changes: CHANGELOG.md.

WHAT CHANGED IN 1.1.0.0
New Pro: risk list beside the matrix; six collection styles (Style template).
New free: Report theme (default) and Classic templates; text that scales with the
visual (60-100 %, never under 8 px); Accessibility card; on-object formatting; setup
guide; 12 languages; dynamic format strings. Defaults: markers at inherent, all
paths drawn. Second click on a cell or marker clears the selection.

FREE vs PRO
Free: matrix, bands, markers, legend, tooltips, selection, keyboard, all new free
items. Pro: residual/target paths, above-target flag, custom thresholds, appetite
line, fx colours, category shapes, detail panel, risk list, six styles. Same limits.

TEST - PRO (node build-test.js: isPro true, GUID _test)
1. Risk=RiskID, Category, Likelihood, Impact, Residual, Target: 5x5, every path
   drawn. Click a marker: others filter; click again: clears.
2. Risk list on: ranked rows; Sort by Gap to target; hover a row lights its marker,
   click selects. Style template = Aurora: style applied. No watermark.
3. Keyboard: Tab, arrows, Enter, Esc, Shift+F10.

TEST - FREE (node build-test.js --free, no plan)
4. Edit mode: risk list or a style (e.g. Boardroom) renders under the "Pro preview"
   watermark; Power BI shows notifyFeatureBlocked, then notifyLicenseRequired.
5. Reading view: no risk list, Report theme instead of the style, no watermark.

CHECKS FOR BOTH
6. Accessibility > High contrast = On: system colours, bands as border thickness.
7. Shrink below 760x480: text and markers shrink together, none removed.
8. Report language Spanish or German: format pane and drawn texts translated.

PRIVACY
No network, telemetry or storage; privileges []. Only persistProperties: closing
the setup guide sets style.guide=false. No innerHTML.

LICENSING
IVisualLicenseManager only, no own server. getAvailableServicePlans requested once,
deferred after rendering events. isLicenseUnsupportedEnv / isLicenseInfoAvailable
honoured. No licensing UI of our own.

Rendering events on every path of update().
Video https://www.youtube.com/watch?v=sDFYPunjZ-M
Support: https://tinocallarisa-web.github.io/risk-matrix-pro/
```

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
| Demo video | https://www.youtube.com/watch?v=sDFYPunjZ-M |
| Support email | support@tcviz.com |

## 3. What the visual does

A likelihood × impact risk matrix. Each row of the **Risk** field becomes one marker, placed by
**Likelihood** (horizontal) and **Impact** (vertical) on a grid from 3 × 3 to 10 × 10. The grid size is
detected from the data unless the author fixes it. Cells are coloured by score band (likelihood ×
impact). Input can be levels, fractions (0–1) or percentages (0–100).

Pro adds residual and target positions, drawn as a path (inherent → residual → target) for every risk
(default since 1.1) or only for the hovered, focused or selected one, a ring on risks still above their target score, custom band thresholds, a
risk appetite line, conditional marker colours through fx rules, shapes by category, a cell detail
panel and, new in 1.1, a risk list beside the matrix (sorted by inherent score, residual score or gap to
target) and the six collection styles (Boardroom, Ledger, Editorial, Signal, Aurora, Terrace).

Free in 1.1 also gains the Report theme (default) and Classic templates, text that scales with the
visual (60–100 %, never under 8 px), an Accessibility card (high contrast Automatic / On, focus colour
and width, minimum text size), on-object formatting, a setup guide while editing and 12 languages.

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
3. Add residual and target fields. Every risk's path is drawn (solid to residual, dashed to target,
   diamond at the target), markers at the inherent position. Risks above target carry a red dashed
   ring. *Movement arrows → Selected and hovered risks* shows a path only on hover, focus or selection.
4. *Risk appetite* on: stepped line. *Custom thresholds* on: bands follow the scores entered.
   *Cell detail panel* on: clicking a cell opens a side panel with its risks. *Shape by category* on.
   *Marker color → fx* with a rule: colours per risk. No watermark, no licence notification.
5. Filter from another visual: non-matching markers dim (highlight).
5b. *Risk list → Show risk list*: ranked rows; *Sort by → Gap to target*; hovering a row lights its
   marker, clicking selects the risk. *Style template → Template → Aurora*: the style is applied.

### Free (no plan, or `node build-test.js --free`: real licence check, GUID `_testfree`)

6. Edit mode: every Pro setting still renders, under a "Pro preview" watermark. Power BI shows
   `notifyFeatureBlocked` naming the capability, then the persistent `notifyLicenseRequired` bar.
7. Reading view: free result — inherent positions, automatic bands, Report theme instead of a
   collection style, no appetite line, no movement, no risk list, no detail panel — and no watermark.
8. Free-only settings never produce a watermark or notification.

### Accessibility

9. Tab enters the matrix (one tab stop). Arrow keys move to the nearest risk in that direction; Home /
   End; Page Up / Page Down move ten; Enter or Space selects (Ctrl adds); Escape clears; Shift + F10 or
   the context menu key opens the context menu. The tooltip appears on focus.
10. Windows high contrast theme, or *Accessibility → High contrast → On*: only system colours; bands
    encoded as border thickness; appetite line dashed.
11. Below 760 × 480 px, text and markers shrink together down to 60 %, never under 8 px (or the
    *Minimum text size*); no label is removed.

## 6. Privacy and network access

**The visual makes no network requests of any kind.** `"privileges": []`; no `fetch`, `XMLHttpRequest`
or WebSocket; no external scripts, fonts, analytics or telemetry; no cookies, `localStorage` or
`sessionStorage`.

The only `persistProperties` call is the ✕ of the setup guide, which sets `style.guide = false`
(never from the selection callback). Otherwise only the standard format settings chosen by the author
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
  notification, calls `notifyFeatureBlocked` with a message naming the capability (in the report
  language, under 500 characters) and, after the banner, `notifyLicenseRequired(General)`. The notification is
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
| Report theme and Classic templates, scaling text, Accessibility card | ✓ | ✓ |
| On-object formatting, setup guide, 12 languages, dynamic format strings | ✓ | ✓ |
| Residual and target positions, movement arrows, above-target flag | — | ✓ |
| Custom score thresholds | — | ✓ |
| Risk appetite line | — | ✓ |
| Conditional marker colours (fx) | — | ✓ |
| Shapes by category | — | ✓ |
| Cell detail panel | — | ✓ |
| Risk list (1.1) | — | ✓ |
| Six collection styles (1.1) | — | ✓ |

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
| `allowInteractions` | Read from `hostCapabilities`, checked before every selection; no selection in format mode |
| On-object formatting | `supportsOnObjectFormatting`; cells, markers, axes, legend and risk list are sub-selectable |
| Dynamic format strings | `general.formatString` declared; tooltips and detail panel use each row's format |
| Format pane | `getFormattingModel()` (formatting model utils), conditional formatting via `ConstantOrRule` |
| High contrast | `host.colorPalette.isHighContrast` |
| Keyboard focus | `supportsKeyboardFocus` with a roving tabindex, implemented (not only declared) |
| Localisation | `stringResources` in 12 locales (en-US, es-ES, pt-BR, pt-PT, fr-FR, de-DE, it-IT, nl-NL, pl-PL, ja-JP, zh-CN, ko-KR); texts drawn by the visual and licence messages from the bundle |

## 10. Known limitations

- Drilldown is not supported: a risk matrix has no hierarchical render that a drill level would map to.
- Movement needs both fields of a pair (residual likelihood and impact, or target likelihood and
  impact). A single field produces a data warning in edit mode.
- Fractions and percentages are converted to grid levels before scoring.
