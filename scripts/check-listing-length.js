// Mide los textos que se pegan en Partner Center y YouTube contra sus limites reales.
//
//   node scripts/check-listing-length.js
//
// Los campos cortan en silencio (medido en Waterfall, 2026-09-12): Description a 5.000,
// notas de certificacion a 2.500, resumen de busqueda a 100. Se mide tambien con saltos
// de linea CRLF, porque al pegar desde Windows pueden contar doble. Sale con codigo 1
// si algo se pasa.

const fs = require("fs");
const path = require("path");
const DOCS = path.join(__dirname, "..", "docs");
let failed = false;

function report(label, text, max) {
    const lf = text.replace(/\r\n/g, "\n");
    const crlf = lf.length + (lf.match(/\n/g) || []).length;
    const over = crlf > max;
    if (over) { failed = true; }
    console.log(`  ${String(lf.length).padStart(5)} (${crlf} CRLF) / ${max}  ${over ? "SE PASA" : "ok     "}  ${label}`);
}

const listing = fs.readFileSync(path.join(DOCS, "APPSOURCE-LISTING.md"), "utf8").replace(/\r\n/g, "\n");
const FENCE = /\n## ([^\n]+)\n\n```\n([\s\S]*?)\n```\n/g;
console.log("APPSOURCE-LISTING.md");
let m;
while ((m = FENCE.exec(listing)) !== null) {
    const max = /summary/i.test(m[1]) ? 100 : /name/i.test(m[1]) ? 50 : 5000;
    report(m[1], m[2], max);
}

console.log("CERTIFICATION-NOTES-SHORT.txt");
report("notes", fs.readFileSync(path.join(DOCS, "CERTIFICATION-NOTES-SHORT.txt"), "utf8").trimEnd(), 2500);

console.log("YOUTUBE-TAGS.txt");
report("tags", fs.readFileSync(path.join(DOCS, "YOUTUBE-TAGS.txt"), "utf8").trim(), 500);

process.exit(failed ? 1 : 0);
