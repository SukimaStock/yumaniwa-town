/* ==========================================
   湯間庭町 / itch.io 読み込み回復

   - ゲーム表示は main.js の通常タイミングに任せ、長時間止めない。
   - ゲームから yumaniwa:work-ready が届けば、回復案内を隠す。
   - 数秒たっても準備完了通知がない時だけ、小さな再読込案内を出す。
   - 再読込はゲームiframeだけを対象にし、町全体は更新しない。
   ========================================== */
(function () {
    "use strict";

    var TYPE_WORK_READY = "yumaniwa:work-ready";
    var HINT_DELAY_MS = 5200;
    var RETRY_GAP_MS = 4000;
    var BLANK_WAIT_MS = 700;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var loading = document.getElementById("work-player-loading");
    var loadingLabel = document.getElementById("work-player-loading-label");

    if (!playerLayer || !frame) return;

    var hintTimer = null;
    var loadToken = 0;
    var retrying = false;
    var lastRetryAt = 0;
    var activeWorkId = "";

    var ui = createRecoveryUI();

    function createRecoveryUI() {
        var style = document.createElement("style");
        style.id = "yumaniwa-work-recovery-style";
        style.textContent = [
            "#yumaniwa-work-recovery[hidden]{display:none!important}",
            "#yumaniwa-work-recovery{position:absolute;z-index:32;top:max(66px,calc(env(safe-area-inset-top) + 58px));right:max(10px,env(safe-area-inset-right));width:min(210px,calc(100% - 20px));padding:11px;box-sizing:border-box;border:1px solid rgba(255,255,255,.20);border-radius:14px;background:rgba(14,19,25,.94);box-shadow:0 10px 28px rgba(0,0,0,.42);color:#fff;text-align:left;touch-action:manipulation;-webkit-tap-highlight-color:transparent}",
            ".yumaniwa-work-recovery-text{font-size:12px;line-height:1.55;color:rgba(255,255,255,.82)}",
            ".yumaniwa-work-recovery-actions{display:flex;align-items:center;gap:8px;margin-top:9px}",
            "#yumaniwa-work-retry{flex:1;min-height:38px;padding:7px 10px;border:1px solid rgba(255,255,255,.20);border-radius:10px;background:#f0b35d;color:#2a160a;font-size:12px;font-weight:700}",
            "#yumaniwa-work-retry:disabled{opacity:.48}",
            "#yumaniwa-work-recovery-close{flex:0 0 auto;min-height:38px;padding:7px 9px;border:0;background:transparent;color:rgba(255,255,255,.65);font-size:12px}",
            "#work-player.phone-controls-hidden #yumaniwa-work-recovery{top:max(12px,env(safe-area-inset-top))}"
        ].join("");
        document.head.appendChild(style);

        var panel = document.createElement("div");
        panel.id = "yumaniwa-work-recovery";
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        panel.innerHTML = [
            '<div class="yumaniwa-work-recovery-text" id="yumaniwa-work-recovery-text">読み込みに時間がかかっています。</div>',
            '<div class="yumaniwa-work-recovery-actions">',
            '  <button id="yumaniwa-work-retry" type="button">再読み込み</button>',
            '  <button id="yumaniwa-work-recovery-close" type="button">閉じる</button>',
            '</div>'
        ].join("");
        playerLayer.appendChild(panel);

        var result = {
            panel: panel,
            text: document.getElementById("yumaniwa-work-recovery-text"),
            retryButton: document.getElementById("yumaniwa-work-retry"),
            closeButton: document.getElementById("yumaniwa-work-recovery-close")
        };

        result.retryButton.addEventListener("click", retryCurrentWork);
        result.closeButton.addEventListener("click", hideRecovery);
        return result;
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

    function clearHintTimer() {
        if (hintTimer !== null) {
            window.clearTimeout(hintTimer);
            hintTimer = null;
        }
    }

    function hideRecovery() {
        clearHintTimer();
        ui.panel.hidden = true;
        ui.panel.setAttribute("aria-hidden", "true");
        ui.retryButton.disabled = false;
        ui.text.textContent = "読み込みに時間がかかっています。";
    }

    function showRecovery() {
        if (!isPlayerOpen() || retrying) return;
        var work = getCurrentWork();
        if (!isItchWork(work)) return;

        ui.panel.hidden = false;
        ui.panel.setAttribute("aria-hidden", "false");
    }

    function scheduleRecoveryHint() {
        clearHintTimer();
        hideRecovery();

        var work = getCurrentWork();
        if (!isPlayerOpen() || !isItchWork(work)) return;

        activeWorkId = String(work.id || window.currentWorkId || "");
        var token = ++loadToken;

        hintTimer = window.setTimeout(function () {
            if (
                token === loadToken &&
                isPlayerOpen() &&
                String(window.currentWorkId || "") === activeWorkId
            ) {
                showRecovery();
            }
        }, HINT_DELAY_MS);
    }

    function showTownLoading(label) {
        if (!loading) return;
        if (label && loadingLabel) loadingLabel.textContent = label;
        playerLayer.classList.add("is-loading");
        loading.classList.add("visible");
        loading.setAttribute("aria-hidden", "false");
    }

    function retryCurrentWork(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        var work = getCurrentWork();
        var source = getWorkSource(work);
        if (!isPlayerOpen() || !isItchWork(work) || !source || retrying) return;

        var now = Date.now();
        var remaining = RETRY_GAP_MS - (now - lastRetryAt);
        if (remaining > 0) {
            ui.text.textContent = "少し待ってから、もう一度お試しください。";
            return;
        }

        lastRetryAt = now;
        retrying = true;
        loadToken += 1;
        clearHintTimer();

        ui.retryButton.disabled = true;
        ui.text.textContent = "ゲーム部分を読み込み直しています…";
        showTownLoading("仕込み場を開けています…");

        frame.src = "about:blank";

        window.setTimeout(function () {
            if (
                !isPlayerOpen() ||
                String(window.currentWorkId || "") !== String(work.id || "")
            ) {
                retrying = false;
                hideRecovery();
                return;
            }

            frame.src = source;
            retrying = false;
            hideRecovery();
            scheduleRecoveryHint();
        }, BLANK_WAIT_MS);
    }

    frame.addEventListener("load", function () {
        if (!isPlayerOpen()) return;
        if (!frame.src || frame.src === "about:blank") return;
        scheduleRecoveryHint();
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

        if (
            data.workId &&
            window.currentWorkId &&
            String(data.workId) !== String(window.currentWorkId)
        ) {
            return;
        }

        loadToken += 1;
        hideRecovery();
    });

    var wasOpen = isPlayerOpen();
    var playerObserver = new MutationObserver(function () {
        var open = isPlayerOpen();

        if (!open) {
            loadToken += 1;
            retrying = false;
            activeWorkId = "";
            hideRecovery();
        } else if (!wasOpen) {
            scheduleRecoveryHint();
        }

        wasOpen = open;
    });

    playerObserver.observe(playerLayer, {
        attributes: true,
        attributeFilter: ["class"]
    });
})();
