# -*- coding: utf-8 -*-
"""Idiomas de Risk Matrix Pro (1.1): src/strings.ts (textos propios y panel, por texto inglés) y stringResources (12
idiomas, claves de capabilities) + la lista de pbiviz.json.

Fuentes del inglés: displayName/description/placeholder de src/settings.ts, los this.t("...") y out.push("...") de
src/visual.ts, BAND_NAMES y los displayName de capabilities.json. Traducciones: tools/i18n_rm.py (por texto inglés).
El español de las claves de capabilities ya publicadas se conserva del es-ES.

    python tools/i18n.py            # genera
    python tools/i18n.py --faltan   # lista los textos sin traducción
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
LANGS = ["es", "pt", "fr", "de", "it", "nl", "pl", "ja", "zh", "ko"]
LOCALES = {"es": ["es-ES"], "pt": ["pt-BR", "pt-PT"], "fr": ["fr-FR"], "de": ["de-DE"], "it": ["it-IT"], "nl": ["nl-NL"],
           "pl": ["pl-PL"], "ja": ["ja-JP"], "zh": ["zh-CN"], "ko": ["ko-KR"]}


def leer(p):
    return io.open(os.path.join(ROOT, p), encoding="utf-8").read()


def textos():
    out = []
    st = leer("src/settings.ts")
    out += re.findall(r'(?:displayName|description|placeholder)\s*[:=]\s*"([^"]+)"', st)
    vt = leer("src/visual.ts")
    out += re.findall(r'this\.t\(\s*"([^"]+)"', vt)
    out += re.findall(r'out\.push\(\s*"([^"]+)"', vt)
    m = re.search(r'BAND_NAMES = \[([^\]]+)\]', vt)
    out += re.findall(r'"([^"]+)"', m.group(1))
    out += ["Residual likelihood", "Residual impact", "Target likelihood", "Target impact"]
    vistos, res = set(), []
    for t in out:
        t = t.replace('\\"', '"')
        if t.endswith(" (Pro)") and not t.startswith("Residual") and not t.startswith("Target"):
            pass
        if t not in vistos:
            vistos.add(t); res.append(t)
    return res


def capacidades():
    c = json.loads(leer("capabilities.json"))
    pares = {}
    def visita(o):
        if isinstance(o, dict):
            if "displayNameKey" in o and "displayName" in o:
                pares[o["displayNameKey"]] = o["displayName"]
            for v in o.values(): visita(v)
        elif isinstance(o, list):
            for v in o: visita(v)
    visita(c)
    return pares


def main():
    from i18n_rm import T
    tx = textos()
    caps = capacidades()
    faltan = [t for t in tx + list(caps.values()) if t not in T and not (t.endswith(" (Pro)") and t[:-6] in T)]
    faltan = list(dict.fromkeys(faltan))
    if "--faltan" in sys.argv:
        print("\n".join(faltan)); print(len(faltan), "sin traducir"); return
    if faltan:
        print("FALTAN", len(faltan), ":", faltan[:20]); sys.exit(1)

    def tr(t, i):
        if t in T: return T[t][i]
        return T[t[:-6]][i] + " (Pro)"

    js = ["/* Generado por tools/i18n.py — no editar a mano. Textos del visual y del panel por texto inglés. */",
          "export const STRINGS: Record<string, Record<string, string>> = {"]
    for i, l in enumerate(LANGS):
        js.append(f"    {l}: {{")
        for t in tx:
            js.append(f"        {json.dumps(t, ensure_ascii=False)}: {json.dumps(tr(t, i), ensure_ascii=False)},")
        js.append("    },")
    js.append("};")
    io.open(os.path.join(ROOT, "src", "strings.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(js) + "\n")

    es_pub = {}
    p_es = os.path.join(ROOT, "stringResources", "es-ES", "resources.resjson")
    if os.path.exists(p_es):
        es_pub = json.load(io.open(p_es, encoding="utf-8"))
    rutas = ["stringResources/en-US/resources.resjson"]
    os.makedirs(os.path.join(ROOT, "stringResources", "en-US"), exist_ok=True)
    io.open(os.path.join(ROOT, rutas[0]), "w", encoding="utf-8", newline="\n").write(json.dumps(caps, indent=2, ensure_ascii=False) + "\n")
    for i, l in enumerate(LANGS):
        for loc in LOCALES[l]:
            d = {k: (es_pub[k] if (l == "es" and k in es_pub) else tr(v, i)) for k, v in caps.items()}
            os.makedirs(os.path.join(ROOT, "stringResources", loc), exist_ok=True)
            r = f"stringResources/{loc}/resources.resjson"
            io.open(os.path.join(ROOT, r), "w", encoding="utf-8", newline="\n").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
            rutas.append(r)
    pj = json.loads(leer("pbiviz.json"))
    pj["stringResources"] = rutas
    io.open(os.path.join(ROOT, "pbiviz.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(pj, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(tx)} textos del visual · {len(caps)} claves de capabilities · {len(rutas)} idiomas")


if __name__ == "__main__":
    main()
