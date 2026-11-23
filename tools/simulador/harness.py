# -*- coding: utf-8 -*-
"""Simulador Playwright de Risk Matrix Pro (1.1).

Carga el bundle de .tmp/drop (`node build-test.js --free`, licencia REAL) en un host simulado; la licencia se simula en
el host (Pro o sin licencia), así una sola build cubre los dos caminos. Datos ficticios de Begudes Nord.

    node build-test.js --free
    python tools/simulador/harness.py            # comprobaciones + capturas en tools/simulador/capturas/
"""
import asyncio, io, json, os, sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capturas")
DROP = os.path.join(ROOT, ".tmp", "drop")
PLAN = "risk-matrix-pro-tcviz"
FALLOS = []

# Riesgos de Begudes Nord (ficticia): nombre, categoría, probabilidad, impacto, residual (p, i), objetivo (p, i)
RIESGOS = [
    ("Supplier delay", "Operational", 4, 4, (3, 3), (2, 3)),
    ("Glass price rise", "Financial", 4, 3, (3, 3), (3, 2)),
    ("Cold-chain failure", "Operational", 2, 5, (2, 3), (1, 3)),
    ("Key account loss", "Commercial", 3, 5, (3, 4), (2, 3)),
    ("Sugar tax change", "Compliance", 3, 4, (3, 3), (2, 2)),
    ("Ransomware", "IT", 2, 5, (1, 4), (1, 3)),
    ("Truck driver shortage", "Operational", 4, 2, (3, 2), (2, 2)),
    ("Label recall", "Compliance", 1, 4, (1, 3), (1, 2)),
    ("FX on imports", "Financial", 3, 2, (2, 2), (2, 1)),
    ("Plant flood", "Operational", 1, 5, (1, 4), (1, 4)),
    ("Promo overspend", "Commercial", 4, 3, (2, 3), (2, 2)),
    ("ERP outage", "IT", 2, 3, (2, 2), (1, 2)),
]


def dataview(objects=None, mov=True, tipo="number"):
    cats = [
        {"source": {"displayName": "Risk", "queryName": "r.Risk", "roles": {"risk": True}, "type": {"text": True}},
         "values": [r[0] for r in RIESGOS], "identity": [{"k": i} for i in range(len(RIESGOS))]},
        {"source": {"displayName": "Category", "queryName": "r.Category", "roles": {"category": True}, "type": {"text": True}},
         "values": [r[1] for r in RIESGOS], "identity": [{"k": i} for i in range(len(RIESGOS))]},
    ]
    def col(nombre, rol, vals):
        return {"source": {"displayName": nombre, "queryName": "r." + rol, "roles": {rol: True}, "type": {"numeric": True}, "isMeasure": True, "format": "0"},
                "values": vals}
    vals = [col("Likelihood", "likelihood", [r[2] for r in RIESGOS]), col("Impact", "impact", [r[3] for r in RIESGOS])]
    if mov:
        vals += [col("Residual likelihood", "residualLikelihood", [r[4][0] for r in RIESGOS]),
                 col("Residual impact", "residualImpact", [r[4][1] for r in RIESGOS]),
                 col("Target likelihood", "targetLikelihood", [r[5][0] for r in RIESGOS]),
                 col("Target impact", "targetImpact", [r[5][1] for r in RIESGOS])]
    return {"metadata": {"objects": objects or {}, "columns": [c["source"] for c in cats] + [v["source"] for v in vals]},
            "categorical": {"categories": cats, "values": vals}}


STUB = r"""
window.__ev = []; window.__persist = []; window.__notif = [];
window.powerbi = { visuals: { plugins: {} }, extensibility: {} };
(function(){
 let sel = [];
 window.__host = {
  eventService: { renderingStarted(){ __ev.push('S'); }, renderingFinished(){ __ev.push('F'); }, renderingFailed(o,m){ __ev.push('X'); console.error('FAILED', m); } },
  createSelectionManager(){ return { select(id, multi){ const a = Array.isArray(id) ? id : [id]; sel = multi ? sel.concat(a) : a; return Promise.resolve(sel); },
     clear(){ sel = []; return Promise.resolve(); }, getSelectionIds(){ return sel; },
     hasSelection(){ return sel.length > 0; }, registerOnSelectCallback(){}, showContextMenu(){ return Promise.resolve(); } }; },
  createSelectionIdBuilder(){ const k=[]; const b = { withCategory(c,i){ k.push('c'+i); return b; }, withSeries(){ return b; },
     withMeasure(){ return b; }, createSelectionId(){ const key=k.join('|'); return { key, getKey(){return key;}, getSelector(){ return {data:[key]}; }, equals(o){return o&&o.key===key;}, includes(){return false;} }; } }; return b; },
  createLocalizationManager(){ return { getDisplayName(k){ return k; } }; },
  tooltipService: { enabled(){ return true; }, show(o){ window.__tip = o; }, move(){}, hide(){} },
  subSelectionService: { subSelect(){}, updateRegionOutlines(){} },
  hostCapabilities: { allowInteractions: true }, locale: window.__locale || 'en-US',
  colorPalette: { isHighContrast: !!window.__hc, foreground:{value: window.__hc ? '#FFFF00' : '#252423'}, background:{value: window.__hc ? '#000000' : '#FFFFFF'},
    foregroundSelected:{value:'#1AEBFF'}, positive:{value:'#3E9C5B'}, negative:{value:'#D64545'}, getColor(k){ return {value:'#2B6CB0'}; } },
  licenseManager: { getAvailableServicePlans(){ return Promise.resolve({ plans: window.__pro ? [{ spIdentifier: 'PLAN', state: 1 }] : [], isLicenseUnsupportedEnv: false, isLicenseInfoAvailable: true }); },
     notifyFeatureBlocked(m){ __notif.push(m); return Promise.resolve(true); }, notifyLicenseRequired(){ return Promise.resolve(true); }, clearLicenseNotification(){ return Promise.resolve(true); } },
  persistProperties(p){ __persist.push(p); }, launchUrl(){}, applyJsonFilter(){}, displayWarningIcon(){}, refreshHostData(){},
 };
})();
"""


def check(name, ok, detail=""):
    print(f"  {'OK   ' if ok else 'FALLO'} {name}{'  — ' + detail if detail else ''}")
    if not ok: FALLOS.append(name)


async def page(b, dv, W=760, H=480, pro=True, edit=True, hc=False, locale="en-US", name=None):
    guid = json.load(io.open(os.path.join(DROP, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await b.new_page(viewport={"width": W, "height": H})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.set_content(f"<html><body style='margin:0;background:#fff'><div id='host' style='position:relative;width:{W}px;height:{H}px;overflow:hidden'></div></body></html>")
    await pg.add_style_tag(path=os.path.join(DROP, "visual.css"))
    await pg.add_script_tag(content=f"window.__pro = {json.dumps(pro)}; window.__hc = {json.dumps(hc)}; window.__locale = {json.dumps(locale)};")
    await pg.add_script_tag(content=STUB.replace("'PLAN'", repr(PLAN)))
    await pg.add_script_tag(path=os.path.join(DROP, "visual.js"))
    await pg.evaluate("(g) => { window.__v = powerbi.visuals.plugins[g].create({ element: document.getElementById('host'), host: __host }); }", guid)
    pg._errs, pg._dims, pg._vm = errs, (W, H), (1 if edit else 0)
    await upd(pg, dv)
    await pg.wait_for_timeout(120)
    await upd(pg, dv)
    if name:
        os.makedirs(OUT, exist_ok=True)
        await pg.screenshot(path=os.path.join(OUT, name + ".png"))
    return pg


async def upd(pg, dv):
    W, H = pg._dims
    await pg.evaluate("([dv, W, H, vm]) => __v.update({ dataViews: dv ? [JSON.parse(JSON.stringify(dv))] : [], viewport: { width: W, height: H }, type: 2, operationKind: 0, viewMode: vm, editMode: 0, jsonFilters: [] })",
                      [dv, W, H, pg._vm])
    await pg.wait_for_timeout(80)


async def eventos(pg, label):
    ev = await pg.evaluate("() => __ev.join('')")
    check(f"{label}: sin errores y eventos 1:1", not pg._errs and ev.count("S") == ev.count("F") and "X" not in ev, f"{ev} {pg._errs[:2]}")


async def info(pg):
    return await pg.evaluate("""() => { const h = document.getElementById('host');
        const wm = h.querySelector('.tcviz-wm'); const viejo = Array.from(h.children).find(e => e.textContent === 'Pro preview' && e.style.display !== 'none');
        return { bg: h.style.background, wm: wm && wm.style.display !== 'none' ? wm.textContent : (viejo ? 'Pro preview' : null),
                 flechas: h.querySelectorAll('.rmp-movement line').length, marcadores: h.querySelectorAll('.rmp-marker').length,
                 celda: (h.querySelector('.rmp-cell') || {getAttribute(){return null;}}).getAttribute('fill') }; }""")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        print("Base")
        pg = await page(b, dataview(), name="base_pro")
        i = await info(pg)
        check("12 marcadores", i["marcadores"] == 12, str(i))
        await eventos(pg, "base")
        vis = await pg.evaluate("() => Array.from(document.querySelectorAll('#host [data-move-group]')).filter(g => g.style.display !== 'none').length")
        check("por defecto: recorrido visible de todos los riesgos con movimiento", vis == 12, str(vis))
        await pg.close()
        pg = await page(b, None, name="landing")
        await eventos(pg, "landing")
        await pg.close()
        print("Estilos")
        for est in ("report", "classic", "boardroom", "ledger", "editorial", "signal", "aurora", "terrace"):
            pg = await page(b, dataview({"style": {"template": est}}), name=f"estilo_{est}")
            i = await info(pg)
            if est in ("boardroom", "aurora"):
                check(f"{est} (Pro): fondo del estilo", bool(i["bg"]), i["bg"])
            check(f"{est}: sin marca de agua con licencia", i["wm"] is None, str(i["wm"]))
            await eventos(pg, est)
            await pg.close()
        pg = await page(b, dataview({"style": {"template": "aurora"}}, mov=False), pro=False, edit=True, name="aurora_free_edicion")
        i = await info(pg)
        check("sin licencia editando: vista previa del estilo con marca que lo nombra", bool(i["bg"]) and i["wm"] and "Aurora" in i["wm"], str(i))
        await pg.close()
        pg = await page(b, dataview({"style": {"template": "aurora"}}, mov=False), pro=False, edit=False)
        i = await info(pg)
        check("sin licencia en lectura: Report theme, sin fondo ni marca", not i["bg"] and i["wm"] is None, str(i))
        await pg.close()
        pg = await page(b, dataview({"style": {"template": "aurora"}, "bands": {"lowColor": {"solid": {"color": "#00FF00"}}}}))
        i = await info(pg)
        check("un color guardado manda sobre el estilo", (i["celda"] or "").upper() == "#00FF00", str(i["celda"]))
        await pg.close()
        pg = await page(b, dataview({"style": {"template": "aurora"}}), hc=True)
        i = await info(pg)
        check("alto contraste gana al estilo", not i["bg"], str(i))
        await pg.close()

        print("Texto que encoge con el visual")
        medir = """() => { const h = document.getElementById('host');
            const t = Array.from(h.querySelectorAll('svg text')).filter(e => e.textContent.trim() && e.getBBox().width > 0);
            const fs = e => parseFloat(e.getAttribute('font-size') || e.closest('[font-size]')?.getAttribute('font-size') || getComputedStyle(e).fontSize);
            const ley = parseFloat(getComputedStyle(h.querySelector('.rmp-legend')).fontSize);
            return { n: t.length, fs: t.map(fs).concat([ley]) }; }"""
        g = await (await page(b, dataview(), W=760, H=480)).evaluate(medir)
        pq = await page(b, dataview(), W=456, H=288, name="tamano_456x288")
        q = await pq.evaluate(medir)
        await eventos(pq, "pequeño")
        await pq.close()
        check("al 60 %: el mayor texto encoge", max(q["fs"]) < max(g["fs"]), f"{max(g['fs'])} -> {max(q['fs'])}")
        check("al 60 %: nada por debajo de 8 px", min(q["fs"]) >= 8, str(min(q["fs"])))
        check("al 60 %: no se quita ningún texto", q["n"] >= g["n"] - 2, f"{g['n']} -> {q['n']}")

        await b.close()
    print()
    print("TODO OK" if not FALLOS else f"{len(FALLOS)} FALLO(S): " + "; ".join(FALLOS))


if __name__ == "__main__":
    asyncio.run(main())
