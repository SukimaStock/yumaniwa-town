/* ==========================================
   湯間庭町 / 外部作品の準備完了ブリッジ

   readySignal: true の作品だけ、iframe の load ではなく
   子作品から届く yumaniwa:work-ready を待ってから
   町側のローディング表示を閉じる。
   ========================================== */
(function () {
    "use strict";

    var TYPE_WORK_READY = "yumaniwa:work-ready";
    var FALLBACK_MS = 8500;
    var READY_BUFFER_MS = 15000;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");

    if (!playerLayer || !frame || !loading) return;

    var waiting = false;
    var waitingWorkId = "";
    var fallbackTimer = null;
    var readySignals = Object.create(null);

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

    function showLoading() {
        /*
         * 文言は main.js が作品ごとに設定したものをそのまま使う。
         * このブリッジでは別の文言へ上書きしない。
         */
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

    function rememberReady(workId) {
        var id = String(workId || window.currentWorkId || "");
        if (!id) return;
        readySignals[id] = Date.now();
    }

    function consumeRecentReady(workId) {
        var id = String(workId || "");
        if (!id || !readySignals[id]) return false;

        var age = Date.now() - readySignals[id];
        delete readySignals[id];
        return age >= 0 && age <= READY_BUFFER_MS;
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

        /*
         * itch.io の外側iframeが load する前に、内側ゲームから
         * 準備完了通知が届くことがある。その通知を捨てずに使う。
         */
        if (consumeRecentReady(waitingWorkId)) {
            stopWaiting(true);
            return;
        }

        showLoading();

        fallbackTimer = window.setTimeout(function () {
            /*
             * 通知が届かない古いビルドや通信不調でも、
             * 長時間待たせず町側の幕を外す。
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
            !data ||
            typeof data !== "object" ||
            data.type !== TYPE_WORK_READY
        ) {
            return;
        }

        var signalWorkId = String(
            data.workId || window.currentWorkId || ""
        );

        rememberReady(signalWorkId);

        if (!waiting) return;

        if (
            signalWorkId &&
            waitingWorkId &&
            signalWorkId !== waitingWorkId
        ) {
            return;
        }

        if (waitingWorkId) {
            delete readySignals[waitingWorkId];
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
