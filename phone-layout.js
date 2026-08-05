/* ==========================================
   湯間庭町 / 縦長ゲーム表示器 + スマホ用バー自動収納

   - MIDNIGHT COLA / Yakitori Wars は、iPad・PCでは iPhone相当の
     縦長画面として中央に置く。
   - iPhoneなど小さいタッチ画面では、店名バーを読み込み直後だけ表示。
     少しすると上へ収納し、ゲームのための高さを返す。
   - 収納後は左上の小さなタブを押すと、店名バーを再表示できる。
   - 触れるらくがき（soft / standard）は対象外。
   ========================================== */
(function () {
    "use strict";

    var PHONE_LAYOUTS = {
        "phone-cola": { width: 360, height: 660 },
        "phone-yakitori": { width: 360, height: 660 }
    };

    var INITIAL_VISIBLE_MS = 2600;
    var REVEAL_VISIBLE_MS = 4200;

    var playerLayer = document.getElementById("work-player");
    var controls = document.getElementById("work-player-controls");
    var content = document.getElementById("work-player-content");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");
    var peekTab = document.getElementById("work-player-peek-tab");

    if (!playerLayer || !controls || !content || !frame || !loading || !peekTab) return;

    var hideTimer = null;

    function getLayout() {
        return PHONE_LAYOUTS[playerLayer.dataset.frameMode] || null;
    }

    function isSmallTouchScreen() {
        var shortSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);
        var hasTouch = (
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
            (navigator.maxTouchPoints || 0) > 0
        );
        return hasTouch && shortSide > 0 && shortSide <= 700;
    }

    function isCompactPhoneGame() {
        return (
            playerLayer.classList.contains("visible") &&
            playerLayer.dataset.playerLayout === "phone" &&
            !!getLayout() &&
            isSmallTouchScreen()
        );
    }

    function clearHideTimer() {
        if (hideTimer) {
            window.clearTimeout(hideTimer);
            hideTimer = null;
        }
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

        var horizontalPadding = playerLayer.classList.contains("phone-controls-hidden") ? 8 : 24;
        var verticalPadding = playerLayer.classList.contains("phone-controls-hidden") ? 6 : 24;
        var availableWidth = Math.max(1, content.clientWidth - horizontalPadding);
        var availableHeight = Math.max(1, content.clientHeight - verticalPadding);
        var maxScale = isSmallTouchScreen() ? 1 : 1.35;
        var scale = Math.min(
            maxScale,
            availableWidth / layout.width,
            availableHeight / layout.height
        );

        var width = Math.max(1, Math.floor(layout.width * scale));
        var height = Math.max(1, Math.floor(layout.height * scale));

        content.classList.add("phone-layout-active");
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

    function requestLayoutUpdate() {
        window.requestAnimationFrame(function () {
            if (typeof window.updateWorkPlayerLayoutSize === "function") {
                window.updateWorkPlayerLayoutSize();
            }
            applyPhoneLayout();
        });
    }

    function setControlsHidden(hidden) {
        if (hidden && !isCompactPhoneGame()) hidden = false;

        var nextHidden = !!hidden;
        if (playerLayer.classList.contains("phone-controls-hidden") !== nextHidden) {
            playerLayer.classList.toggle("phone-controls-hidden", nextHidden);
        }
        peekTab.hidden = !nextHidden;
        requestLayoutUpdate();
    }

    function scheduleHide(delay) {
        clearHideTimer();

        if (!isCompactPhoneGame() || loading.classList.contains("visible")) {
            return;
        }

        hideTimer = window.setTimeout(function () {
            if (isCompactPhoneGame() && !loading.classList.contains("visible")) {
                setControlsHidden(true);
            }
        }, delay || INITIAL_VISIBLE_MS);
    }

    function showControlsForAWhile(delay) {
        if (!isCompactPhoneGame()) return;
        setControlsHidden(false);
        scheduleHide(delay || REVEAL_VISIBLE_MS);
    }

    function resetForNewPlayerState() {
        clearHideTimer();

        if (!isCompactPhoneGame()) {
            setControlsHidden(false);
            return;
        }

        if (loading.classList.contains("visible")) {
            setControlsHidden(false);
            return;
        }

        setControlsHidden(false);
        scheduleHide(INITIAL_VISIBLE_MS);
    }

    peekTab.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showControlsForAWhile(REVEAL_VISIBLE_MS);
    });

    controls.addEventListener("pointerdown", function () {
        if (isCompactPhoneGame()) clearHideTimer();
    }, { passive: true });

    controls.addEventListener("pointerup", function () {
        if (isCompactPhoneGame()) scheduleHide(REVEAL_VISIBLE_MS);
    }, { passive: true });

    var lastVisible = playerLayer.classList.contains("visible");
    var lastFrameMode = playerLayer.dataset.frameMode || "";
    var lastPlayerLayout = playerLayer.dataset.playerLayout || "";

    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
            var visible = playerLayer.classList.contains("visible");
            var frameMode = playerLayer.dataset.frameMode || "";
            var playerLayout = playerLayer.dataset.playerLayout || "";
            var playerStateChanged = (
                visible !== lastVisible ||
                frameMode !== lastFrameMode ||
                playerLayout !== lastPlayerLayout
            );

            lastVisible = visible;
            lastFrameMode = frameMode;
            lastPlayerLayout = playerLayout;

            applyPhoneLayout();
            if (playerStateChanged) {
                resetForNewPlayerState();
            }
        });
    });

    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class", "data-frame-mode", "data-player-layout"]
    });

    var loadingObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () {
            applyPhoneLayout();
            resetForNewPlayerState();
        });
    });

    loadingObserver.observe(loading, {
        attributes: true,
        attributeFilter: ["class"]
    });

    if (typeof ResizeObserver !== "undefined") {
        var resizeObserver = new ResizeObserver(function () {
            applyPhoneLayout();
        });
        resizeObserver.observe(content);
    }

    window.addEventListener("resize", function () {
        applyPhoneLayout();
    });

    window.addEventListener("orientationchange", function () {
        window.setTimeout(function () {
            applyPhoneLayout();
        }, 120);
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            clearHideTimer();
        } else if (isCompactPhoneGame()) {
            resetForNewPlayerState();
        }
    });

    window.requestAnimationFrame(function () {
        applyPhoneLayout();
        resetForNewPlayerState();
    });

    (function installItchLoadGuard() {
        if (
            typeof window.openWorkPlayer !== "function" ||
            typeof window.closeWorkPlayer !== "function"
        ) {
            return;
        }

        var openWorkPlayerBase = window.openWorkPlayer;
        var closeWorkPlayerBase = window.closeWorkPlayer;
        var pendingOpenTimer = null;
        var lastItchOpenAt = 0;
        var ITCH_OPEN_GAP_MS = 1200;

        function clearPendingOpen() {
            if (pendingOpenTimer) {
                window.clearTimeout(pendingOpenTimer);
                pendingOpenTimer = null;
            }
        }

        function getWorkSource(work) {
            if (!work) return "";
            return work.embedUrl || work.entry || work.url || "";
        }

        function isItchWork(work) {
            return /^https:\/\/itch\.io\/embed-upload\//i.test(
                String(getWorkSource(work))
            );
        }

        window.openWorkPlayer = function(work) {
            var context = this;
            var args = arguments;

            clearPendingOpen();

            if (!isItchWork(work)) {
                return openWorkPlayerBase.apply(context, args);
            }

            var elapsed = Date.now() - lastItchOpenAt;
            var delay = Math.max(0, ITCH_OPEN_GAP_MS - elapsed);

            var runOpen = function() {
                pendingOpenTimer = null;
                lastItchOpenAt = Date.now();
                openWorkPlayerBase.apply(context, args);
            };

            if (delay > 0) {
                pendingOpenTimer = window.setTimeout(runOpen, delay);
                return;
            }

            runOpen();
        };

        window.closeWorkPlayer = function() {
            clearPendingOpen();
            return closeWorkPlayerBase.apply(this, arguments);
        };
    })();
})();
