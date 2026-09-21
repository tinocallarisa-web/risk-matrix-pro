# Tips &amp; Hints — Risk Matrix Pro

**TCViz** · Video walkthrough: https://www.youtube.com/watch?v=0ps6t6t70JY

> Content for the *Tips &amp; Hints* page of the sample `.pbix`.
> Power BI text boxes do not render markdown tables — use `TIPS-AND-HINTS-PLAIN.txt` when pasting
> into the report.

---

## Getting started

1. Drop the visual on the canvas.
2. Drag the risk ID into **Risk**. Short IDs (R01, R02…) read best inside the markers.
3. Drag the likelihood into **Likelihood** and the impact into **Impact**.
4. Optional: a **Category** (type, owner, status) colours the markers and builds the legend.
5. Optional (Pro): **Residual** and **Target** likelihood and impact show where each risk is going.

## Field wells

| Well | Purpose |
|---|---|
| Risk | One marker per value |
| Category | Colours, legend, and shapes in Pro |
| Likelihood / Impact | Position on the grid |
| Residual likelihood / impact (Pro) | Position after controls — add both |
| Target likelihood / impact (Pro) | Position to reach — add both |
| Tooltips | Up to 5 extra measures |

## Tips

- **One row per risk.** If Power BI shows "Sum of Likelihood", set the field to *Don't summarize*,
  *Maximum* or *Average*, or several rows are being added together.
- **Leave Grid size on Auto.** It matches the highest level in your data; fix it only if your scale
  goes higher than your data does.
- **Name the levels.** Axes → level labels: `Rare, Unlikely, Possible, Likely, Almost certain`.
- **Keep arrows on "Selected and hovered".** With more than a handful of risks, showing every path
  at once becomes unreadable.
- **Place markers at Residual** to show today's exposure, with the path back to the inherent position
  on hover.
- **Use the red ring as the agenda.** Risks above target are the ones a committee should discuss.
- **Match your methodology.** Custom thresholds (Pro) set where Medium, High and Critical start; the
  appetite score draws the line above which action is required.
- **Busy cell?** A "+n" badge counts the markers that do not fit. The cell detail panel (Pro) lists
  them all.
- **Watch the yellow strip while editing.** It reports risks that could not be plotted or values
  outside the scale.
- **Cross-filtering a table** needs the relationship direction set to *Both* in Model view.

## Keyboard

Tab enters the matrix · arrows move between risks · Home / End · Page Up / Page Down · Enter selects ·
Ctrl + Enter adds · Escape clears · Shift + F10 opens the context menu.

## Free vs Pro

| Capability | Free | Pro |
|---|---|---|
| Matrix, bands, legend, labels, tooltips, selection, keyboard, high contrast | ✓ | ✓ |
| Residual and target movement, above-target flag | — | ✓ |
| Custom thresholds, risk appetite line | — | ✓ |
| fx marker colours, shapes by category, cell detail panel | — | ✓ |

Without a licence, Pro settings show a "Pro preview" watermark while editing.

## Links

- Support: https://tinocallarisa-web.github.io/risk-matrix-pro/support.html
- Video: https://www.youtube.com/watch?v=0ps6t6t70JY
- Email: support@tcviz.com
