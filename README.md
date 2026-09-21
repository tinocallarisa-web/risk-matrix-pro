# Risk Matrix Pro

A Power BI custom visual that places every risk of a register on a likelihood × impact grid — and,
in Pro, shows where each risk is going: residual position after controls, target, and how far it
still is from that target.

![Version](https://img.shields.io/badge/version-1.0.0.0-C96442)
![API](https://img.shields.io/badge/Power%20BI%20API-5.11.1-B05730)

▶ [Video walkthrough](https://www.youtube.com/watch?v=0ps6t6t70JY)

---

## Field wells

| Well | Accepts | Limit | Purpose |
|---|---|---|---|
| `Risk` | Text or ID field | 1 | One marker per risk |
| `Category` | Grouping field | 1 | Colours, legend and (Pro) shapes |
| `Likelihood` | Measure or numeric column | 1 | Horizontal position |
| `Impact` | Measure or numeric column | 1 | Vertical position |
| `Residual likelihood / impact` (Pro) | Measure or numeric column | 1 each | Position after controls |
| `Target likelihood / impact` (Pro) | Measure or numeric column | 1 each | Position to reach |
| `Tooltips` | Measures | 5 | Extra tooltip values |

Up to 1,000 risks. Values can be levels (1–10), fractions (0–1) or percentages (0–100); the grid sizes
itself from the data (3 × 3 to 10 × 10) unless you choose a size.

## Free vs Pro

**Free** renders a complete matrix: automatic score bands, category colours and legend, axis and level
labels, tooltips and report tooltips, selection and cross-filtering, bookmarks, keyboard navigation,
screen reader labels, high contrast and data warnings.

**Pro** adds residual and target positions with movement arrows, a flag for risks above target,
custom score thresholds, the risk appetite line, conditional marker colours, shapes by category and
the cell detail panel.

The data limits are the same in both tiers. See the [terms](https://tinocallarisa-web.github.io/risk-matrix-pro/terms.html)
for the full breakdown.

## Building

```bash
npm install
npx pbiviz package          # production package
node build-test.js          # test package, Pro forced on, GUID + _test
node build-test.js --free   # test package, real licence check, GUID + _testfree
```

The `.pbiviz` lands in `dist/`.

## Documentation

- [Support &amp; documentation](https://tinocallarisa-web.github.io/risk-matrix-pro/support.html)
- [Privacy policy](https://tinocallarisa-web.github.io/risk-matrix-pro/privacy.html)
- [Terms &amp; licence](https://tinocallarisa-web.github.io/risk-matrix-pro/terms.html)
- [Changelog](https://tinocallarisa-web.github.io/risk-matrix-pro/changelog.html)

## Privacy

No network access of any kind. The `privileges` array in `capabilities.json` is empty, so Power BI
blocks outbound connections at the platform level. Nothing is collected, transmitted or stored
outside your own report file.

## Support

support@tcviz.com

---

© 2026 TCViz
