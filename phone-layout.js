/* ==========================================
   湯間庭町 / 縦長ゲーム表示器
   MIDNIGHT COLA と Yakitori Wars を、
   iPad・PCでは iPhone相当の縦長画面として中央に置く。
   触れるらくがき（soft / standard）は変更しない。
   ========================================== */
(function () {
    "use strict";

    var PHONE_LAYOUTS = {
        "phone-cola": {
            width: 390,
            height: 864
        },
        "phone-yakitori": {
            width: 360,
            height: 660
        }
    };

    var playerLayer = document.getElementById("work-player");
    var content = document.getElementById("work-player-content");
    var frame = document.getElementById("work-player-frame");

    if (!playerLayer || !content || !frame) return;

    function getLayout() {
        return PHONE_LAYOUTS[playerLayer.dataset.frameMode] || null;
    }

    function clearPhoneLayout() {
        content.classList.remove("phone-layout-active");
        frame.style.removeProperty("position");
        frame.style.removeProperty("inset");
        frame.style.removeProperty("width");
        frame.style.removeProperty("height");
        frame.style.removeProperty("max-width");
        frame.style.removeProperty("max-height");
        frame.style.removeProperty("flex");
        frame.style.removeProperty("box-shadow");
        frame.style.removeProperty("background");
    }

    function applyPhoneLayout() {
        var layout = getLayout();

        if (!layout || !playerLayer.classList.contains("visible")) {
            clearPhoneLayout();
            return;
        }

        // 額縁の内側に少し余白を残し、iPhone幅を超える時だけ縮小する。
        var horizontalPadding = 24;
        var verticalPadding = 24;
        var availableWidth = Math.max(1, content.clientWidth - horizontalPadding);
        var availableHeight = Math.max(1, content.clientHeight - verticalPadding);
        var scale = Math.min(
            1,
            availableWidth / layout.width,
            availableHeight / layout.height
        );

        var width = Math.max(1, Math.floor(layout.width * scale));
        var height = Math.max(1, Math.floor(layout.height * scale));

        content.classList.add("phone-layout-active");

        // style.css の全画面 iframe 指定を、この二作品だけ上書きする。
        frame.style.position = "relative";
        frame.style.inset = "auto";
        frame.style.width = width + "px";
        frame.style.height = height + "px";
        frame.style.maxWidth = "none";
        frame.style.maxHeight = "none";
        frame.style.flex = "0 0 auto";
        frame.style.background = "#080a0d";
        frame.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.44)";
    }

    // openWorkPlayer が frameMode を切り替えた直後と、閉じた直後に追従する。
    var observer = new MutationObserver(function () {
        window.requestAnimationFrame(applyPhoneLayout);
    });

    observer.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-frame-mode"]
    });

    if (typeof ResizeObserver !== "undefined") {
        var resizeObserver = new ResizeObserver(function () {
            applyPhoneLayout();
        });
        resizeObserver.observe(content);
    }

    window.addEventListener("resize", applyPhoneLayout);
    window.addEventListener("orientationchange", function () {
        window.setTimeout(applyPhoneLayout, 80);
    });

    window.requestAnimationFrame(applyPhoneLayout);
})();
