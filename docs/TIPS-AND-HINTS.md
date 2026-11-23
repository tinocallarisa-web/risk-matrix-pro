# Tips &amp; Hints — Risk Matrix Pro

**TCViz** · Video walkthrough: https://www.youtube.com/watch?v=sDFYPunjZ-M

> Content for the *Tips &amp; Hints* page of the sample `.pbix`.
> Power BI text boxes do not render markdown tables — use `TIPS-AND-HINTS-PLAIN.txt` when pasting
> into the report.

---

## What's new in 1.1

- **Risk list (Pro):** the risks ranked beside the matrix, with their path in the band colours.
- **Six collection styles (Pro):** Boardroom, Ledger, Editorial, Signal, Aurora and Terrace.
- **Report theme** (new default) and **Classic** (the 1.0 look) templates, free.
- **Paths shown by default:** markers at the inherent position, every path drawn.
- **Text that scales** with the visual, **Accessibility** card, **format on the canvas**,
  **setup guide** and **12 languages**.

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
- **Crowded matrix? Switch arrows to "Selected and hovered".** Every path is drawn by default; with
  many risks, show a path only when you point at a risk, focus it or select it.
- **Place markers at Residual** to show today's exposure instead of the starting point.
- **Use the red ring as the agenda.** Risks above target are the ones a committee should discuss.
- **Match your methodology.** Custom thresholds (Pro) set where Medium, High and Critical start; the
  appetite score draws the line above which action is required.
- **Busy cell?** A "+n" badge counts the markers that do not fit. The cell detail panel (Pro) lists
  them all.
- **Watch the yellow strip while editing.** It reports risks that could not be plotted or values
  outside the scale.
- **Take the risk list to the meeting (Pro).** Risk list → Show risk list, then Sort by *Gap to
  target* to put the risks furthest from their target at the top. Point at a row to find its marker.
- **Pick a style (Pro)** under Style template. Colours you set yourself stay; Classic brings back the
  1.0 look.
- **Small tile?** Text shrinks with the visual down to 60 % and never under 8 px. Raise
  Accessibility → Minimum text size if your audience needs larger text.
- **Format on the canvas.** In format mode, click a cell, a marker, an axis, the legend or the risk
  list to format it in place.
- **Setup guide.** While editing, the corner card ticks off the optional fields. Close it with ✕;
  bring it back with Style template → Setup guide.
- **Click again to clear.** A second click on the same marker or cell clears the selection.
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
| Report theme and Classic, scaling text, Accessibility card, 12 languages | ✓ | ✓ |
| fx marker colours, shapes by category, cell detail panel | — | ✓ |
| Risk list, six collection styles (new in 1.1) | — | ✓ |

Without a licence, Pro settings show a "Pro preview" watermark while editing.

## Links

- Support: https://tinocallarisa-web.github.io/risk-matrix-pro/support.html
- Video: https://www.youtube.com/watch?v=sDFYPunjZ-M
- Email: support@tcviz.com
