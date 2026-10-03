// 湯間庭町 / 開発機能の公開環境ゲート
// staging だけON。本番ではqueryにかかわらず開発機能を起動しない。
(function () {
    var path = window.location.pathname || "";
    var isStaging =
        path === "/yumaniwa-town-staging" ||
        path.indexOf("/yumaniwa-town-staging/") === 0;

    var enabled = isStaging;

    if (typeof DEV_MODE_ENABLED !== "undefined") {
        DEV_MODE_ENABLED = enabled;
    }

    // Production HTML contains no entry button, including before scripts load.
    // Keep shared staging use working without duplicating its existing button.
    if (enabled && !document.getElementById('btn-debug-toggle')) {
        var panel = document.getElementById('editor-panel');
        if (panel && panel.parentNode) {
            var button = document.createElement('button');
            button.id = 'btn-debug-toggle';
            button.type = 'button';
            button.textContent = '開発';
            panel.parentNode.insertBefore(button, panel);
        }
    }

    if (!enabled || typeof window.getTriggerFormValues !== 'function') return;

    function sanitizeSceneId(value) {
        var id = String(value || 'scene')
            .replace(/_map$/i, '')
            .replace(/[^A-Za-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return id || 'scene';
    }

    function triggerIdExists(id) {
        var needle = String(id || '');
        if (!needle) return false;

        if (Array.isArray(window.triggers)) {
            for (var i = 0; i < window.triggers.length; i++) {
                var trigger = window.triggers[i];
                if (trigger && String(trigger.id || '') === needle) return true;
            }
        }

        return false;
    }

    function makeAutoTriggerId() {
        var base = sanitizeSceneId(window.currentScene) + '_trigger';
        var index = 1;
        var candidate = base + '_' + index;

        while (triggerIdExists(candidate)) {
            index += 1;
            candidate = base + '_' + index;
        }
        return candidate;
    }

    var baseGetTriggerFormValues = window.getTriggerFormValues;
    window.getTriggerFormValues = function () {
        var values = baseGetTriggerFormValues.apply(this, arguments) || {};
        var id = String(values.id || '').trim();
        var isCreating =
            typeof window.editingTriggerIndex !== 'number' ||
            window.editingTriggerIndex < 0;

        if (
            isCreating &&
            (!id || id === 'new_trigger' || triggerIdExists(id))
        ) {
            id = makeAutoTriggerId();
            values.id = id;

            var idInput = document.getElementById('trigger-id');
            if (idInput) idInput.value = id;
        }

        return values;
    };

    function prepareIdField() {
        var input = document.getElementById('trigger-id');
        if (!input) return;
        if (input.value === 'new_trigger') input.value = '';
        input.placeholder = '自動';
        input.autocomplete = 'off';
    }

    prepareIdField();
    window.addEventListener('load', prepareIdField);
})();
