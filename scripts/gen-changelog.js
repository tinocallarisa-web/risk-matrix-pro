// Genera docs/changelog.html a partir de CHANGELOG.md (Pages sirve solo /docs).
//
//   node scripts/gen-changelog.js
//
// Por que existe: un CHANGELOG.md que no se sirve en GitHub Pages no cuenta como
// senal de release activity — el rastreador de OKviz busca una pagina, no un
// fichero del repo. Y por que se genera en vez de mantenerse a mano: dos copias
// del mismo changelog divergen, y la que se queda atras es siempre la publicada.
//
// La pagina va en docs/, que es la carpeta que sirve GitHub Pages en este repo.
//
// Sin dependencias a proposito. El subconjunto de markdown que se reconoce es el
// que usa CHANGELOG.md y nada mas: h2 de version, h3 de seccion, listas, negrita,
// codigo inline y enlaces.

const fs   = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC  = path.join(ROOT, "CHANGELOG.md");
const OUT  = path.join(ROOT, "docs", "changelog.html");

function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Inline: enlaces, negrita y `codigo`.
 *
 * El codigo va AL FINAL a proposito. Si fuera primero habria que dejar un
 * marcador en el texto y reemplazarlo despues, y un marcador numerico convierte
 * en <code> cualquier numero suelto del changelog. Haciendolo al final no hay
 * marcador que reemplazar.
 */
function inline(s) {
    let out = esc(s);
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
}

function render(md) {
    const lines = md.split(/\r?\n/);
    const html  = [];
    let inList = false;
    let para   = [];
    let item   = null;   // texto markdown del item de lista en curso

    // Los items y los parrafos se acumulan en crudo y se convierten al cerrarlos.
    // Convertir linea a linea parecia equivalente y no lo es: CHANGELOG.md parte
    // la negrita entre dos lineas, y entonces cada mitad lleva un ** suelto que
    // ninguna de las dos llamadas puede emparejar.
    const flushItem = () => {
        if (item !== null) { html.push("<li>" + inline(item) + "</li>"); item = null; }
    };
    const flushPara = () => {
        if (para.length) {
            html.push("<p>" + inline(para.join(" ")) + "</p>");
            para = [];
        }
    };
    const closeList = () => {
        flushItem();
        if (inList) { html.push("</ul>"); inList = false; }
    };

    for (let i = 0; i < lines.length; i++) {
        const raw  = lines[i];
        const line = raw.trim();

        // Continuacion de un item de lista: linea indentada que no abre item.
        if (item !== null && /^\s{2,}\S/.test(raw) && !/^\s*-\s/.test(raw)) {
            item += " " + line;
            continue;
        }

        if (!line || line === "---") { flushPara(); closeList(); continue; }

        let m;
        if ((m = /^##\s+\[([^\]]+)\]\s*[—-]\s*(.+)$/.exec(line))) {
            flushPara(); closeList();
            html.push('<h2 id="v' + esc(m[1]) + '">' + esc(m[1]) +
                ' <span class="date">' + esc(m[2]) + "</span></h2>");
            continue;
        }
        if ((m = /^##\s+(.+)$/.exec(line))) {
            flushPara(); closeList();
            html.push("<h2>" + inline(m[1]) + "</h2>");
            continue;
        }
        if ((m = /^###\s+(.+)$/.exec(line))) {
            flushPara(); closeList();
            html.push('<h3 class="kind kind-' +
                m[1].toLowerCase().replace(/[^a-z]/g, "") + '">' + inline(m[1]) + "</h3>");
            continue;
        }
        if (/^#\s+/.test(line)) { flushPara(); closeList(); continue; }
        if ((m = /^-\s+(.+)$/.exec(line))) {
            flushPara(); flushItem();
            if (!inList) { html.push("<ul>"); inList = true; }
            item = m[1];
            continue;
        }
        closeList();
        para.push(line);
    }
    flushPara(); closeList();
    return html.join("\n  ");
}

function main() {
    const md      = fs.readFileSync(SRC, "utf8");
    const pbiviz  = JSON.parse(fs.readFileSync(path.join(ROOT, "pbiviz.json"), "utf8"));
    const version = pbiviz.visual.version;
    const body    = render(md);

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Changelog — Risk Matrix Pro | TCViz</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #3D3929; line-height: 1.7; background: #FAF9F5; }
    h1 { font-size: 28px; color: #B05730; margin-bottom: 4px; }
    h2 { font-size: 21px; margin-top: 44px; color: #C96442; border-bottom: 1px solid #DAD9D4; padding-bottom: 6px; }
    h2 .date { font-size: 13px; font-weight: 400; color: #83827D; margin-left: 8px; }
    h3.kind { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px; color: #535146; }
    h3.kind-fixed { color: #B05730; }
    h3.kind-added { color: #4B7A4E; }
    h3.kind-removed { color: #83827D; }
    a { color: #B05730; }
    code { background: #EDE9DE; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    ul { padding-left: 22px; }
    li { margin-bottom: 10px; }
    footer { margin-top: 60px; font-size: 12px; color: #83827D; border-top: 1px solid #DAD9D4; padding-top: 16px; }
    .meta { font-size: 14px; color: #535146; }
  </style>
</head>
<body>
  <h1>Changelog — Risk Matrix Pro</h1>
  <p class="meta">Current version <strong>${version}</strong> &nbsp;|&nbsp;
    <a href="support.html">Support</a> &nbsp;|&nbsp;
    <a href="mailto:support@tcviz.com">support@tcviz.com</a></p>

  ${body}

  <footer>
    Generated from CHANGELOG.md by scripts/gen-changelog.js — do not edit this file by hand.<br />
    &copy; 2026 TCViz. &nbsp;|&nbsp;
    <a href="privacy.html">Privacy Policy</a> &nbsp;|&nbsp;
    <a href="terms.html">Terms of Use</a>
  </footer>
</body>
</html>
`;

    fs.writeFileSync(OUT, page, "utf8");
    console.log(`changelog.html written (${version}, ${page.length} bytes)`);
}

main();
