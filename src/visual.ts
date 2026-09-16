"use strict";

import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";

import { FormattingSettingsService, formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;

import { VisualFormattingSettingsModel } from "./settings";

// ------------------------------------------------------------------------------------------
// Licensing
// ------------------------------------------------------------------------------------------

/**
 * Plan ID de Partner Center. Service ID verificado el 2026-09-16:
 * tino_callarisa.risk-matrix-pro.risk-matrix-pro-tcviz (editor.oferta.plan).
 */
const PLAN_ID = "risk-matrix-pro-tcviz";

/** ServicePlanState es un const enum: en runtime hacen falta los numeros. */
const STATE_ACTIVE = 1;
const STATE_WARNING = 2;

// spIdentifier = Service ID completo (editor.oferta.plan); se acepta también el Plan ID solo
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}

// La API de licencias exige localizar el texto del aviso (maximo 500 caracteres).
const ES_LABELS: Record<string, string> = {
    "movement arrows": "las flechas de movimiento",
    "custom score thresholds": "los umbrales personalizados",
    "the risk appetite line": "la línea de apetito de riesgo",
    "conditional marker colors": "los colores condicionales de marcador",
    "category shapes": "las formas por categoría",
    "the cell detail panel": "el panel de detalle de celda",
    "target tracking": "el seguimiento del objetivo"
};

// ------------------------------------------------------------------------------------------
// Model
// ------------------------------------------------------------------------------------------

type Band = 0 | 1 | 2 | 3;
const BAND_NAMES = ["Low", "Medium", "High", "Critical"];
type Shape = "circle" | "square" | "diamond" | "triangle";
const SHAPES: Shape[] = ["circle", "square", "diamond", "triangle"];

interface RiskPoint {
    key: string;
    index: number;
    name: string;
    category: string | null;
    categoryIndex: number;
    selectionId: ISelectionId;
    likelihood: number;
    impact: number;
    level: { x: number; y: number };
    residual: { likelihood: number; impact: number; x: number; y: number } | null;
    target: { likelihood: number; impact: number; x: number; y: number } | null;
    /** Tiene objetivo y la posición actual (residual, o inherente si no hay) puntúa por encima */
    offTarget: boolean;
    /** Posición donde se dibuja el marcador (inherente, residual u objetivo) */
    plotted: { x: number; y: number };
    color: string;
    ruleColor: string | null;
    shape: Shape;
    highlighted: boolean;
    tooltipExtras: { name: string; value: string }[];
    // layout
    px: number;
    py: number;
    size: number;
    hidden: boolean;
}

interface CategoryInfo {
    name: string;
    firstIndex: number;
    color: string;
    shape: Shape;
}

interface ParsedData {
    risks: RiskPoint[];
    categories: CategoryInfo[];
    categoryColumn: DataViewCategoryColumn | null;
    hasResidual: boolean;
    hasTarget: boolean;
    /** Campos de movimiento puestos sin su pareja (p. ej. Residual likelihood sin Residual impact) */
    incompletePairs: string[];
    hasHighlights: boolean;
    /** Filas sin probabilidad o impacto, que no se pueden colocar */
    skipped: number;
    /** Riesgos con algún valor fuera de la escala, colocados en el borde */
    clamped: number;
    likelihoodColumn: DataViewValueColumn;
    impactColumn: DataViewValueColumn;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k of Object.keys(attrs)) { el.setAttribute(k, String(attrs[k])); }
    return el;
}

function clearElement(el: Element): void {
    while (el.firstChild) { el.removeChild(el.firstChild); }
}

function toNumber(v: powerbi.PrimitiveValue): number | null {
    if (v === null || v === undefined || v === "") { return null; }
    const n = typeof v === "number" ? v : Number(v);
    return isFinite(n) ? n : null;
}

function hasRole(col: { source: powerbi.DataViewMetadataColumn }, role: string): boolean {
    return !!(col.source.roles && col.source.roles[role]);
}

/** Solo colores hex o rgb(): lo que llega de reglas o del panel no entra sin validar en el DOM. */
function safeColor(c: unknown, fallback: string): string {
    if (typeof c !== "string") { return fallback; }
    const s = c.trim();
    return /^#[0-9a-f]{3,8}$/i.test(s) || /^rgba?\([\d\s.,%]+\)$/i.test(s) ? s : fallback;
}

function safeFont(f: unknown): string {
    const s = typeof f === "string" ? f.replace(/[^\w\s,'"-]/g, "") : "";
    return s || "Segoe UI";
}

// ------------------------------------------------------------------------------------------
// Visual
// ------------------------------------------------------------------------------------------

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettingsService: FormattingSettingsService;
    private settings: VisualFormattingSettingsModel;

    private target: HTMLElement;
    private legendEl: HTMLElement;
    private bodyEl: HTMLElement;
    private svgEl: SVGSVGElement;
    private messageEl: HTMLElement;
    private warningEl: HTMLElement;
    private panelEl: HTMLElement;
    private watermarkEl: HTMLElement;
    private readonly uid = "rmp" + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

    private data: ParsedData | null = null;
    private selectedKeys = new Set<string>();
    private focusedKey: string | null = null;
    /** Riesgo bajo el ratón o con el foco del teclado: su recorrido se muestra en modo "focus" */
    private activeKey: string | null = null;
    private openCell: { x: number; y: number } | null = null;
    private gridSize = 5;

    // High contrast
    private isHighContrast = false;
    private hcForeground = "#000000";
    private hcBackground = "#FFFFFF";
    private hcSelected = "#000000";

    // Licensing. isPro es un inicializador a proposito: el constructor nunca debe resetearlo,
    // o la build de test parcheada (que lo pone a true) se sobrescribiria.
    private licenseManager: IVisualLicenseManager;
    private isPro = false;
    private licenseRequested = false;
    private licenseResolved = false;
    private licenseEnvUnsupported = false;
    private noticeShown = false;
    /** Funciones Pro de las que ya se ha avisado en esta sesión de edición */
    private notifiedPro: string[] = [];
    /** Temporizador que deja la barra de Upgrade cuando termina el banner */
    private licenseIconTimer: number | null = null;
    private attemptedPro: string[] = [];
    private lastOptions: VisualUpdateOptions = null;
    private lastDataView: powerbi.DataView = null;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.licenseManager = options.host.licenseManager;

        this.target = options.element;
        this.target.classList.add("rmp-root");
        this.target.style.position = "relative";

        this.legendEl = document.createElement("div");
        this.legendEl.className = "rmp-legend";
        this.legendEl.setAttribute("role", "list");
        this.target.appendChild(this.legendEl);

        this.bodyEl = document.createElement("div");
        this.bodyEl.className = "rmp-body";
        this.target.appendChild(this.bodyEl);

        this.svgEl = svg("svg", { class: "rmp-svg", role: "application" });
        this.svgEl.setAttribute("aria-roledescription", "risk matrix");
        this.bodyEl.appendChild(this.svgEl);

        this.warningEl = document.createElement("div");
        this.warningEl.className = "rmp-warning";
        this.warningEl.setAttribute("role", "status");
        this.warningEl.style.display = "none";
        this.bodyEl.appendChild(this.warningEl);

        this.messageEl = document.createElement("div");
        this.messageEl.className = "rmp-message";
        this.bodyEl.appendChild(this.messageEl);

        this.panelEl = document.createElement("aside");
        this.panelEl.className = "rmp-panel";
        this.panelEl.style.display = "none";
        this.bodyEl.appendChild(this.panelEl);

        // Marca de agua de la vista previa Pro: solo sobre funciones de pago usadas sin licencia
        this.watermarkEl = document.createElement("div");
        this.watermarkEl.setAttribute("aria-hidden", "true");
        this.watermarkEl.textContent = "Pro preview";
        this.watermarkEl.style.cssText =
            "position:absolute;left:0;top:0;right:0;bottom:0;display:none;align-items:center;" +
            "justify-content:center;pointer-events:none;z-index:5;font:700 32px 'Segoe UI',sans-serif;" +
            "color:#FFFFFF;opacity:0.55;transform:rotate(-20deg);" +
            "text-shadow:0 0 2px rgba(51,51,51,0.85),0 1px 3px rgba(51,51,51,0.65);";
        this.target.appendChild(this.watermarkEl);

        // Clic en vacío limpia la selección; menú contextual a nivel de visual
        this.svgEl.addEventListener("click", (ev: MouseEvent) => {
            if (ev.target === this.svgEl) { this.clearSelection(); }
        });
        this.target.addEventListener("contextmenu", (ev: MouseEvent) => {
            ev.preventDefault();
            const el = (ev.target as Element).closest?.("[data-key]");
            const risk = el ? this.findRisk(el.getAttribute("data-key")) : null;
            this.selectionManager.showContextMenu(risk ? risk.selectionId : {}, { x: ev.clientX, y: ev.clientY });
        });
        this.svgEl.addEventListener("keydown", (ev: KeyboardEvent) => this.onKeyDown(ev));

        // Bookmarks: Power BI restaura la selección llamando aquí
        const sm = this.selectionManager as any;
        if (typeof sm.registerOnSelectCallback === "function") {
            sm.registerOnSelectCallback((ids: ISelectionId[]) => {
                this.selectedKeys = new Set((ids || []).map(id => id.getKey()));
                this.applySelectionStyles();
            });
        }
    }

    // ==========================================================================================
    // Update
    // ==========================================================================================

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        this.lastOptions = options;
        try {
            this.renderFromDataView(options.dataViews && options.dataViews[0]);
            this.events.renderingFinished(options);
        } catch (error) {
            console.error("Risk Matrix Pro: render error", error);
            this.events.renderingFailed(options, String(error));
        }
        // Fuera del try: un fallo de licencia nunca convierte un render correcto en renderingFailed.
        this.requestLicenseDeferred();
        this.syncLicenseNotification();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        const s = this.settings || new VisualFormattingSettingsModel();
        const cc = s.categoryColors;
        cc.slices = [];
        const col = this.data?.categoryColumn;
        if (col && this.data) {
            for (const c of this.data.categories) {
                cc.slices.push(new formattingSettings.ColorPicker({
                    name: "fill",
                    displayName: c.name,
                    value: { value: c.color },
                    selector: this.host.createSelectionIdBuilder().withCategory(col, c.firstIndex).createSelectionId().getSelector()
                }));
            }
        }
        cc.visible = cc.slices.length > 0;
        return this.formattingSettingsService.buildFormattingModel(s);
    }

    private renderFromDataView(dataView: powerbi.DataView): void {
        this.lastDataView = dataView;
        this.readHighContrast();
        this.settings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);
        const cat = dataView && dataView.categorical;
        const riskCol = cat?.categories?.find(c => hasRole(c, "risk"));
        const values = (cat?.values || []) as unknown as DataViewValueColumn[];
        this.gridSize = this.resolveGridSize(values);
        const lCol = values.find(v => hasRole(v, "likelihood"));
        const iCol = values.find(v => hasRole(v, "impact"));

        if (!riskCol || !lCol || !iCol) {
            this.data = null;
            this.attemptedPro = [];
            this.updateWatermark();
            this.renderLanding(!!riskCol, !!lCol, !!iCol);
            return;
        }

        this.data = this.parse(dataView, riskCol, lCol, iCol, values);
        this.attemptedPro = this.isPro ? [] : this.collectAttempted(this.data, dataView);
        this.updateWatermark();

        // La selección de Power BI sobrevive a los re-renders
        this.selectedKeys = new Set(this.selectionManager.getSelectionIds().map((id: ISelectionId) => id.getKey()));
        this.render();
    }

    // ==========================================================================================
    // Parsing
    // ==========================================================================================

    private parse(dataView: powerbi.DataView, riskCol: DataViewCategoryColumn, lCol: DataViewValueColumn,
        iCol: DataViewValueColumn, values: DataViewValueColumn[]): ParsedData {
        const pro = this.isProActive();
        const s = this.settings;
        const N = this.gridSize;
        const categoryColumn = dataView.categorical.categories.find(c => hasRole(c, "category")) || null;
        const rlCol = values.find(v => hasRole(v, "residualLikelihood"));
        const riCol = values.find(v => hasRole(v, "residualImpact"));
        const tlCol = values.find(v => hasRole(v, "targetLikelihood"));
        const tiCol = values.find(v => hasRole(v, "targetImpact"));
        const hasTarget = !!(tlCol && tiCol);
        const incompletePairs: string[] = [];
        if (!!rlCol !== !!riCol) { incompletePairs.push(rlCol ? "Residual impact" : "Residual likelihood"); }
        if (!!tlCol !== !!tiCol) { incompletePairs.push(tlCol ? "Target impact" : "Target likelihood"); }
        const tipCols = values.filter(v => hasRole(v, "tooltips"));
        const hasResidual = !!(rlCol && riCol);
        const hasHighlights = !!(lCol.highlights || iCol.highlights);

        const scale = String(s.grid.inputScale.value.value);
        let clampedNow = false;
        const onClamp = () => { clampedNow = true; };
        const toLevelL = this.levelMapper(lCol.values.concat(rlCol ? rlCol.values : [], tlCol ? tlCol.values : []), scale, N, onClamp);
        const toLevelI = this.levelMapper(iCol.values.concat(riCol ? riCol.values : [], tiCol ? tiCol.values : []), scale, N, onClamp);
        let skipped = 0;
        let clamped = 0;

        const plotAt = pro ? String(s.movement.plotAt.value.value) : "inherent";
        const useRuleColors = pro;
        const shapeByCat = pro && s.markers.shapeByCategory.value;
        const constantFill = safeColor(s.markers.fill.value?.value, "#3D3929");

        // Categorías: color de paleta, sobrescrito por el panel
        const categories: CategoryInfo[] = [];
        const catIndex = new Map<string, number>();
        if (categoryColumn) {
            categoryColumn.values.forEach((v, i) => {
                const name = v === null || v === undefined ? "(Blank)" : String(v);
                if (catIndex.has(name)) { return; }
                const custom = (categoryColumn.objects?.[i] as any)?.categoryColors?.fill?.solid?.color;
                const idx = categories.length;
                catIndex.set(name, idx);
                categories.push({
                    name,
                    firstIndex: i,
                    color: safeColor(custom, this.host.colorPalette.getColor(name).value),
                    shape: shapeByCat ? SHAPES[idx % SHAPES.length] : "circle"
                });
            });
        }

        const risks: RiskPoint[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < riskCol.values.length; i++) {
            const l = toNumber(lCol.values[i]);
            const im = toNumber(iCol.values[i]);
            if (l === null || im === null) {
                if (riskCol.values[i] !== null && riskCol.values[i] !== undefined) { skipped++; }
                continue;
            }
            clampedNow = false;

            const builder = this.host.createSelectionIdBuilder().withCategory(riskCol, i);
            if (categoryColumn) { builder.withCategory(categoryColumn, i); }
            const selectionId = builder.createSelectionId();
            const key = selectionId.getKey();
            if (seen.has(key)) { continue; }
            seen.add(key);

            const name = riskCol.values[i] === null || riskCol.values[i] === undefined ? "(Blank)" : String(riskCol.values[i]);
            const catName = categoryColumn ? (categoryColumn.values[i] === null || categoryColumn.values[i] === undefined ? "(Blank)" : String(categoryColumn.values[i])) : null;
            const ci = catName !== null ? catIndex.get(catName) : -1;

            let residual: RiskPoint["residual"] = null;
            if (hasResidual) {
                const rl = toNumber(rlCol.values[i]);
                const ri = toNumber(riCol.values[i]);
                if (rl !== null && ri !== null) {
                    residual = { likelihood: rl, impact: ri, x: toLevelL(rl), y: toLevelI(ri) };
                }
            }
            let target: RiskPoint["target"] = null;
            if (hasTarget) {
                const tl = toNumber(tlCol.values[i]);
                const ti = toNumber(tiCol.values[i]);
                if (tl !== null && ti !== null) {
                    target = { likelihood: tl, impact: ti, x: toLevelL(tl), y: toLevelI(ti) };
                }
            }
            const level = { x: toLevelL(l), y: toLevelI(im) };
            if (clampedNow) { clamped++; }
            const plotted = plotAt === "residual" && residual ? { x: residual.x, y: residual.y }
                : plotAt === "target" && target ? { x: target.x, y: target.y }
                    : level;
            const current = residual || level;
            const offTarget = !!target && current.x * current.y > target.x * target.y;

            const rule = (riskCol.objects?.[i] as any)?.markers?.fill?.solid?.color
                ?? (categoryColumn?.objects?.[i] as any)?.markers?.fill?.solid?.color;
            const ruleColor = typeof rule === "string" ? safeColor(rule, null) : null;
            const baseColor = ci >= 0 ? categories[ci].color : constantFill;

            const highlighted = !hasHighlights ||
                (lCol.highlights ? lCol.highlights[i] !== null && lCol.highlights[i] !== undefined : true);

            risks.push({
                key, index: i, name, category: catName, categoryIndex: ci, selectionId,
                likelihood: l, impact: im, level, residual, target, offTarget, plotted,
                color: useRuleColors && ruleColor && ruleColor.toLowerCase() !== constantFill.toLowerCase() ? ruleColor : baseColor,
                ruleColor,
                shape: ci >= 0 ? categories[ci].shape : "circle",
                highlighted,
                tooltipExtras: tipCols.map(tc => ({
                    name: tc.source.displayName,
                    value: valueFormatter.format(tc.values[i], valueFormatter.getFormatStringByColumn(tc.source as any))
                })),
                px: 0, py: 0, size: 0, hidden: false
            });
        }

        return { risks, categories, categoryColumn, hasResidual, hasTarget, incompletePairs, hasHighlights, likelihoodColumn: lCol, impactColumn: iCol, skipped, clamped };
    }

    /**
     * Tamaño de rejilla. En "auto", si las posiciones son niveles enteros (1, 2, 3...) la rejilla
     * mide lo que el valor más alto, entre 3 y 10; con fracciones o porcentajes, 5x5.
     */
    private resolveGridSize(values: DataViewValueColumn[]): number {
        const chosen = String(this.settings.grid.size.value.value);
        if (chosen !== "auto") {
            return Math.max(3, Math.min(10, parseInt(chosen, 10) || 5));
        }
        const roles = ["likelihood", "impact", "residualLikelihood", "residualImpact", "targetLikelihood", "targetImpact"];
        const nums: number[] = [];
        for (const col of values) {
            if (!roles.some(r => hasRole(col, r))) { continue; }
            for (const v of col.values) {
                const n = toNumber(v);
                if (n !== null) { nums.push(n); }
            }
        }
        const scale = String(this.settings.grid.inputScale.value.value);
        const areLevels = scale === "levels" ||
            (scale === "auto" && nums.length > 0 && nums.every(n => Number.isInteger(n) && n >= 1 && n <= 10));
        if (!areLevels || nums.length === 0) { return 5; }
        return Math.max(3, Math.min(10, Math.round(Math.max(...nums))));
    }

    /** Convierte un valor de entrada a nivel 1..N según la escala elegida (o detectada). */
    private levelMapper(all: powerbi.PrimitiveValue[], scale: string, N: number, onClamp: () => void): (v: number) => number {
        let mode = scale;
        const nums = all.map(toNumber).filter(v => v !== null);
        const max = nums.length ? Math.max(...nums) : N;
        if (mode === "auto") {
            if (nums.every(v => Number.isInteger(v) && v >= 1 && v <= N)) { mode = "levels"; }
            else if (max <= 1) { mode = "fraction"; }
            else if (max <= 100) { mode = "percent"; }
            else { mode = "relative"; }
        }
        // Un valor fuera de la escala se coloca en el borde y se avisa: nunca desaparece en silencio
        const clamp = (n: number, outOfRange: boolean) => {
            if (outOfRange || n < 1 || n > N) { onClamp(); }
            return Math.max(1, Math.min(N, n));
        };
        switch (mode) {
            case "fraction": return v => clamp(Math.ceil(v * N), v < 0 || v > 1);
            case "percent": return v => clamp(Math.ceil(v / 100 * N), v < 0 || v > 100);
            case "relative": return v => clamp(Math.ceil(v / max * N), v < 0);
            default: return v => clamp(Math.round(v), !Number.isInteger(v));
        }
    }

    /** Lo que el usuario ha pedido y el tier gratuito no da: alimenta el aviso y la marca. */
    private collectAttempted(d: ParsedData, dataView: powerbi.DataView): string[] {
        const s = this.settings;
        const out: string[] = [];
        const movementFields = d.hasResidual || d.hasTarget || d.incompletePairs.length > 0;
        if (movementFields && (String(s.movement.arrows.value.value) !== "off" || String(s.movement.plotAt.value.value) !== "inherent")) {
            out.push("movement arrows");
        }
        if (d.hasTarget && s.movement.flagOffTarget.value) { out.push("target tracking"); }
        if (s.bands.customThresholds.value) { out.push("custom score thresholds"); }
        if (s.appetite.show.value) { out.push("the risk appetite line"); }
        const constant = safeColor(s.markers.fill.value?.value, "#3D3929").toLowerCase();
        if (d.risks.some(r => r.ruleColor && r.ruleColor.toLowerCase() !== constant)) { out.push("conditional marker colors"); }
        if (s.markers.shapeByCategory.value && d.categories.length > 0) { out.push("category shapes"); }
        if (s.detail.show.value) { out.push("the cell detail panel"); }
        void dataView;
        return out;
    }

    // ==========================================================================================
    // Scoring
    // ==========================================================================================

    private bandOf(x: number, y: number): Band {
        const score = x * y;
        const s = this.settings.bands;
        if (this.isProActive() && s.customThresholds.value) {
            if (score >= s.criticalFrom.value) { return 3; }
            if (score >= s.highFrom.value) { return 2; }
            if (score >= s.mediumFrom.value) { return 1; }
            return 0;
        }
        // Proporción de la puntuación máxima; en 5x5 reproduce 1-4 / 5-9 / 10-16 / 20-25
        const r = score / (this.gridSize * this.gridSize);
        if (r > 16 / 25) { return 3; }
        if (r > 9 / 25) { return 2; }
        if (r > 4 / 25) { return 1; }
        return 0;
    }

    private bandColor(b: Band): string {
        const s = this.settings.bands;
        const c = [s.lowColor, s.mediumColor, s.highColor, s.criticalColor][b].value?.value;
        return safeColor(c, ["#8BC48A", "#F2D16B", "#F29E5C", "#E0605A"][b]);
    }

    // ==========================================================================================
    // Rendering
    // ==========================================================================================

    private renderLanding(hasRisk: boolean, hasL: boolean, hasI: boolean): void {
        clearElement(this.svgEl);
        clearElement(this.legendEl);
        this.legendEl.style.display = "none";
        this.warningEl.style.display = "none";
        this.closePanel();
        const missing = [!hasRisk && "Risk", !hasL && "Likelihood", !hasI && "Impact"].filter(Boolean);
        clearElement(this.messageEl);
        const h = document.createElement("div");
        h.className = "rmp-message-title";
        h.textContent = "Risk Matrix Pro";
        const p = document.createElement("div");
        p.textContent = "Add " + missing.join(", ") + " to plot each risk by likelihood and impact.";
        const p2 = document.createElement("div");
        p2.className = "rmp-message-hint";
        p2.textContent = "Values can be levels (1–5), fractions (0–1) or percentages (0–100).";
        this.messageEl.append(h, p, p2);
        this.messageEl.style.display = "flex";
        this.svgEl.style.display = "none";
    }

    private render(): void {
        const d = this.data;
        const s = this.settings;
        const pro = this.isProActive();
        const N = this.gridSize;
        this.messageEl.style.display = "none";
        this.svgEl.style.display = "block";

        this.renderLegend(d);
        this.renderWarning(d);

        const width = Math.max(0, this.bodyEl.clientWidth || this.lastOptions?.viewport.width || 0);
        const height = Math.max(0, this.bodyEl.clientHeight || this.lastOptions?.viewport.height || 0);
        this.svgEl.setAttribute("width", String(width));
        this.svgEl.setAttribute("height", String(height));

        // Swat atómico: se construye todo fuera del DOM y se sustituye al final
        const root = svg("g");
        const defs = svg("defs");
        const arrowId = this.uid + "-arrow";
        const marker = svg("marker", { id: arrowId, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
        const arrowColor = this.isHighContrast ? this.hcForeground : safeColor(s.movement.color.value?.value, "#535146");
        marker.appendChild(svg("path", { d: "M0,0 L10,5 L0,10 z", fill: arrowColor }));
        defs.appendChild(marker);
        root.appendChild(defs);

        // ---- Márgenes ------------------------------------------------------------------------
        const ax = s.axes;
        const fs = Math.max(8, Math.min(24, ax.fontSize.value || 11));
        const font = safeFont(ax.fontFamily.value);
        const axisColor = this.isHighContrast ? this.hcForeground : safeColor(ax.color.value?.value, "#535146");
        const xLabels = this.levelLabels(ax.xLabels.value, N);
        const yLabels = this.levelLabels(ax.yLabels.value, N);
        const maxYLabel = Math.max(...yLabels.map(l => l.length));
        const yLabelW = Math.min(width * 0.25, maxYLabel * fs * 0.6 + 8);
        const padL = (ax.yTitle.value ? fs * 1.6 : 0) + yLabelW + 4;
        const padB = (ax.xTitle.value ? fs * 1.8 : 0) + fs * 1.6 + 4;
        const padT = 6;
        const padR = 8;
        const plotW = Math.max(0, width - padL - padR);
        const plotH = Math.max(0, height - padT - padB);
        const cw = plotW / N;
        const ch = plotH / N;
        const gap = Math.min(s.grid.cellGap.value, cw / 4, ch / 4);
        const cellX = (x: number) => padL + (x - 1) * cw;
        const cellY = (y: number) => padT + (N - y) * ch;

        if (plotW < 30 || plotH < 30) {
            clearElement(this.svgEl);
            return;
        }

        // ---- Celdas --------------------------------------------------------------------------
        const counts = new Map<string, RiskPoint[]>();
        for (const r of d.risks) {
            const k = r.plotted.x + "," + r.plotted.y;
            if (!counts.has(k)) { counts.set(k, []); }
            counts.get(k).push(r);
        }
        const cellsG = svg("g", { class: "rmp-cells" });
        for (let y = 1; y <= N; y++) {
            for (let x = 1; x <= N; x++) {
                const band = this.bandOf(x, y);
                const rect = svg("rect", {
                    x: cellX(x) + gap / 2, y: cellY(y) + gap / 2,
                    width: Math.max(0, cw - gap), height: Math.max(0, ch - gap),
                    rx: s.grid.cellRadius.value, class: "rmp-cell"
                });
                if (this.isHighContrast) {
                    // En alto contraste el significado no puede ir en el relleno: grosor de borde por banda
                    rect.setAttribute("fill", this.hcBackground);
                    rect.setAttribute("stroke", this.hcForeground);
                    rect.setAttribute("stroke-width", String(band + 1));
                } else {
                    rect.setAttribute("fill", this.bandColor(band));
                }
                const inCell = counts.get(x + "," + y) || [];
                rect.addEventListener("click", (ev: MouseEvent) => this.onCellClick(x, y, inCell, ev));
                const title = svg("title");
                title.textContent = `Likelihood ${xLabels[x - 1]}, impact ${yLabels[y - 1]}: score ${x * y} (${BAND_NAMES[band]}), ${inCell.length} risk${inCell.length === 1 ? "" : "s"}`;
                rect.appendChild(title);
                cellsG.appendChild(rect);

                const textColor = this.isHighContrast ? this.hcForeground : safeColor(s.grid.textColor.value?.value, "#5C5847");
                if (s.grid.showScore.value) {
                    const t = svg("text", { x: cellX(x) + gap / 2 + 4, y: cellY(y) + gap / 2 + fs, class: "rmp-cell-text", fill: textColor, "font-size": fs * 0.9, "font-family": font });
                    t.textContent = String(x * y);
                    cellsG.appendChild(t);
                }
                if (s.grid.showCount.value && inCell.length > 0) {
                    const t = svg("text", { x: cellX(x) + cw - gap / 2 - 4, y: cellY(y) + gap / 2 + fs, "text-anchor": "end", class: "rmp-cell-text", fill: textColor, "font-size": fs * 0.9, "font-weight": 600, "font-family": font });
                    t.textContent = String(inCell.length);
                    cellsG.appendChild(t);
                }
            }
        }
        root.appendChild(cellsG);

        // ---- Apetito de riesgo (Pro) ---------------------------------------------------------
        if (pro && s.appetite.show.value) {
            const lim = s.appetite.score.value;
            const inside = (x: number, y: number) => x * y <= lim;
            const parts: string[] = [];
            for (let y = 1; y <= N; y++) {
                for (let x = 1; x <= N; x++) {
                    if (!inside(x, y)) { continue; }
                    if (x < N && !inside(x + 1, y)) { parts.push(`M${cellX(x + 1)},${cellY(y)}V${cellY(y) + ch}`); }
                    if (y < N && !inside(x, y + 1)) { parts.push(`M${cellX(x)},${cellY(y)}H${cellX(x) + cw}`); }
                }
            }
            if (parts.length) {
                root.appendChild(svg("path", {
                    d: parts.join(""), fill: "none", "stroke-linecap": "round", class: "rmp-appetite",
                    stroke: this.isHighContrast ? this.hcForeground : safeColor(s.appetite.color.value?.value, "#252423"),
                    "stroke-width": Math.max(1, Math.min(8, s.appetite.width.value)),
                    "stroke-dasharray": this.isHighContrast ? "6 3" : ""
                }));
            }
        }

        // ---- Ejes ----------------------------------------------------------------------------
        const axesG = svg("g", { class: "rmp-axes", "font-family": font, "font-size": fs, fill: axisColor, "aria-hidden": "true" });
        const maxXChars = Math.max(3, Math.floor(cw / (fs * 0.6)));
        for (let i = 1; i <= N; i++) {
            const tx = svg("text", { x: cellX(i) + cw / 2, y: padT + plotH + fs * 1.3, "text-anchor": "middle" });
            tx.textContent = this.truncate(xLabels[i - 1], maxXChars);
            axesG.appendChild(tx);
            const ty = svg("text", { x: padL - 6, y: cellY(i) + ch / 2, "text-anchor": "end", "dominant-baseline": "middle" });
            ty.textContent = this.truncate(yLabels[i - 1], Math.max(3, Math.floor((yLabelW - 8) / (fs * 0.6))));
            axesG.appendChild(ty);
        }
        if (ax.xTitle.value) {
            const t = svg("text", { x: padL + plotW / 2, y: height - 4, "text-anchor": "middle", "font-weight": 600 });
            t.textContent = ax.xTitle.value;
            axesG.appendChild(t);
        }
        if (ax.yTitle.value) {
            const cx = fs;
            const cy = padT + plotH / 2;
            const t = svg("text", { x: cx, y: cy, "text-anchor": "middle", "font-weight": 600, transform: `rotate(-90 ${cx} ${cy})` });
            t.textContent = ax.yTitle.value;
            axesG.appendChild(t);
        }
        root.appendChild(axesG);

        // ---- Colocación de marcadores --------------------------------------------------------
        const baseSize = Math.max(8, Math.min(60, s.markers.size.value));
        const overflowG = svg("g", { class: "rmp-overflow" });
        counts.forEach((list, k) => {
            const [x, y] = k.split(",").map(Number);
            const innerW = cw - gap - 6;
            const innerH = ch - gap - 6 - (s.grid.showScore.value || s.grid.showCount.value ? fs : 0);
            const top = cellY(y) + gap / 2 + 3 + (s.grid.showScore.value || s.grid.showCount.value ? fs : 0);
            const left = cellX(x) + gap / 2 + 3;
            let size = baseSize;
            let cols = 1, rows = 1;
            // Encoge hasta 8px; si aun así no caben, se muestran los que caben y un "+n"
            for (; ;) {
                cols = Math.max(1, Math.floor(innerW / (size + 3)));
                rows = Math.max(1, Math.floor(innerH / (size + 3)));
                if (cols * rows >= list.length || size <= 8) { break; }
                size = Math.max(8, size - 2);
            }
            const capacity = cols * rows;
            const overflow = list.length > capacity ? list.length - capacity + 1 : 0;
            const shown = overflow ? capacity - 1 : list.length;
            const usedCols = Math.min(cols, Math.max(1, shown + (overflow ? 1 : 0)));
            const usedRows = Math.ceil((shown + (overflow ? 1 : 0)) / usedCols);
            const offX = left + (innerW - usedCols * (size + 3)) / 2 + (size + 3) / 2;
            const offY = top + (innerH - usedRows * (size + 3)) / 2 + (size + 3) / 2;
            list.forEach((r, i) => {
                r.size = size;
                r.hidden = i >= shown;
                const slot = r.hidden ? shown : i;
                r.px = offX + (slot % usedCols) * (size + 3);
                r.py = offY + Math.floor(slot / usedCols) * (size + 3);
            });
            if (overflow) {
                const slot = shown;
                const bx = offX + (slot % usedCols) * (size + 3);
                const by = offY + Math.floor(slot / usedCols) * (size + 3);
                const g = svg("g", { class: "rmp-more" });
                g.appendChild(svg("circle", { cx: bx, cy: by, r: size / 2, fill: this.isHighContrast ? this.hcBackground : "#FFFFFF", stroke: this.isHighContrast ? this.hcForeground : "#83827D", "stroke-width": 1 }));
                const t = svg("text", { x: bx, y: by, "text-anchor": "middle", "dominant-baseline": "central", "font-size": Math.max(7, size * 0.4), "font-family": font, fill: this.isHighContrast ? this.hcForeground : "#3D3929" });
                t.textContent = "+" + overflow;
                g.appendChild(t);
                const title = svg("title");
                title.textContent = `${overflow} more risk${overflow === 1 ? "" : "s"} in this cell`;
                g.appendChild(title);
                g.addEventListener("click", (ev: MouseEvent) => this.onCellClick(x, y, list, ev));
                overflowG.appendChild(g);
            }
        });

        // ---- Movimiento (Pro): inherente → residual → objetivo ------------------------------
        if (pro && (d.hasResidual || d.hasTarget) && String(s.movement.arrows.value.value) !== "off") {
            const plotAtKind = String(s.movement.plotAt.value.value);
            const moveG = svg("g", { class: "rmp-movement", "aria-hidden": "true" });
            for (const r of d.risks) {
                if (r.hidden || (!r.residual && !r.target)) { continue; }
                // Un grupo por riesgo: en modo "focus" solo se ve el del riesgo activo o seleccionado
                const rg = svg("g", { "data-move-group": r.key });
                moveG.appendChild(rg);
                const stages: { kind: string; x: number; y: number }[] = [{ kind: "inherent", x: r.level.x, y: r.level.y }];
                if (r.residual) { stages.push({ kind: "residual", x: r.residual.x, y: r.residual.y }); }
                if (r.target) { stages.push({ kind: "target", x: r.target.x, y: r.target.y }); }
                // El marcador está en una etapa; las demás se pintan en el centro de su celda,
                // desplazadas un poco por riesgo y etapa para que no se solapen
                let plottedIdx = stages.findIndex(st => st.kind === plotAtKind);
                if (plottedIdx < 0) { plottedIdx = 0; }
                const pts = stages.map((st, j) => {
                    if (j === plottedIdx) { return { x: r.px, y: r.py, trim: r.size / 2 + 2, isMarker: true }; }
                    const jitter = (((r.index + j * 3) * 7919) % 11 - 5) / 5;
                    return { x: cellX(st.x) + cw / 2 + jitter * cw * 0.2, y: cellY(st.y) + ch / 2 + jitter * ch * 0.2, trim: 4, isMarker: false };
                });
                const opacity = d.hasHighlights && !r.highlighted ? 0.2 : 0.85;
                for (let j = 0; j < stages.length - 1; j++) {
                    const from = pts[j], to = pts[j + 1];
                    const dx = to.x - from.x, dy = to.y - from.y;
                    const len = Math.hypot(dx, dy) || 1;
                    if (len <= from.trim + to.trim + 4) { continue; }
                    // El tramo hacia el objetivo es lo que falta por hacer: discontinuo
                    const toTarget = stages[j + 1].kind === "target";
                    rg.appendChild(svg("line", {
                        x1: from.x + dx / len * from.trim, y1: from.y + dy / len * from.trim,
                        x2: to.x - dx / len * to.trim, y2: to.y - dy / len * to.trim,
                        stroke: arrowColor, "stroke-width": 1.5, "marker-end": `url(#${arrowId})`,
                        "stroke-dasharray": toTarget ? "4 3" : "", opacity, "data-move": r.key
                    }));
                }
                stages.forEach((st, j) => {
                    const p = pts[j];
                    if (p.isMarker) { return; }
                    if (st.kind === "target") {
                        rg.appendChild(svg("rect", {
                            x: p.x - 3.5, y: p.y - 3.5, width: 7, height: 7, fill: "none", stroke: arrowColor, "stroke-width": 1.2,
                            transform: `rotate(45 ${p.x} ${p.y})`, opacity, "data-move": r.key
                        }));
                    } else {
                        rg.appendChild(svg("circle", { cx: p.x, cy: p.y, r: 3, fill: "none", stroke: arrowColor, "stroke-width": 1.2, opacity, "data-move": r.key }));
                    }
                });
            }
            root.appendChild(moveG);
        }

        // ---- Marcadores ----------------------------------------------------------------------
        const markersG = svg("g", { class: "rmp-markers", role: "list" });
        const labelColor = this.isHighContrast ? this.hcBackground : safeColor(s.markers.labelColor.value?.value, "#FFFFFF");
        const maxChars = Math.max(1, Math.min(12, s.markers.labelMaxChars.value));
        for (const r of d.risks) {
            if (r.hidden) { continue; }
            const g = svg("g", { class: "rmp-marker", "data-key": r.key, tabindex: -1, role: "listitem" });
            g.setAttribute("aria-label", this.describe(r));
            const fill = this.isHighContrast ? this.hcForeground : r.color;
            if (pro && r.offTarget && s.movement.flagOffTarget.value) {
                g.appendChild(svg("circle", {
                    cx: r.px, cy: r.py, r: r.size / 2 + 3, fill: "none", class: "rmp-offtarget",
                    stroke: this.isHighContrast ? this.hcForeground : safeColor(s.movement.offTargetColor.value?.value, "#C00000"),
                    "stroke-width": 2, "stroke-dasharray": "3 2"
                }));
            }
            g.appendChild(this.shapeElement(r.shape, r.px, r.py, r.size, fill));
            if (s.markers.showLabels.value && r.size >= 14) {
                // El texto tiene que caber dentro del marcador: se reduce la letra y, si no basta, los caracteres
                const text = this.truncate(r.name, maxChars, "");
                const inner = r.size * 0.82;
                let lfs = Math.max(7, r.size * 0.4);
                if (text.length * lfs * 0.6 > inner) { lfs = Math.max(7, inner / (text.length * 0.6)); }
                const fits = Math.max(1, Math.floor(inner / (lfs * 0.6)));
                const t = svg("text", {
                    x: r.px, y: r.py, "text-anchor": "middle", "dominant-baseline": "central",
                    "font-size": lfs, "font-family": font, "font-weight": 600,
                    fill: labelColor, "pointer-events": "none"
                });
                t.textContent = text.slice(0, fits);
                g.appendChild(t);
            }
            g.addEventListener("click", (ev: MouseEvent) => { ev.stopPropagation(); this.selectRisk(r, ev.ctrlKey || ev.metaKey); });
            g.addEventListener("mouseenter", (ev: MouseEvent) => { this.setActive(r.key); this.showTooltip(r, ev.clientX, ev.clientY); });
            g.addEventListener("mousemove", (ev: MouseEvent) => this.moveTooltip(r, ev.clientX, ev.clientY));
            g.addEventListener("mouseleave", () => { this.setActive(null); this.hideTooltip(); });
            g.addEventListener("focus", () => {
                this.focusedKey = r.key;
                this.setActive(r.key);
                const b = g.getBoundingClientRect();
                this.showTooltip(r, b.left + b.width / 2, b.top);
            });
            g.addEventListener("blur", () => { this.setActive(null); this.hideTooltip(); });
            markersG.appendChild(g);
        }
        root.appendChild(markersG);
        root.appendChild(overflowG);

        // ---- Swap ----------------------------------------------------------------------------
        const hadFocus = this.target.contains(document.activeElement);
        clearElement(this.svgEl);
        this.svgEl.appendChild(root);
        this.svgEl.setAttribute("aria-label",
            `Risk matrix ${N} by ${N} with ${d.risks.length} risks. Use arrow keys to move between risks, Enter to select, Escape to clear.`);

        // Roving tabindex: una sola parada de Tab
        const visible = d.risks.filter(r => !r.hidden);
        if (!visible.some(r => r.key === this.focusedKey)) { this.focusedKey = visible.length ? this.orderForKeyboard(visible)[0].key : null; }
        this.svgEl.setAttribute("tabindex", this.focusedKey ? "-1" : "0");
        const focusEl = this.markerEl(this.focusedKey);
        if (focusEl) {
            focusEl.setAttribute("tabindex", "0");
            if (hadFocus) { focusEl.focus(); }
        }

        this.applySelectionStyles();
        if (this.openCell && pro && s.detail.show.value) {
            this.renderPanel(this.openCell.x, this.openCell.y);
        } else {
            this.closePanel();
        }
    }

    /** Aviso de calidad de datos. Por defecto solo al editar: es para el autor, no para el lector. */
    private renderWarning(d: ParsedData): void {
        const mode = String(this.settings.grid.dataWarnings.value.value);
        const parts: string[] = [];
        if (d.incompletePairs.length > 0) {
            parts.push("add " + d.incompletePairs.join(" and ") + " to draw the movement");
        }
        if (d.skipped > 0) {
            parts.push(`${d.skipped} risk${d.skipped === 1 ? "" : "s"} without likelihood or impact not shown`);
        }
        if (d.clamped > 0) {
            parts.push(`${d.clamped} risk${d.clamped === 1 ? "" : "s"} with values outside the scale placed at the edge`);
        }
        const show = parts.length > 0 && (mode === "always" || (mode === "edit" && this.isEditing()));
        this.warningEl.style.display = show ? "block" : "none";
        this.warningEl.textContent = show ? "⚠ " + parts.join(" · ") : "";
    }

    private shapeElement(shape: Shape, x: number, y: number, size: number, fill: string): SVGElement {
        const r = size / 2;
        const attrs = { fill, class: "rmp-shape", stroke: "#FFFFFF", "stroke-width": 1.2 };
        switch (shape) {
            case "square": return svg("rect", { ...attrs, x: x - r * 0.9, y: y - r * 0.9, width: r * 1.8, height: r * 1.8, rx: 2 });
            case "diamond": return svg("polygon", { ...attrs, points: `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}` });
            case "triangle": return svg("polygon", { ...attrs, points: `${x},${y - r} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}` });
            default: return svg("circle", { ...attrs, cx: x, cy: y, r });
        }
    }

    private renderLegend(d: ParsedData): void {
        const s = this.settings.legend;
        clearElement(this.legendEl);
        if (!s.show.value || d.categories.length === 0) {
            this.legendEl.style.display = "none";
            return;
        }
        this.legendEl.style.display = "flex";
        this.legendEl.style.order = String(s.position.value.value) === "bottom" ? "2" : "0";
        const lfs = Math.max(8, Math.min(32, s.fontSize.value || 11));
        this.legendEl.style.fontFamily = safeFont(s.fontFamily.value);
        this.legendEl.style.fontSize = lfs + "px";
        this.legendEl.style.color = this.isHighContrast ? this.hcForeground : safeColor(s.color.value?.value, "#535146");
        const sws = Math.round(lfs * 1.1);
        for (const c of d.categories) {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "rmp-legend-item";
            item.setAttribute("role", "listitem");
            const sw = document.createElementNS(SVG_NS, "svg");
            sw.setAttribute("width", String(sws));
            sw.setAttribute("height", String(sws));
            sw.setAttribute("aria-hidden", "true");
            sw.appendChild(this.shapeElement(c.shape, sws / 2, sws / 2, sws - 1, this.isHighContrast ? this.hcForeground : c.color));
            const label = document.createElement("span");
            label.textContent = c.name;
            item.append(sw, label);
            item.setAttribute("aria-label", `Select all risks in ${c.name}`);
            item.addEventListener("click", (ev: MouseEvent) => {
                const ids = d.risks.filter(r => r.category === c.name).map(r => r.selectionId);
                this.selectMany(ids, ev.ctrlKey || ev.metaKey);
            });
            this.legendEl.appendChild(item);
        }
    }

    // ==========================================================================================
    // Detail panel (Pro)
    // ==========================================================================================

    private renderPanel(x: number, y: number): void {
        const d = this.data;
        if (!d) { return; }
        const list = d.risks.filter(r => r.plotted.x === x && r.plotted.y === y);
        const N = this.gridSize;
        const xl = this.levelLabels(this.settings.axes.xLabels.value, N)[x - 1];
        const yl = this.levelLabels(this.settings.axes.yLabels.value, N)[y - 1];
        const band = this.bandOf(x, y);

        clearElement(this.panelEl);
        this.panelEl.style.display = "flex";
        this.panelEl.setAttribute("aria-label", "Cell detail");
        if (this.isHighContrast) {
            this.panelEl.style.background = this.hcBackground;
            this.panelEl.style.color = this.hcForeground;
            this.panelEl.style.borderColor = this.hcForeground;
        } else {
            const det = this.settings.detail;
            this.panelEl.style.background = safeColor(det.background.value?.value, "#FFFFFF");
            this.panelEl.style.color = safeColor(det.textColor.value?.value, "#3D3929");
            this.panelEl.style.borderColor = "";
        }
        this.panelEl.style.fontSize = Math.max(8, Math.min(24, this.settings.detail.fontSize.value || 12)) + "px";

        const head = document.createElement("div");
        head.className = "rmp-panel-head";
        const title = document.createElement("div");
        title.className = "rmp-panel-title";
        title.textContent = `${this.settings.axes.xTitle.value || "Likelihood"}: ${xl} · ${this.settings.axes.yTitle.value || "Impact"}: ${yl}`;
        const sub = document.createElement("div");
        sub.className = "rmp-panel-sub";
        sub.textContent = `Score ${x * y} · ${BAND_NAMES[band]} · ${list.length} risk${list.length === 1 ? "" : "s"}`;
        const close = document.createElement("button");
        close.type = "button";
        close.className = "rmp-panel-close";
        close.textContent = "×";
        close.setAttribute("aria-label", "Close detail panel");
        close.addEventListener("click", () => { this.openCell = null; this.closePanel(); this.svgEl.focus(); });
        const titles = document.createElement("div");
        titles.append(title, sub);
        head.append(titles, close);
        this.panelEl.appendChild(head);

        const ul = document.createElement("ul");
        ul.className = "rmp-panel-list";
        const fmtL = valueFormatter.getFormatStringByColumn(d.likelihoodColumn.source as any);
        const fmtI = valueFormatter.getFormatStringByColumn(d.impactColumn.source as any);
        for (const r of list) {
            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "rmp-panel-item";
            btn.setAttribute("data-key", r.key);
            const sw = document.createElement("span");
            sw.className = "rmp-panel-swatch";
            sw.style.background = this.isHighContrast ? this.hcForeground : r.color;
            const name = document.createElement("span");
            name.className = "rmp-panel-name";
            name.textContent = r.name;
            const meta = document.createElement("span");
            meta.className = "rmp-panel-meta";
            const parts = [
                r.category,
                `L ${valueFormatter.format(r.likelihood, fmtL)} · I ${valueFormatter.format(r.impact, fmtI)}`,
                r.residual ? `residual score ${r.residual.x * r.residual.y}` : null,
                r.target ? `target ${r.target.x * r.target.y}${r.offTarget ? " (not reached)" : " (reached)"}` : null
            ].filter(Boolean);
            meta.textContent = parts.join(" · ");
            const text = document.createElement("span");
            text.className = "rmp-panel-text";
            text.append(name, meta);
            btn.append(sw, text);
            btn.addEventListener("click", (ev: MouseEvent) => this.selectRisk(r, ev.ctrlKey || ev.metaKey));
            btn.addEventListener("keydown", (ev: KeyboardEvent) => {
                if (ev.key === "Escape") { this.openCell = null; this.closePanel(); this.svgEl.focus(); }
            });
            li.appendChild(btn);
            ul.appendChild(li);
        }
        this.panelEl.appendChild(ul);
        this.applySelectionStyles();
    }

    private closePanel(): void {
        this.panelEl.style.display = "none";
        clearElement(this.panelEl);
    }

    // ==========================================================================================
    // Interaction
    // ==========================================================================================

    private interactionsAllowed(): boolean {
        return (this.host as any).allowInteractions !== false;
    }

    private onCellClick(x: number, y: number, list: RiskPoint[], ev: MouseEvent): void {
        ev.stopPropagation();
        if (!this.interactionsAllowed()) { return; }
        if (this.isProActive() && this.settings.detail.show.value) {
            this.openCell = { x, y };
            this.renderPanel(x, y);
        }
        if (list.length === 0) {
            this.clearSelection();
            return;
        }
        this.selectMany(list.map(r => r.selectionId), ev.ctrlKey || ev.metaKey);
    }

    private selectRisk(r: RiskPoint, multi: boolean): void {
        if (!this.interactionsAllowed()) { return; }
        this.focusedKey = r.key;
        this.selectionManager.select(r.selectionId, multi).then((ids: ISelectionId[]) => {
            this.selectedKeys = new Set(ids.map(id => id.getKey()));
            this.applySelectionStyles();
        });
    }

    private selectMany(ids: ISelectionId[], multi: boolean): void {
        if (!this.interactionsAllowed() || ids.length === 0) { return; }
        this.selectionManager.select(ids, multi).then((sel: ISelectionId[]) => {
            this.selectedKeys = new Set(sel.map(id => id.getKey()));
            this.applySelectionStyles();
        });
    }

    private clearSelection(): void {
        if (!this.interactionsAllowed()) { return; }
        this.selectionManager.clear().then(() => {
            this.selectedKeys.clear();
            this.applySelectionStyles();
        });
    }

    private applySelectionStyles(): void {
        const d = this.data;
        if (!d) { return; }
        const anySelected = this.selectedKeys.size > 0;
        const byKey = new Map(d.risks.map(r => [r.key, r]));
        this.svgEl.querySelectorAll<SVGGElement>(".rmp-marker").forEach(g => {
            const r = byKey.get(g.getAttribute("data-key"));
            if (!r) { return; }
            const selected = this.selectedKeys.has(r.key);
            const dim = (anySelected && !selected) || (!anySelected && d.hasHighlights && !r.highlighted);
            g.setAttribute("opacity", dim ? "0.3" : "1");
            g.setAttribute("aria-selected", String(selected));
            const shape = g.querySelector(".rmp-shape");
            if (shape) {
                shape.setAttribute("stroke", selected ? (this.isHighContrast ? this.hcSelected : "#252423") : (this.isHighContrast ? this.hcBackground : "#FFFFFF"));
                shape.setAttribute("stroke-width", selected ? "2.5" : "1.2");
            }
        });
        this.svgEl.querySelectorAll<SVGElement>("[data-move]").forEach(el => {
            const r = byKey.get(el.getAttribute("data-move"));
            const dim = r && ((anySelected && !this.selectedKeys.has(r.key)) || (!anySelected && d.hasHighlights && !r.highlighted));
            el.setAttribute("opacity", dim ? "0.2" : "0.85");
        });
        this.updateMovementVisibility();
        this.panelEl.querySelectorAll<HTMLElement>(".rmp-panel-item").forEach(b => {
            const sel = this.selectedKeys.has(b.getAttribute("data-key"));
            b.classList.toggle("rmp-selected", sel);
            b.setAttribute("aria-pressed", String(sel));
        });
    }

    private setActive(key: string | null): void {
        this.activeKey = key;
        this.updateMovementVisibility();
    }

    /** Modo "focus": solo el recorrido de los riesgos seleccionados y del que está bajo el ratón o el foco. */
    private updateMovementVisibility(): void {
        const all = !this.settings || String(this.settings.movement.arrows.value.value) === "all";
        this.svgEl.querySelectorAll<SVGGElement>("[data-move-group]").forEach(g => {
            const key = g.getAttribute("data-move-group");
            const show = all || key === this.activeKey || this.selectedKeys.has(key);
            g.style.display = show ? "" : "none";
        });
    }

    // ---- Keyboard ----------------------------------------------------------------------------

    private orderForKeyboard(list: RiskPoint[]): RiskPoint[] {
        return list.slice().sort((a, b) => (a.py - b.py) || (a.px - b.px));
    }

    private markerEl(key: string | null): SVGGElement | null {
        if (!key) { return null; }
        const all = this.svgEl.querySelectorAll<SVGGElement>(".rmp-marker");
        for (let i = 0; i < all.length; i++) {
            if (all[i].getAttribute("data-key") === key) { return all[i]; }
        }
        return null;
    }

    private findRisk(key: string | null): RiskPoint | null {
        return (key && this.data?.risks.find(r => r.key === key)) || null;
    }

    private moveFocus(r: RiskPoint | null): void {
        if (!r) { return; }
        const prev = this.markerEl(this.focusedKey);
        if (prev) { prev.setAttribute("tabindex", "-1"); }
        this.focusedKey = r.key;
        const el = this.markerEl(r.key);
        if (el) {
            el.setAttribute("tabindex", "0");
            el.focus();
        }
    }

    private onKeyDown(ev: KeyboardEvent): void {
        const d = this.data;
        if (!d) { return; }
        const visible = d.risks.filter(x => !x.hidden);
        if (visible.length === 0) { return; }
        const current = this.findRisk(this.focusedKey) || this.orderForKeyboard(visible)[0];
        const ordered = this.orderForKeyboard(visible);
        const pos = ordered.indexOf(current);

        // Vecino más cercano en la dirección pedida
        const nearest = (dirX: number, dirY: number): RiskPoint | null => {
            let best: RiskPoint | null = null;
            let bestScore = Infinity;
            for (const c of visible) {
                if (c === current) { continue; }
                const dx = c.px - current.px, dy = c.py - current.py;
                const along = dx * dirX + dy * dirY;
                if (along <= 0.5) { continue; }
                const across = Math.abs(dx * dirY) + Math.abs(dy * dirX);
                const score = along + across * 2;
                if (score < bestScore) { bestScore = score; best = c; }
            }
            return best;
        };

        let handled = true;
        switch (ev.key) {
            case "ArrowRight": this.moveFocus(nearest(1, 0)); break;
            case "ArrowLeft": this.moveFocus(nearest(-1, 0)); break;
            case "ArrowUp": this.moveFocus(nearest(0, -1)); break;
            case "ArrowDown": this.moveFocus(nearest(0, 1)); break;
            case "Home": this.moveFocus(ordered[0]); break;
            case "End": this.moveFocus(ordered[ordered.length - 1]); break;
            case "PageDown": this.moveFocus(ordered[Math.min(ordered.length - 1, pos + 10)]); break;
            case "PageUp": this.moveFocus(ordered[Math.max(0, pos - 10)]); break;
            case "Enter":
            case " ":
                this.selectRisk(current, ev.ctrlKey || ev.metaKey);
                if (this.isProActive() && this.settings.detail.show.value) {
                    this.openCell = { x: current.plotted.x, y: current.plotted.y };
                    this.renderPanel(current.plotted.x, current.plotted.y);
                }
                break;
            case "Escape":
                this.clearSelection();
                if (this.openCell) { this.openCell = null; this.closePanel(); }
                break;
            case "ContextMenu":
            case "F10": {
                if (ev.key === "F10" && !ev.shiftKey) { handled = false; break; }
                const el = this.markerEl(current.key);
                const b = el ? el.getBoundingClientRect() : this.svgEl.getBoundingClientRect();
                this.selectionManager.showContextMenu(current.selectionId, { x: b.left + b.width / 2, y: b.top + b.height / 2 });
                break;
            }
            default: handled = false;
        }
        if (handled) {
            ev.preventDefault();
            ev.stopPropagation();
        }
    }

    // ---- Tooltips ----------------------------------------------------------------------------

    private tooltipItems(r: RiskPoint): powerbi.extensibility.VisualTooltipDataItem[] {
        const d = this.data;
        const N = this.gridSize;
        const xl = this.levelLabels(this.settings.axes.xLabels.value, N);
        const yl = this.levelLabels(this.settings.axes.yLabels.value, N);
        const fmtL = valueFormatter.getFormatStringByColumn(d.likelihoodColumn.source as any);
        const fmtI = valueFormatter.getFormatStringByColumn(d.impactColumn.source as any);
        const band = this.bandOf(r.level.x, r.level.y);
        const items: powerbi.extensibility.VisualTooltipDataItem[] = [
            { displayName: "Risk", value: r.name, color: r.color }
        ];
        if (r.category !== null) { items.push({ displayName: d.categoryColumn.source.displayName, value: r.category }); }
        items.push(
            { displayName: d.likelihoodColumn.source.displayName, value: `${valueFormatter.format(r.likelihood, fmtL)} (${xl[r.level.x - 1]})` },
            { displayName: d.impactColumn.source.displayName, value: `${valueFormatter.format(r.impact, fmtI)} (${yl[r.level.y - 1]})` },
            { displayName: "Score", value: `${r.level.x * r.level.y} · ${BAND_NAMES[band]}` }
        );
        if (r.residual && this.isProActive()) {
            const rb = this.bandOf(r.residual.x, r.residual.y);
            items.push({ displayName: "Residual score", value: `${r.residual.x * r.residual.y} · ${BAND_NAMES[rb]}` });
        }
        if (r.target && this.isProActive()) {
            const tb = this.bandOf(r.target.x, r.target.y);
            items.push({ displayName: "Target score", value: `${r.target.x * r.target.y} · ${BAND_NAMES[tb]} · ${r.offTarget ? "not reached" : "reached"}` });
        }
        for (const e of r.tooltipExtras) { items.push({ displayName: e.name, value: e.value }); }
        return items;
    }

    private showTooltip(r: RiskPoint, x: number, y: number): void {
        this.host.tooltipService.show({
            dataItems: this.tooltipItems(r),
            identities: [r.selectionId],
            coordinates: [x, y],
            isTouchEvent: false
        });
    }

    private moveTooltip(r: RiskPoint, x: number, y: number): void {
        this.host.tooltipService.move({
            dataItems: this.tooltipItems(r),
            identities: [r.selectionId],
            coordinates: [x, y],
            isTouchEvent: false
        });
    }

    private hideTooltip(): void {
        this.host.tooltipService.hide({ immediately: false, isTouchEvent: false });
    }

    // ==========================================================================================
    // Helpers
    // ==========================================================================================

    private describe(r: RiskPoint): string {
        const band = BAND_NAMES[this.bandOf(r.plotted.x, r.plotted.y)];
        const cat = r.category !== null ? `, ${r.category}` : "";
        const res = (r.residual && this.isProActive() ? `, residual score ${r.residual.x * r.residual.y}` : "") +
            (r.target && this.isProActive() ? `, target score ${r.target.x * r.target.y}${r.offTarget ? ", target not reached" : ""}` : "");
        return `${r.name}${cat}: likelihood ${r.level.x}, impact ${r.level.y}, score ${r.level.x * r.level.y} (${band})${res}`;
    }

    private levelLabels(text: string, N: number): string[] {
        const custom = (text || "").split(",").map(t => t.trim());
        return Array.from({ length: N }, (_, i) => custom[i] || String(i + 1));
    }

    private truncate(text: string, max: number, ellipsis = "…"): string {
        return text.length <= max ? text : text.slice(0, Math.max(1, max - ellipsis.length)) + ellipsis;
    }

    private readHighContrast(): void {
        const palette = this.host.colorPalette;
        this.isHighContrast = !!(palette && palette.isHighContrast);
        if (!this.isHighContrast) { return; }
        this.hcForeground = (palette.foreground && palette.foreground.value) || "#000000";
        this.hcBackground = (palette.background && palette.background.value) || "#FFFFFF";
        this.hcSelected = (palette.foregroundSelected && palette.foregroundSelected.value) || this.hcForeground;
    }

    // ==========================================================================================
    // Licensing
    // ==========================================================================================

    /** Modo edicion (ViewMode: View=0, Edit=1, InFocusEdit=2). Sin viewMode se trata como lectura. */
    private isEditing(): boolean {
        const vm = (this.lastOptions as any)?.viewMode;
        return typeof vm === "number" && vm !== 0;
    }

    /**
     * Vista previa Pro: Free, editando, con la licencia ya resuelta y en un entorno que puede
     * leerla. En lectura, antes de resolver, o donde la licencia no se puede leer se pinta el
     * resultado gratuito.
     */
    private isPreview(): boolean {
        return !this.isPro && this.isEditing() && this.licenseResolved && !this.licenseEnvUnsupported;
    }

    private isProActive(): boolean {
        return this.isPro || this.isPreview();
    }

    private updateWatermark(): void {
        const show = this.isPreview() && this.attemptedPro.length > 0;
        this.watermarkEl.style.display = show ? "flex" : "none";
        if (!show) { return; }
        const width = this.target.clientWidth || 0;
        const size = Math.max(20, Math.min(72, Math.round(width * 0.09)));
        this.watermarkEl.style.fontSize = `${size}px`;
    }

    /** Pide la licencia una vez, fuera del camino critico. Si no resuelve, se queda en Free. */
    private requestLicenseDeferred(): void {
        if (this.licenseRequested || this.isPro) { return; }
        this.licenseRequested = true;
        setTimeout(() => {
            try {
                const lm = this.licenseManager as any;
                if (!lm) { this.licenseEnvUnsupported = true; this.licenseResolved = true; return; }
                // getAvailableServicePlans devuelve IPromise2: se consume con then(ok, err).
                lm.getAvailableServicePlans().then(
                    (result: any) => {
                        if (result?.isLicenseUnsupportedEnv === true || result?.isLicenseInfoAvailable === false) {
                            this.licenseEnvUnsupported = true;
                        }
                        this.licenseResolved = true;
                        const plans: any[] = result?.plans ?? [];
                        // Warning es periodo de gracia por un problema de pago: sigue siendo usable.
                        if (plans.some(p => matchesPlan(p.spIdentifier, PLAN_ID) &&
                            (p.state === STATE_ACTIVE || p.state === STATE_WARNING))) {
                            this.isPro = true;
                        }
                        this.repaint();
                        this.syncLicenseNotification();
                    },
                    () => { this.licenseEnvUnsupported = true; this.licenseResolved = true; });
            } catch (_) {
                this.licenseEnvUnsupported = true;
                this.licenseResolved = true;
            }
        }, 0);
    }

    /** Repinta con el ultimo dataView fuera de update(): no emite rendering events. */
    private repaint(): void {
        if (!this.lastDataView) { return; }
        try {
            this.renderFromDataView(this.lastDataView);
        } catch (_) {
            /* keep whatever is already on screen */
        }
    }

    /** La ruta de compra la pone Power BI, nunca el visual. */
    private cancelLicenseIcon(): void {
        if (this.licenseIconTimer !== null) {
            window.clearTimeout(this.licenseIconTimer);
            this.licenseIconTimer = null;
        }
    }

    private syncLicenseNotification(): void {
        const lm = this.licenseManager as any;
        if (!lm) { return; }
        try {
            if (this.isPro || this.attemptedPro.length === 0) {
                this.cancelLicenseIcon();
                if (this.noticeShown) {
                    this.noticeShown = false;
                    this.notifiedPro = [];
                    lm.clearLicenseNotification?.();
                }
                return;
            }
            if (!this.licenseResolved || this.licenseEnvUnsupported) { return; }
            // Solo las funciones recién activadas merecen un banner; quitar una no vuelve a avisar.
            const added = this.attemptedPro.filter(a => this.notifiedPro.indexOf(a) === -1);
            this.notifiedPro = this.attemptedPro.slice();
            if (added.length === 0) { return; }
            this.noticeShown = true;

            const n = added.length;
            const es = (this.host.locale || "").toLowerCase().startsWith("es");
            const items = es ? added.map(a => ES_LABELS[a] || a) : added;
            const list = n === 1 ? items[0]
                : items.slice(0, -1).join(", ") + (es ? " y " : " and ") + items[n - 1];
            const msg = es
                ? `Risk Matrix Pro: ${list} ${n === 1 ? "forma" : "forman"} parte del plan Pro y se ${n === 1 ? "muestra" : "muestran"} como vista previa con marca de agua mientras editas.`
                : `Risk Matrix Pro: ${list} ${n === 1 ? "is" : "are"} part of the Pro plan, shown as a watermarked preview while editing.`;

            // Power BI no pinta una notificación nueva mientras hay otra activa: se retira antes.
            const show = () => {
                try {
                    // Power BI muestra una notificación a la vez: primero el banner con la función
                    // concreta (unos 10 s) y, al terminar, la barra de Upgrade persistente.
                    lm.notifyFeatureBlocked?.(msg.slice(0, 500));
                    this.cancelLicenseIcon();
                    this.licenseIconTimer = window.setTimeout(() => {
                        this.licenseIconTimer = null;
                        if (this.isPro || this.attemptedPro.length === 0) { return; }
                        try { lm.notifyLicenseRequired?.(0 /* LicenseNotificationType.General */); } catch (_) { /* nunca rompe */ }
                    }, 10500);
                } catch (_) { /* nunca rompe el render */ }
            };
            const cleared = lm.clearLicenseNotification?.();
            if (cleared && typeof cleared.then === "function") {
                cleared.then(show, show);
            } else {
                show();
            }
        } catch (_) {
            /* la notificacion nunca rompe el render */
        }
    }
}
