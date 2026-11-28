(function () {
    "use strict";

    const gamePage = /\/works\/oden(?:\/|$)/.test(location.pathname);
    const production = location.origin === "https://sukimastock.github.io" &&
        location.pathname.startsWith("/yumaniwa-town/");
    let started = false;

    if (gamePage) {
        window.trackOdenStart = function () {
            if (started) return;
            started = true;
            const event = "Game Start: oden";
            try {
                if (!production) {
                    console.info("[ODEN Analytics]", event);
                } else if (window.parent !== window) {
                    window.parent.trackYumaniwaEvent(event, { work: "oden" });
                } else {
                    window.plausible(event);
                }
            } catch (_) {
                // Analytics must never interrupt play.
            }
        };
    }

    if (!production || window.parent !== window) return;
    window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible.init = window.plausible.init || function (options) {
        window.plausible.o = options || {};
    };
    window.plausible.init();

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://plausible.io/js/pa-sYe-y0PqpZapFe6FJVlK2.js";
    document.head.appendChild(script);
})();
