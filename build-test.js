/* eslint-disable no-console */
/**
 * Test build.
 *
 * Produces a .pbiviz for Power BI Desktop with its own GUID suffix, so it can be installed
 * alongside the AppSource build without conflicting with it.
 *
 * The source tree always stays in PRODUCTION state: this script patches, packages and then
 * restores, including on failure. Never commit a patched source.
 *
 *   node build-test.js            Pro tier forced on,          GUID + "_test"
 *   node build-test.js --free     real licence check (Free),   GUID + "_testfree"
 *   node build-test.js --debug    adds a red DBG line with viewMode / licence state (test only)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const VISUAL_TS = path.join(ROOT, "src", "visual.ts");
const PBIVIZ_JSON = path.join(ROOT, "pbiviz.json");
const forceFree = process.argv.includes("--free");
const debug = process.argv.includes("--debug");

// Debug: DBG line at the bottom-left with viewMode, licence state and the raw licence API answer
const DEBUG_ANCHOR = "const show = this.isPreview() && this.attemptedPro.length > 0;";
const DEBUG_CODE = DEBUG_ANCHOR + `
        { const o: any = this.lastOptions || {}; let d = this.target.querySelector(".rmp-dbg") as HTMLElement;
          if (!d) { d = document.createElement("div"); d.className = "rmp-dbg";
            d.style.cssText = "position:absolute;left:2px;bottom:2px;right:2px;z-index:9;font:10px sans-serif;color:#C00000;pointer-events:none;background:rgba(255,255,255,0.85);white-space:normal";
            this.target.appendChild(d); }
          d.textContent = "DBG viewMode=" + o.viewMode + " lm=" + !!this.licenseManager + " lic=" + this.licenseResolved + " unsup=" + this.licenseEnvUnsupported +
            " pro=" + this.isPro + " preview=" + this.isPreview() + " attempted=" + this.attemptedPro.join(",") + " api=" + ((this as any).dbgLic || "-") + " notify=" + ((this as any).dbgNotify || "-"); }`;
// Resultado de cada llamada de notificación: cuál acepta Power BI y cuál rechaza
const DEBUG_NOTIFY_ANCHOR = "lm.notifyFeatureBlocked?.(msg.slice(0, 500));";
const DEBUG_NOTIFY_CODE = `{ const self: any = this; const t0 = Date.now(); const rec = (tag: string) => (r: any) => { self.dbgNotify = ((self.dbgNotify || "") + " " + tag + "=" + JSON.stringify(r) + "@" + (Date.now() - t0) + "ms").slice(-300); self.updateWatermark(); };
                    self.dbgNotify = ((self.dbgNotify || "") + " | " + added.join("+")).slice(-300);
                    const p = lm.notifyFeatureBlocked?.(msg.slice(0, 500)); if (p && p.then) { p.then(rec("blocked"), rec("blockedERR")); } else { rec("blockedSync")(p); } }`;
const DEBUG_CLEAR_ANCHOR = "cleared.then(show, show);";
const DEBUG_CLEAR_CODE = "cleared.then((r: any) => { (this as any).dbgNotify = ((this as any).dbgNotify || \"\") + \" clear=\" + JSON.stringify(r); show(); }, (e: any) => { (this as any).dbgNotify = ((this as any).dbgNotify || \"\") + \" clearERR=\" + String(e); show(); });";
const DEBUG_RESULT_ANCHOR = "(result: any) => {";
const DEBUG_RESULT_CODE = DEBUG_RESULT_ANCHOR + `
                        try { (this as any).dbgLic = JSON.stringify(result).slice(0, 400); } catch (_) { (this as any).dbgLic = "unserializable"; }`;
const DEBUG_REJECT_ANCHOR = "() => { this.licenseEnvUnsupported = true; this.licenseResolved = true; });";
const DEBUG_REJECT_CODE = "(e: any) => { (this as any).dbgLic = \"REJECTED \" + String(e); this.licenseEnvUnsupported = true; this.licenseResolved = true; this.repaint(); });";

/** Exact text the patcher expects to find, and what it becomes. */
const PATCHES = [];
if (!forceFree) {
    PATCHES.push({
        find: "private isPro = false;",
        replace: "private isPro = true; // PATCHED BY build-test.js",
        why: "force the Pro tier on"
    });
}
if (debug) {
    PATCHES.push({ find: DEBUG_ANCHOR, replace: DEBUG_CODE, why: "add DBG line" });
    PATCHES.push({ find: DEBUG_RESULT_ANCHOR, replace: DEBUG_RESULT_CODE, why: "capture licence API answer" });
    PATCHES.push({ find: DEBUG_REJECT_ANCHOR, replace: DEBUG_REJECT_CODE, why: "capture licence API rejection" });
    PATCHES.push({ find: DEBUG_CLEAR_ANCHOR, replace: DEBUG_CLEAR_CODE, why: "capture clearLicenseNotification result" });
    PATCHES.push({ find: DEBUG_NOTIFY_ANCHOR, replace: DEBUG_NOTIFY_CODE, why: "capture notifyFeatureBlocked result" });
}

function fail(message) {
    console.error("\n  ✗ " + message + "\n");
    process.exit(1);
}

function main() {
    console.log("\n  Risk Matrix Pro — TEST build (" + (forceFree ? "Free, real licence" : "Pro forced") + (debug ? ", DBG" : "") + ")\n");

    const originals = {
        visualTs: fs.readFileSync(VISUAL_TS, "utf8"),
        pbivizJson: fs.readFileSync(PBIVIZ_JSON, "utf8")
    };
    const restore = () => {
        fs.writeFileSync(VISUAL_TS, originals.visualTs, "utf8");
        fs.writeFileSync(PBIVIZ_JSON, originals.pbivizJson, "utf8");
        console.log("  ↺ source restored to production state");
    };

    // ---- Verify every patch target is present before touching anything ---------------------
    for (const p of PATCHES) {
        if (originals.visualTs.indexOf(p.find) === -1) {
            fail(
                "Patch target not found in src/visual.ts:\n\n      " + p.find + "\n\n" +
                "    Update the PATCHES in build-test.js — do not change the source to fit the script."
            );
        }
    }

    const pbiviz = JSON.parse(originals.pbivizJson);
    const realGuid = pbiviz.visual.guid;
    if (/_test/.test(realGuid)) {
        fail("pbiviz.json already carries a _test GUID. Restore it before building.");
    }

    let ok = false;
    try {
        let ts = originals.visualTs;
        for (const p of PATCHES) {
            ts = ts.replace(p.find, p.replace);
            console.log("  • " + p.why);
        }
        fs.writeFileSync(VISUAL_TS, ts, "utf8");

        pbiviz.visual.guid = realGuid + (forceFree ? "_testfree" : "_test");
        pbiviz.visual.displayName = pbiviz.visual.displayName + (forceFree ? " (TEST FREE)" : " (TEST)");
        fs.writeFileSync(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 4) + "\n", "utf8");
        console.log("  • GUID " + pbiviz.visual.guid);

        console.log("\n  Packaging...\n");
        execSync("npx pbiviz package", { cwd: ROOT, stdio: "inherit" });
        ok = true;
        console.log("\n  ✓ Test build created: dist/" + pbiviz.visual.guid + "." + pbiviz.visual.version + ".pbiviz");
        console.log("    This build must never be submitted to AppSource.\n");
    } catch (err) {
        console.error("\n  ✗ Packaging failed: " + (err && err.message ? err.message : err));
    } finally {
        restore();
    }
    if (!ok) { process.exit(1); }
}

main();
