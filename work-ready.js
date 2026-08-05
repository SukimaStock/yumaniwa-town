/* ==========================================
   湯間庭町 / itch.io 手動再読み込み

   itch.io の埋め込み結果は外側ページから内容を判定できないため、
   読み込み完了の自動判定やエラー表示は行わない。

   429 や一時的な読み込み失敗が見えた場合だけ、
   上部メニューの「再読込」からゲームiframeを読み直す。
   ========================================== */
(function () {
    "use strict";

    var RETRY_GAP_MS = 4000;
    var BLANK_WAIT_MS = 700;

    var playerLayer = document.getElementById("work-player");
    var controls = document.getElementById("work-player-controls");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");
    var loadingLabel = document.getElementById("work-player-loading-label");
    var sourceButton = document.getElementById("btn-open-frame-source");

    if (!playerLayer || !controls || !frame) return;

    var lastRetryAt = 0;
    var retrying = false;
    var enableTimer = null;

    var retryButton = createRetryButton();

    function createRetryButton() {
        var style = document.createElement("style");
        style.id = "yumaniwa-work-retry-style";
        style.textContent = [
            "#yumaniwa-work-retry[hidden]{display:none!important}",
            "#yumaniwa-work-retry{flex:0 0 auto;min-width:54px;height:36px;padding:0 9px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:11px;font-weight:700;letter-spacing:.02em;white-space:nowrap;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
            "#yumaniwa-work-retry:active{transform:translateY(1px)}",
            "#yumaniwa-work-retry:disabled{opacity:.42;transform:none}",
            "#work-player.phone-controls-hidden #yumaniwa-work-retry{display:none!important}"
        ].join("");
        document.head.appendChild(style);

        var button = document.createElement("button");
        button.id = "yumaniwa-work-retry";
        button.type = "button";
        button.hidden = true;
        button.textContent = "再読込";
        button.setAttribute("aria-label", "ゲームを再読み込み");
        button.addEventListener("click", retryCurrentWork);

        controls.insertBefore(button, sourceButton || null);
        return button;
    }

    function isPlayerOpen() {
        return playerLayer.classList.contains("visible");
    }

    function getCurrentWork() {
        if (
            typeof window.getWorkById !== "function" ||
            !window.currentWorkId
        ) {
            return null;
        }

        return window.getWorkById(window.currentWorkId);
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

    function clearEnableTimer() {
        if (enableTimer !== null) {
            window.clearTimeout(enableTimer);
            enableTimer = null;
        }
    }

    function resetButton() {
        clearEnableTimer();
        retrying = false;
        retryButton.disabled = false;
        retryButton.textContent = "再読込";
        retryButton.setAttribute("aria-label", "ゲームを再読み込み");
    }

    function updateButtonVisibility() {
        var work = getCurrentWork();
        var visible = isPlayerOpen() && isItchWork(work);

        retryButton.hidden = !visible;

        if (!visible) {
            resetButton();
        }
    }

    function showTownLoading(label) {
        if (!loading) return;

        if (label && loadingLabel) {
            loadingLabel.textContent = label;
        }

        playerLayer.classList.add("is-loading");
        loading.classList.add("visible");
        loading.setAttribute("aria-hidden", "false");
    }

    function scheduleButtonEnable() {
        clearEnableTimer();

        var remaining = Math.max(
            0,
            RETRY_GAP_MS - (Date.now() - lastRetryAt)
        );

        enableTimer = window.setTimeout(function () {
            enableTimer = null;
            retrying = false;
            retryButton.disabled = false;
            retryButton.textContent = "再読込";
            retryButton.setAttribute("aria-label", "ゲームを再読み込み");
            updateButtonVisibility();
        }, remaining);
    }

    function retryCurrentWork(event) {
        event.preventDefault();
        event.stopPropagation();

        var work = getCurrentWork();
        var source = getWorkSource(work);

        if (
            !isPlayerOpen() ||
            !isItchWork(work) ||
            !source ||
            retrying
        ) {
            return;
        }

        var now = Date.now();
        if (now - lastRetryAt < RETRY_GAP_MS) {
            retryButton.disabled = true;
            scheduleButtonEnable();
            return;
        }

        lastRetryAt = now;
        retrying = true;
        retryButton.disabled = true;
        retryButton.textContent = "読込中";
        retryButton.setAttribute("aria-label", "ゲームを再読み込みしています");

        showTownLoading("仕込み場を開けています…");
        frame.src = "about:blank";

        window.setTimeout(function () {
            if (
                !isPlayerOpen() ||
                String(window.currentWorkId || "") !== String(work.id || "")
            ) {
                resetButton();
                updateButtonVisibility();
                return;
            }

            frame.src = source;
            scheduleButtonEnable();
        }, BLANK_WAIT_MS);
    }

    var playerObserver = new MutationObserver(function () {
        window.requestAnimationFrame(updateButtonVisibility);
    });

    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: [
            "class",
            "data-frame-mode",
            "data-player-layout"
        ]
    });

    frame.addEventListener("load", function () {
        window.requestAnimationFrame(updateButtonVisibility);
    });

    window.requestAnimationFrame(updateButtonVisibility);
})();
