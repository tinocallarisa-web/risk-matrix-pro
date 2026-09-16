"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/** Etiqueta de las opciones de pago. Cada etiqueta necesita su puerta en visual.ts. */
export const PRO = " (Pro)";

class GridCard extends FormattingSettingsCard {
    size = new formattingSettings.ItemDropdown({
        name: "size",
        displayName: "Grid size",
        description: "Auto sizes the grid to the highest level in your data (3 to 10), or 5 x 5 for fractions and percentages.",
        items: [
            { value: "auto", displayName: "Auto (from data)" },
            { value: "3", displayName: "3 x 3" },
            { value: "4", displayName: "4 x 4" },
            { value: "5", displayName: "5 x 5" },
            { value: "6", displayName: "6 x 6" },
            { value: "7", displayName: "7 x 7" },
            { value: "8", displayName: "8 x 8" },
            { value: "9", displayName: "9 x 9" },
            { value: "10", displayName: "10 x 10" }
        ],
        value: { value: "auto", displayName: "Auto (from data)" }
    });

    inputScale = new formattingSettings.ItemDropdown({
        name: "inputScale",
        displayName: "Input values",
        description: "Auto treats whole numbers up to the grid size as levels, values up to 1 as fractions and values up to 100 as percentages.",
        items: [
            { value: "auto", displayName: "Auto (detect)" },
            { value: "levels", displayName: "Levels (1 to grid size)" },
            { value: "fraction", displayName: "Fraction (0 to 1)" },
            { value: "percent", displayName: "Percent (0 to 100)" }
        ],
        value: { value: "auto", displayName: "Auto (detect)" }
    });

    cellGap = new formattingSettings.NumUpDown({
        name: "cellGap", displayName: "Cell gap (px)", value: 3,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 20 } }
    });

    cellRadius = new formattingSettings.NumUpDown({
        name: "cellRadius", displayName: "Cell corner radius (px)", value: 4,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 20 } }
    });

    showScore = new formattingSettings.ToggleSwitch({ name: "showScore", displayName: "Show cell score", value: true });
    showCount = new formattingSettings.ToggleSwitch({ name: "showCount", displayName: "Show risk count", value: false });

    name = "grid";
    displayName = "Grid";
    textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Score and count color", value: { value: "#5C5847" } });

    dataWarnings = new formattingSettings.ItemDropdown({
        name: "dataWarnings",
        displayName: "Data warnings",
        description: "Tells you when risks are hidden (no likelihood or impact) or placed at the edge (value outside the scale).",
        items: [
            { value: "edit", displayName: "While editing" },
            { value: "always", displayName: "Always" },
            { value: "off", displayName: "Off" }
        ],
        value: { value: "edit", displayName: "While editing" }
    });

    slices: FormattingSettingsSlice[] = [this.size, this.inputScale, this.cellGap, this.cellRadius, this.showScore, this.showCount, this.textColor, this.dataWarnings];
}

class BandsCard extends FormattingSettingsCard {
    lowColor = new formattingSettings.ColorPicker({ name: "lowColor", displayName: "Low", value: { value: "#8BC48A" } });
    mediumColor = new formattingSettings.ColorPicker({ name: "mediumColor", displayName: "Medium", value: { value: "#F2D16B" } });
    highColor = new formattingSettings.ColorPicker({ name: "highColor", displayName: "High", value: { value: "#F29E5C" } });
    criticalColor = new formattingSettings.ColorPicker({ name: "criticalColor", displayName: "Critical", value: { value: "#E0605A" } });

    customThresholds = new formattingSettings.ToggleSwitch({
        name: "customThresholds", displayName: "Custom thresholds" + PRO, value: false,
        description: "Off: bands follow the share of the maximum score. On: set the score where each band starts."
    });
    mediumFrom = new formattingSettings.NumUpDown({ name: "mediumFrom", displayName: "Medium from score", value: 5 });
    highFrom = new formattingSettings.NumUpDown({ name: "highFrom", displayName: "High from score", value: 10 });
    criticalFrom = new formattingSettings.NumUpDown({ name: "criticalFrom", displayName: "Critical from score", value: 17 });

    name = "bands";
    displayName = "Score bands";
    slices: FormattingSettingsSlice[] = [
        this.lowColor, this.mediumColor, this.highColor, this.criticalColor,
        this.customThresholds, this.mediumFrom, this.highFrom, this.criticalFrom
    ];
}

class AppetiteCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show appetite line", value: false });
    score = new formattingSettings.NumUpDown({
        name: "score", displayName: "Appetite score", value: 9,
        description: "Cells with a score up to this value are inside the appetite; the line marks the boundary."
    });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Line color", value: { value: "#252423" } });
    width = new formattingSettings.NumUpDown({
        name: "width", displayName: "Line width", value: 3,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 1 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 8 } }
    });

    topLevelSlice = this.show;
    name = "appetite";
    displayName = "Risk appetite" + PRO;
    slices: FormattingSettingsSlice[] = [this.score, this.color, this.width];
}

class MarkersCard extends FormattingSettingsCard {
    size = new formattingSettings.NumUpDown({
        name: "size", displayName: "Marker size (px)", value: 22,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 60 } }
    });
    showLabels = new formattingSettings.ToggleSwitch({ name: "showLabels", displayName: "Show labels", value: true });
    labelMaxChars = new formattingSettings.NumUpDown({
        name: "labelMaxChars", displayName: "Label max characters", value: 4,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 1 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 12 } }
    });
    labelColor = new formattingSettings.ColorPicker({ name: "labelColor", displayName: "Label color", value: { value: "#FFFFFF" } });
    fill = new formattingSettings.ColorPicker({
        name: "fill",
        displayName: "Marker color (fx: Pro)",
        description: "Used when there is no Category. With fx you can colour each risk by a rule or a field value (Pro).",
        value: { value: "#3D3929" },
        selector: dataViewWildcard.createDataViewWildcardSelector(dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals),
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });
    shapeByCategory = new formattingSettings.ToggleSwitch({ name: "shapeByCategory", displayName: "Shape by category" + PRO, value: false });

    name = "markers";
    displayName = "Markers";
    slices: FormattingSettingsSlice[] = [this.size, this.showLabels, this.labelMaxChars, this.labelColor, this.fill, this.shapeByCategory];
}

class MovementCard extends FormattingSettingsCard {
    arrows = new formattingSettings.ItemDropdown({
        name: "arrows",
        displayName: "Movement arrows",
        description: "Selected and hovered keeps the matrix readable: a risk's path appears when you point at it, focus it or select it.",
        items: [
            { value: "focus", displayName: "Selected and hovered risks" },
            { value: "all", displayName: "All risks" },
            { value: "off", displayName: "Off" }
        ],
        value: { value: "focus", displayName: "Selected and hovered risks" }
    });
    plotAt = new formattingSettings.ItemDropdown({
        name: "plotAt",
        displayName: "Place markers at",
        items: [
            { value: "inherent", displayName: "Inherent position" },
            { value: "residual", displayName: "Residual position" },
            { value: "target", displayName: "Target position" }
        ],
        value: { value: "residual", displayName: "Residual position" }
    });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Arrow color", value: { value: "#535146" } });

    flagOffTarget = new formattingSettings.ToggleSwitch({
        name: "flagOffTarget", displayName: "Flag risks above target", value: true,
        description: "Draws a dashed ring around risks whose current score (residual, or inherent if there is none) is still above the target score."
    });
    offTargetColor = new formattingSettings.ColorPicker({ name: "offTargetColor", displayName: "Above-target ring color", value: { value: "#C00000" } });

    name = "movement";
    displayName = "Movement and target" + PRO;
    description = "Needs Residual and/or Target likelihood and impact.";
    slices: FormattingSettingsSlice[] = [this.arrows, this.plotAt, this.color, this.flagOffTarget, this.offTargetColor];
}

class DetailCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Open panel on cell click", value: false });
    background = new formattingSettings.ColorPicker({ name: "background", displayName: "Background", value: { value: "#FFFFFF" } });
    textColor = new formattingSettings.ColorPicker({ name: "textColor", displayName: "Text color", value: { value: "#3D3929" } });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font size", value: 12,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 24 } }
    });
    name = "detail";
    displayName = "Cell detail panel" + PRO;
    slices: FormattingSettingsSlice[] = [this.show, this.background, this.textColor, this.fontSize];
}

class AxesCard extends FormattingSettingsCard {
    xTitle = new formattingSettings.TextInput({ name: "xTitle", displayName: "Likelihood title", value: "Likelihood", placeholder: "Likelihood" });
    yTitle = new formattingSettings.TextInput({ name: "yTitle", displayName: "Impact title", value: "Impact", placeholder: "Impact" });
    xLabels = new formattingSettings.TextInput({
        name: "xLabels", displayName: "Likelihood level labels (comma separated)", value: "", placeholder: "Rare, Unlikely, Possible, Likely, Almost certain"
    });
    yLabels = new formattingSettings.TextInput({
        name: "yLabels", displayName: "Impact level labels (comma separated)", value: "", placeholder: "Insignificant, Minor, Moderate, Major, Severe"
    });
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: "Segoe UI" });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "Font size", value: 11 });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Color", value: { value: "#535146" } });

    name = "axes";
    displayName = "Axes";
    slices: FormattingSettingsSlice[] = [this.xTitle, this.yTitle, this.xLabels, this.yLabels, this.fontFamily, this.fontSize, this.color];
}

class LegendCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show legend", value: true });
    position = new formattingSettings.ItemDropdown({
        name: "position",
        displayName: "Position",
        items: [{ value: "top", displayName: "Top" }, { value: "bottom", displayName: "Bottom" }],
        value: { value: "top", displayName: "Top" }
    });
    fontFamily = new formattingSettings.FontPicker({ name: "fontFamily", displayName: "Font", value: "Segoe UI" });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font size", value: 11,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 32 } }
    });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "Text color", value: { value: "#535146" } });

    topLevelSlice = this.show;
    name = "legend";
    displayName = "Legend";
    slices: FormattingSettingsSlice[] = [this.position, this.fontFamily, this.fontSize, this.color];
}

/** Un selector de color por categoría; las slices se crean en cada update. */
class CategoryColorsCard extends FormattingSettingsCard {
    name = "categoryColors";
    displayName = "Category colors";
    slices: FormattingSettingsSlice[] = [];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    grid = new GridCard();
    bands = new BandsCard();
    appetite = new AppetiteCard();
    markers = new MarkersCard();
    categoryColors = new CategoryColorsCard();
    movement = new MovementCard();
    detail = new DetailCard();
    axes = new AxesCard();
    legend = new LegendCard();

    cards = [this.grid, this.bands, this.appetite, this.markers, this.categoryColors, this.movement, this.detail, this.axes, this.legend];
}
