# -*- coding: utf-8 -*-
"""
Imágenes de la oferta (1366×768) con el visual REAL (.tmp/drop de `node build-test.js --free`; la licencia Pro se
simula en el host), datos ficticios de Begudes Nord y la plantilla TCViz de la cartera (fondo #FAF9F5, tarjetas blancas,
Poppins). Misma receta que Chip Slicer Hierarchy 1.4 y Tile Grid Map Pro 1.3.

Escribe en assets/: Screenshot_1.png (real y plan lado a lado), Screenshot_2.png (small multiples por canal, Boardroom)
y Screenshot_3.png (Report theme, IBCS style y dos estilos de la colección). Las cifras laterales salen de los datos.

    node build-test.js --free && python tools/simulador/imagenes.py
"""
import asyncio, base64, io, json, os, sys
from playwright.async_api import async_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness as H

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
POPPINS = r"C:\tcviz\datos\demo_rtm\tema\Poppins"
LOGO = r"C:\tcviz\web\logos\tcviz-logo-light.svg"
ASSETS = os.path.join(ROOT, "assets")


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def plantilla(pregunta, subtitulo, cuerpo, lateral):
    fuentes = "".join(f"@font-face{{font-family:'Poppins';font-weight:{w};src:url('{uri(os.path.join(POPPINS, f), 'font/ttf')}')}}"
                      for w, f in ((400, "Poppins-Regular.ttf"), (500, "Poppins-Medium.ttf"), (600, "Poppins-SemiBold.ttf")))
    lat = f'<div class="lat">{lateral}</div>' if lateral else ""
    return f"""<html><head><style>{fuentes}
body{{margin:0;background:#FAF9F5;font-family:'Segoe UI',sans-serif;color:#3D3929}}
#lienzo{{width:1366px;height:768px;box-sizing:border-box;padding:22px 30px;display:flex;flex-direction:column;gap:16px}}
.cab{{display:flex;align-items:center;gap:20px}} .cab img{{height:40px}} .sep{{width:1px;height:40px;background:#DAD9D4}}
.cab h1{{font-family:Poppins;font-weight:600;font-size:25px;margin:0;line-height:1.15}}
.cab p{{margin:2px 0 0;font-size:13px;color:#6B6A63}}
.fila{{display:flex;gap:16px;flex:1;min-height:0}}
.tarjeta{{background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(61,57,41,.10);padding:12px;box-sizing:border-box}}
.lat{{width:290px;display:flex;flex-direction:column;gap:14px}}
.lat h3{{font-family:Poppins;font-weight:600;font-size:14px;margin:0 0 6px;color:#2B6CB0}}
.lat p{{margin:0;font-size:13.5px;line-height:1.5;color:#535146}} .lat b{{color:#3D3929}}
.kpi .n{{font-family:Poppins;font-weight:600;font-size:30px;line-height:1.1}} .kpi .t{{font-size:12.5px;color:#6B6A63}}
.titulo{{font-family:Poppins;font-weight:600;font-size:14px;margin:0 0 6px}}
.rej{{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1}}
.host{{position:relative;overflow:hidden}}
</style></head><body><div id="lienzo">
<div class="cab"><img src="{uri(LOGO, 'image/svg+xml')}"><div class="sep"></div><div><h1>{pregunta}</h1><p>{subtitulo}</p></div></div>
<div class="fila">{cuerpo}{lat}</div></div></body></html>"""


async def montar(b, html, hosts):
    """hosts: [(id, dataview, w, h)] → un visual en cada uno, en lectura y con licencia Pro."""
    guid = json.load(io.open(os.path.join(H.DROP, "pbiviz.json"), encoding="utf-8"))["visual"]["guid"]
    pg = await b.new_page(viewport={"width": 1366, "height": 768}, device_scale_factor=1)
    await pg.set_content(html)
    await pg.add_style_tag(path=os.path.join(H.DROP, "visual.css"))
    await pg.add_script_tag(content="window.__pro = true; window.__hc = false; window.__locale = 'en-US';")
    # Paleta del tema TCViz (datos/demo_rtm/tema): Power BI da a cada categoría un color distinto del tema.
    stub = H.STUB.replace("'PLAN'", repr(H.PLAN)).replace("getColor(k){ return {value:'#2B6CB0'}; }",
        "getColor(k){ const p = ['#2B6CB0','#3E9C5B','#D9822B','#8E5BA8','#5F6B7A']; window.__cc = window.__cc || {}; if (!(k in __cc)) __cc[k] = p[Object.keys(__cc).length % p.length]; return {value: __cc[k]}; }")
    await pg.add_script_tag(content=stub)
    await pg.add_script_tag(path=os.path.join(H.DROP, "visual.js"))
    for _ in range(2):        # segunda pasada: la licencia ya resuelta
        for hid, dv, w, h in hosts:
            await pg.evaluate("""([g, id, dv, w, h]) => { if (!window['v_' + id]) window['v_' + id] = powerbi.visuals.plugins[g].create({ element: document.getElementById(id), host: __host });
                window['v_' + id].update({ dataViews: [dv], viewport: {width: w, height: h}, type: 2, operationKind: 0, viewMode: 0, jsonFilters: [] }); }""", [guid, hid, dv, w, h])
        await pg.wait_for_timeout(300)
    return pg


async def main():
    if not os.path.exists(os.path.join(H.DROP, "visual.js")):
        print("Falta .tmp/drop: node build-test.js --free"); sys.exit(2)
    os.makedirs(ASSETS, exist_ok=True)
    sub = "Risk Matrix Pro · Begudes Nord · fictitious company · risk register 2026"
    n = len(H.RIESGOS)
    encima = sum(1 for r in H.RIESGOS if r[4][0] * r[4][1] > r[5][0] * r[5][1])
    criticos = sum(1 for r in H.RIESGOS if r[2] * r[3] >= 15)
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # 1 · Matriz + lista de riesgos.
        W, Hh = 1000, 640
        cuerpo = f'<div class="tarjeta" style="flex:1"><div class="titulo">Risk register: inherent → residual → target</div><div class="host" id="s1" style="width:{W - 24}px;height:{Hh - 64}px"></div></div>'
        lat = (f'<div class="tarjeta kpi"><div class="n">{encima} of {n}</div><div class="t">risks still above target after controls</div></div>'
               f'<div class="tarjeta kpi"><div class="n">{criticos}</div><div class="t">risks with an inherent score of 15 or more</div></div>'
               '<div class="tarjeta"><h3>New in 1.1 · Pro</h3><p>The <b>risk list</b> ranks every risk beside the matrix, with its band '
               'and its path. Point at a row and its marker lights up.</p></div>'
               '<div class="tarjeta"><h3>Paths by default</h3><p>With residual and target fields, every risk shows where it starts, where controls '
               'take it and where it should end.</p></div>')
        pg = await montar(b, plantilla("Which risks are still above target?", sub, cuerpo, lat),
                          [("s1", H.dataview({"riskList": {"show": True, "width": 36}}), W - 24, Hh - 64)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_1.png"))
        await pg.close()

        # 2 · Cuatro looks.
        celdas, hosts = [], []
        for k, (t, nombre) in enumerate((("report", "Report theme · free"), ("boardroom", "Boardroom · Pro"), ("ledger", "Ledger · Pro"), ("aurora", "Aurora · Pro"))):
            celdas.append(f'<div class="tarjeta" style="padding:10px"><div class="titulo">{nombre}</div><div class="host" id="c{k}" style="width:636px;height:282px"></div></div>')
            hosts.append((f"c{k}", H.dataview({"style": {"template": t}}, mov=False), 636, 282))
        pg = await montar(b, plantilla("One matrix, the collection styles", "Report theme and Classic free · Boardroom, Ledger, Editorial, Signal, Aurora and Terrace in Pro, each with its own risk colours",
                                       f'<div class="rej">{"".join(celdas)}</div>', ""), hosts)
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_2.png"))
        await pg.close()

        # 3 · Signal con la lista ordenada por distancia al objetivo.
        cuerpo = f'<div class="tarjeta" style="flex:1"><div class="titulo">Sorted by gap to target · Signal style</div><div class="host" id="s3" style="width:{W - 24}px;height:{Hh - 64}px"></div></div>'
        lat = ('<div class="tarjeta"><h3>Sort the list</h3><p>By inherent score, residual score or <b>gap to target</b>: the risks that '
               'still need work come first.</p></div>'
               '<div class="tarjeta"><h3>Same colours, same meaning</h3><p>Every style keeps green → red for Low, Medium, High and Critical, in '
               'its own tone.</p></div>'
               '<div class="tarjeta"><h3>For every report</h3><p>12 languages, high contrast, keyboard, text that scales with the visual and '
               'format on the canvas.</p></div>')
        pg = await montar(b, plantilla("Where should the committee look first?", sub, cuerpo, lat),
                          [("s3", H.dataview({"style": {"template": "signal"}, "riskList": {"show": True, "sortBy": "gap", "width": 36}}), W - 24, Hh - 64)])
        await pg.screenshot(path=os.path.join(ASSETS, "Screenshot_3.png"))
        await pg.close()
        await b.close()
    print("assets/Screenshot_1-3.png")


if __name__ == "__main__":
    asyncio.run(main())
