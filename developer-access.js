// 湯間庭町 / 開発機能の公開環境ゲート
// staging は常時ON、本番は ?dev=1 のときだけONにする。
(function () {
    var params = new URLSearchParams(window.location.search || "");
    var path = window.location.pathname || "";
    var isStaging =
        path === "/yumaniwa-town-staging" ||
        path.indexOf("/yumaniwa-town-staging/") === 0;

    var enabled = isStaging || params.get("dev") === "1";

    if (typeof DEV_MODE_ENABLED !== "undefined") {
        DEV_MODE_ENABLED = enabled;
    }
})();

// 開発モードのシーン書き出し安全策。
// main.js が現在認識していない将来フィールドが TOWN_SCENE_MAPS に増えても、
// 「書き出す」で消さずにそのまま保持する。
(function () {
    if (typeof DEV_MODE_ENABLED !== "undefined" && !DEV_MODE_ENABLED) return;
    if (typeof buildTownSceneDefinitionExportCode !== "function") return;
    if (buildTownSceneDefinitionExportCode.__yumaniwaPreservesUnknownFields) return;

    var baseBuildTownSceneDefinitionExportCode = buildTownSceneDefinitionExportCode;

    function clonePlainData(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function findClosingObjectBrace(text, openIndex) {
        if (!text || openIndex < 0 || text.charAt(openIndex) !== "{") return -1;
        var depth = 0;
        var quote = "";
        var escaped = false;

        for (var i = openIndex; i < text.length; i++) {
            var ch = text.charAt(i);
            if (quote) {
                if (escaped) {
                    escaped = false;
                } else if (ch === "\\") {
                    escaped = true;
                } else if (ch === quote) {
                    quote = "";
                }
                continue;
            }
            if (ch === '"' || ch === "'") {
                quote = ch;
                continue;
            }
            if (ch === "{") depth++;
            if (ch === "}") {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    var safeBuildTownSceneDefinitionExportCode = function () {
        var code = baseBuildTownSceneDefinitionExportCode.apply(this, arguments);
        try {
            var sceneId = typeof currentScene !== "undefined" ? String(currentScene || "") : "";
            var currentDefinition =
                typeof activeTownSceneDef !== "undefined" && activeTownSceneDef
                    ? activeTownSceneDef
                    : null;
            if (!sceneId || !currentDefinition || !code) return code;

            var marker = sceneId + ":";
            var markerIndex = code.indexOf(marker);
            if (markerIndex < 0) return code;

            var openIndex = code.indexOf("{", markerIndex + marker.length);
            var closeIndex = findClosingObjectBrace(code, openIndex);
            if (openIndex < 0 || closeIndex < 0) return code;

            var exportedDefinition = JSON.parse(code.slice(openIndex, closeIndex + 1));
            var mergedDefinition = clonePlainData(currentDefinition);
            Object.keys(exportedDefinition).forEach(function (key) {
                mergedDefinition[key] = exportedDefinition[key];
            });

            var mergedJson = JSON.stringify(mergedDefinition, null, 4);
            return code.slice(0, openIndex) + mergedJson + code.slice(closeIndex + 1);
        } catch (error) {
            console.error("[Yumaniwa editor] safe export merge failed", error);
            return code;
        }
    };

    safeBuildTownSceneDefinitionExportCode.__yumaniwaPreservesUnknownFields = true;
    buildTownSceneDefinitionExportCode = safeBuildTownSceneDefinitionExportCode;
})();
