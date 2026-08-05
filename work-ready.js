/* ==========================================
   湯間庭町 / 外部作品の準備完了ブリッジ

   readySignal: true の作品だけ、iframe の load ではなく
   子作品から届く yumaniwa:work-ready を待ってから
   町側のローディング表示を閉じる。
   ========================================== */
(function () {
    "use strict";

    var TYPE_WORK_READY = "yumaniwa:work-ready";
    var FALLBACK_MS = 20000;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");
    var loadingLabel = document.getElementById("work-player-loading-label");

    if (!playerLayer || !frame || !loading) return;

    var waiting = false;
    var waitingWorkId = "";
    var fallbackTimer = null;

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

    function showLoading(label) {
        if (label && loadingLabel) {
            loadingLabel.textContent = label;
        }

        playerLayer.classList.add("is-loading");
        loading.classList.add("visible");
        loading.setAttribute("aria-hidden", "false");
    }

    function hideLoading() {
        playerLayer.classList.remove("is-loading");
        loading.classList.remove("visible");
        loading.setAttribute("aria-hidden", "true");
    }

    function clearFallback() {
        if (fallbackTimer !== null) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    }

    function stopWaiting(hide) {
        waiting = false;
        waitingWorkId = "";
        clearFallback();

        if (hide) {
            hideLoading();
        }
    }

    function beginWaiting() {
        var work = getCurrentWork();

        if (
            !isPlayerOpen() ||
            !work ||
            work.readySignal !== true
        ) {
            stopWaiting(false);
            return;
        }

        clearFallback();
        waiting = true;
        waitingWorkId = String(work.id || window.currentWorkId || "");

        showLoading(
            work.readyLabel ||
            work.openingLabel ||
            "作品を準備しています…"
        );

        fallbackTimer = window.setTimeout(function () {
            /*
             * 通知が届かない古いビルドや通信不調でも、
             * 永久に町側の幕を残さない。
             */
            stopWaiting(true);
        }, FALLBACK_MS);
    }

    /*
     * main.js は iframe load の直後にローディングを閉じる。
     * readySignal 対象の待機中だけ、閉じられたクラスを即座に戻す。
     */
    var loadingObserver = new MutationObserver(function () {
        if (
            waiting &&
            isPlayerOpen() &&
            !loading.classList.contains("visible")
        ) {
            showLoading();
        }
    });

    loadingObserver.observe(loading, {
        attributes: true,
        attributeFilter: ["class", "aria-hidden"]
    });

    frame.addEventListener("load", function () {
        if (!isPlayerOpen()) return;

        beginWaiting();

        /* main.js 側の120ms後処理より後でも幕を維持する。 */
        window.setTimeout(function () {
            if (waiting && isPlayerOpen()) {
                showLoading();
            }
        }, 180);
    });

    window.addEventListener("message", function (event) {
        var data = event.data;

        if (
            !waiting ||
            !data ||
            typeof data !== "object" ||
            data.type !== TYPE_WORK_READY
        ) {
            return;
        }

        if (
            data.workId &&
            waitingWorkId &&
            String(data.workId) !== waitingWorkId
        ) {
            return;
        }

        stopWaiting(true);
    });

    var playerObserver = new MutationObserver(function () {
        if (!isPlayerOpen()) {
            stopWaiting(false);
        }
    });

    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class"]
    });
})();
