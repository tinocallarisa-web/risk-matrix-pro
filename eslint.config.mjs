import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";

export default [
    powerbiVisualsConfigs.configs.recommended,
    {
        // build-test.js is a local Node build script, not visual code: it never ships inside the
        // .pbiviz, so the visual security rules (child_process, console) do not apply to it.
        ignores: [
            "node_modules/**",
            "dist/**",
            ".vscode/**",
            ".tmp/**",
            "build-test.js",
            "webpack.statistics*.html", "scripts/**"],
    },
];
