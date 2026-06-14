// ==========================================
// 1. 定数・データ定義
// ==========================================
var BG_IMAGE_PATH = 'assets/yumaniwa_station_mock_clean.png';
var TILE_SIZE = 16;
var MAP_WIDTH = 48;
var MAP_HEIGHT = 32;
var PLAYER_START = { x: 24, y: 22 };

var passableRects = [
    { x: 0, y: 7, w: 48, h: 18 },
    { x: 19, y: 0, w: 10, h: 7 },
    { x: 4, y: 25, w: 6, h: 7 },
    { x: 14, y: 25, w: 20, h: 2 }
];

var blockedRects = [
    { x: 0, y: 0, w: 19, h: 7 },
    { x: 29, y: 0, w: 19, h: 11 },
    { x: 28, y: 11, w: 8, h: 6 },
    { x: 0, y: 18, w: 4, h: 14 },
    { x: 10, y: 18, w: 5, h: 14 },
    { x: 36, y: 18, w: 12, h: 14 },
    { x: 16, y: 26, w: 16, h: 6 },
    { x: 24, y: 6, w: 5, h: 1 },
    { x: 0, y: 31, w: 48, h: 1 }
];

var blockedPoints = [
    { x: 17, y: 13 }, { x: 18, y: 13 }, { x: 19, y: 13 }, { x: 20, y: 13 },
    { x: 17, y: 14 }, { x: 18, y: 14 }, { x: 19, y: 14 }, { x: 20, y: 14 },
    { x: 17, y: 15 }, { x: 18, y: 15 }, { x: 19, y: 15 },
    { x: 22, y: 13 },
    { x: 14, y: 5 }, { x: 14, y: 6 }, { x: 33, y: 5 }, { x: 33, y: 6 },
    { x: 16, y: 14 }, { x: 21, y: 15 }, { x: 26, y: 13 }, { x: 35, y: 15 },
    { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
    { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 }
];

var triggers = [
    { id: "station", area: { x: 23, y: 25, w: 2, h: 1 }, type: "inspect", text: "湯間庭駅。のんびりしたローカル線の小さな駅だ。町を歩いてみよう。" },
    { id: "tourist_info", area: { x: 29, y: 17, w: 2, h: 1 }, type: "warp", target: "tourist_info_interior", text: "観光案内所に入りますか?" },
    { id: "yumado_street", area: { x: 42, y: 11, w: 6, h: 1 }, type: "warp", target: "yumado_street_map", text: "湯窓通りへ進みますか?" },
    { id: "leisure_center", area: { x: 39, y: 24, w: 3, h: 1 }, type: "warp", target: "leisure_center_map", text: "湯窓レジャーセンターに入りますか?" },
    { id: "tomogushi_alley", area: { x: 4, y: 20, w: 6, h: 1 }, type: "warp", target: "tomogushi_alley_map", text: "灯串横丁へ入りますか?" },
    { id: "newspaper_board", area: { x: 6, y: 7, w: 4, h: 1 }, type: "menu", target: "shinpo_board", text: "湯間庭新報の掲示板だ。記事を読んでみますか?" },
    { id: "tourist_map", area: { x: 17, y: 16, w: 4, h: 1 }, type: "inspect", text: "湯間庭観光マップだ。町の見どころが載っている。" },
    { id: "onsen_construction", area: { x: 23, y: 7, w: 4, h: 1 }, type: "inspect", text: "この先、湯間庭温泉。現在整備中です。またのお越しをお待ちください。" }
];

// ==========================================
// 2. 状態管理・初期化
// ==========================================
var canvas, ctx;
var bgImage = new Image();
var bgLoaded = false;
var bgError = false;

var player = { x: PLAYER_START.x * TILE_SIZE, y: PLAYER_START.y * TILE_SIZE, w: 16, h: 16, speed: 2, dir: 'down' };
var currentScene = 'station_plaza';
var isMessageOpen = false;
var isMenuOpen = false;
var pendingWarp = null;

var debugMode = false;
var keys = {};
var dpad = { up: false, down: false, left: false, right: false };

// エディタ用状態管理
var isEditMode = false;
var editTarget = 'passableRects';
var editStep = 0; // 0: 始点待ち, 1: 終点待ち
var editStartX = 0;
var editStartY = 0;
var currentHoverTile = null;
var editHistory = [];

window.onload = function() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    bgImage.onload = function() { bgLoaded = true; };
    bgImage.onerror = function() { bgError = true; };
    bgImage.src = BG_IMAGE_PATH;

    setupEvents();
    setupEditorEvents();
    requestAnimationFrame(gameLoop);
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ==========================================
// 3. カメラ計算の共通化
// ==========================================
function getCamera() {
    var zoom = (window.innerWidth < 768) ? 2.5 : 2;
    var viewW = canvas.width / zoom;
    var viewH = canvas.height / zoom;
    var mapPixelW = MAP_WIDTH * TILE_SIZE;
    var mapPixelH = MAP_HEIGHT * TILE_SIZE;

    var cameraX = (player.x + player.w / 2) - (viewW / 2);
    var cameraY = (player.y + player.h / 2) - (viewH / 2);

    if (viewW > mapPixelW) {
        cameraX = -(viewW - mapPixelW) / 2;
    } else {
        if (cameraX < 0) cameraX = 0;
        if (cameraX > mapPixelW - viewW) cameraX = mapPixelW - viewW;
    }

    if (viewH > mapPixelH) {
        cameraY = -(viewH - mapPixelH) / 2;
    } else {
        if (cameraY < 0) cameraY = 0;
        if (cameraY > mapPixelH - viewH) cameraY = mapPixelH - viewH;
    }

    return {
        zoom: zoom,
        viewW: viewW,
        viewH: viewH,
        cameraX: cameraX,
        cameraY: cameraY,
        mapPixelW: mapPixelW,
        mapPixelH: mapPixelH
    };
}

// ==========================================
// 4. 入力イベント設定
// ==========================================
function setupEvents() {
    window.addEventListener('keydown', function(e) {
        keys[e.key] = true;
        if (e.key === 'g' || e.key === 'G' || e.key === 'd' || e.key === 'D') toggleDebugMode();
        if (e.key === 'Escape') { closeMessage(); closeMenu(); pendingWarp = null; }
        if (e.key === 'Enter' || e.key === ' ') handleActionTrigger();
    });
    window.addEventListener('keyup', function(e) { keys[e.key] = false; });

    function bindTouch(id, dir) {
        var el = document.getElementById(id);
        el.addEventListener('touchstart', function(e) { e.preventDefault(); dpad[dir] = true; }, {passive: false});
        el.addEventListener('touchend', function(e) { e.preventDefault(); dpad[dir] = false; }, {passive: false});
    }
    bindTouch('btn-up', 'up'); bindTouch('btn-down', 'down');
    bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');

    var btnAction = document.getElementById('btn-action');
    var actionFunc = function(e) { e.preventDefault(); handleActionTrigger(); };
    btnAction.addEventListener('touchstart', actionFunc, {passive: false});
    btnAction.addEventListener('click', actionFunc);

    var btnDebug = document.getElementById('btn-debug-toggle');
    if (btnDebug) {
        btnDebug.addEventListener('touchstart', function(e) { e.preventDefault(); toggleDebugMode(); }, {passive: false});
        btnDebug.addEventListener('click', function(e) { e.preventDefault(); toggleDebugMode(); });
    }

    // キャンバスタップ時の座標取得とエディタ処理
    canvas.addEventListener('pointerdown', function(e) {
        if (!debugMode && !isEditMode) return;

        var rect = canvas.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        var clickY = e.clientY - rect.top;

        var cam = getCamera();
        var worldX = (clickX / cam.zoom) + cam.cameraX;
        var worldY = (clickY / cam.zoom) + cam.cameraY;
        var tileX = Math.floor(worldX / TILE_SIZE);
        var tileY = Math.floor(worldY / TILE_SIZE);

        // マップ外なら無視
        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;

        document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;

        if (isEditMode) {
            handleEditorTap(tileX, tileY);
        } else if (debugMode) {
            currentHoverTile = { x: tileX, y: tileY };
        }
    });

    // スワイプによるプレビュー用 (指を動かした時)
    canvas.addEventListener('pointermove', function(e) {
        if (!isEditMode || editStep !== 1) return;
        var rect = canvas.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        var clickY = e.clientY - rect.top;
        var cam = getCamera();
        var worldX = (clickX / cam.zoom) + cam.cameraX;
        var worldY = (clickY / cam.zoom) + cam.cameraY;
        currentHoverTile = { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
    });
}

function handleActionTrigger() {
    if (isEditMode) return; // 編集モード中はイベント発火しない
    if (!isMessageOpen && !isMenuOpen && currentScene === 'station_plaza') {
        handleAction();
    } else if (isMessageOpen && pendingWarp) {
        changeScene(pendingWarp);
        closeMessage();
        pendingWarp = null;
    } else if (isMessageOpen) {
        closeMessage();
    }
}

function toggleDebugMode() {
    var panel = document.getElementById('editor-panel');
    var btn = document.getElementById('btn-debug-toggle');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        btn.style.display = 'none';
        debugMode = true;
        isEditMode = true;
        document.getElementById('debug-info').style.display = 'inline-block';
        updateEditorStatus("編集対象を選んでタップしてください");
    }
}

// ==========================================
// 5. エディタ機能とイベント
// ==========================================
function setupEditorEvents() {
    var btnClose = document.getElementById('btn-close-editor');
    btnClose.addEventListener('click', function() {
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('btn-debug-toggle').style.display = 'block';
        isEditMode = false;
        debugMode = false;
        document.getElementById('debug-info').style.display = 'none';
        editStep = 0;
        currentHoverTile = null;
    });

    var targetSelect = document.getElementById('edit-target');
    targetSelect.addEventListener('change', function(e) {
        editTarget = e.target.value;
        editStep = 0;
        currentHoverTile = null;
        var trigForm = document.getElementById('trigger-form');
        trigForm.style.display = (editTarget === 'triggers') ? 'block' : 'none';
        updateEditorStatus(editTarget + " を編集します");
    });

    var btnUndo = document.getElementById('btn-editor-undo');
    btnUndo.addEventListener('click', function() {
        if (editHistory.length === 0) {
            updateEditorStatus("Undoする履歴がありません");
            return;
        }
        var last = editHistory.pop();
        if (last.type === 'passableRects') passableRects.pop();
        else if (last.type === 'blockedRects') blockedRects.pop();
        else if (last.type === 'blockedPoints') blockedPoints.pop();
        else if (last.type === 'triggers') triggers.pop();
        updateEditorStatus("直前の追加を取り消しました");
        editStep = 0;
    });

    var btnExport = document.getElementById('btn-editor-export');
    btnExport.addEventListener('click', showExportModal);

    var btnCloseExp = document.getElementById('btn-close-export');
    btnCloseExp.addEventListener('click', function() { document.getElementById('export-modal').style.display = 'none'; });

    var btnCopy = document.getElementById('btn-copy-export');
    btnCopy.addEventListener('click', function() {
        var textarea = document.getElementById('export-textarea');
        textarea.select();
        try {
            document.execCommand('copy');
            btnCopy.innerText = "コピー完了!";
            setTimeout(function(){ btnCopy.innerText = "コピーする"; }, 2000);
        } catch(err) {
            alert("コピーに失敗しました。手動でコピーしてください。");
        }
    });
}

function updateEditorStatus(msg) {
    document.getElementById('editor-status').innerText = msg;
}

function handleEditorTap(tx, ty) {
    if (editTarget === 'blockedPoints') {
        // 重複チェック
        for (var i=0; i<blockedPoints.length; i++) {
            if (blockedPoints[i].x === tx && blockedPoints[i].y === ty) return;
        }
        blockedPoints.push({ x: tx, y: ty });
        editHistory.push({ type: 'blockedPoints' });
        updateEditorStatus("Point追加: (" + tx + ", " + ty + ")");
        return;
    }

    // 矩形系の編集 (passableRects, blockedRects, triggers)
    if (editStep === 0) {
        editStartX = tx;
        editStartY = ty;
        editStep = 1;
        currentHoverTile = { x: tx, y: ty };
        updateEditorStatus("終点をタップしてください");
    } else if (editStep === 1) {
        var minX = Math.min(editStartX, tx);
        var minY = Math.min(editStartY, ty);
        var w = Math.max(editStartX, tx) - minX + 1;
        var h = Math.max(editStartY, ty) - minY + 1;
        var newRect = { x: minX, y: minY, w: w, h: h };

        if (editTarget === 'passableRects') {
            passableRects.push(newRect);
            editHistory.push({ type: 'passableRects' });
        } else if (editTarget === 'blockedRects') {
            blockedRects.push(newRect);
            editHistory.push({ type: 'blockedRects' });
        } else if (editTarget === 'triggers') {
            var tType = document.getElementById('trigger-type').value;
            var tId = document.getElementById('trigger-id').value;
            var tText = document.getElementById('trigger-text').value;
            var tTarget = document.getElementById('trigger-target').value;
            triggers.push({
                id: tId, area: newRect, type: tType, target: tTarget, text: tText
            });
            editHistory.push({ type: 'triggers' });
        }

        editStep = 0;
        currentHoverTile = null;
        updateEditorStatus("追加完了。次の始点をタップ");
    }
}

function showExportModal() {
    var str = "";
    
    str += "var passableRects = [\n";
    for(var i=0; i<passableRects.length; i++) {
        var r = passableRects[i];
        str += "    { x: " + r.x + ", y: " + r.y + ", w: " + r.w + ", h: " + r.h + " }";
        if(i < passableRects.length - 1) str += ",";
        str += "\n";
    }
    str += "];\n\n";

    str += "var blockedRects = [\n";
    for(var i=0; i<blockedRects.length; i++) {
        var r = blockedRects[i];
        str += "    { x: " + r.x + ", y: " + r.y + ", w: " + r.w + ", h: " + r.h + " }";
        if(i < blockedRects.length - 1) str += ",";
        str += "\n";
    }
    str += "];\n\n";

    str += "var blockedPoints = [\n";
    for(var i=0; i<blockedPoints.length; i++) {
        var p = blockedPoints[i];
        str += "    { x: " + p.x + ", y: " + p.y + " }";
        if(i < blockedPoints.length - 1) str += ",";
        str += "\n";
    }
    str += "];\n\n";

    str += "var triggers = [\n";
    for(var i=0; i<triggers.length; i++) {
        var t = triggers[i];
        str += "    {\n";
        str += "        id: \"" + t.id + "\",\n";
        str += "        area: { x: " + t.area.x + ", y: " + t.area.y + ", w: " + t.area.w + ", h: " + t.area.h + " },\n";
        str += "        type: \"" + t.type + "\",\n";
        if (t.target) str += "        target: \"" + t.target + "\",\n";
        str += "        text: \"" + t.text + "\"\n";
        str += "    }";
        if(i < triggers.length - 1) str += ",";
        str += "\n";
    }
    str += "];\n";

    document.getElementById('export-textarea').value = str;
    document.getElementById('export-modal').style.display = 'flex';
}

// ==========================================
// 6. メインループと更新・判定
// ==========================================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (isMessageOpen || isMenuOpen || currentScene !== 'station_plaza' || isEditMode) return;

    var dx = 0; var dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up) dy -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down) dy += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left) dx -= player.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right) dx += player.speed;

    if (dx !== 0 || dy !== 0) {
        if (Math.abs(dx) > Math.abs(dy)) {
            player.dir = dx > 0 ? 'right' : 'left';
        } else {
            player.dir = dy > 0 ? 'down' : 'up';
        }

        var newX = player.x + dx;
        var newY = player.y + dy;

        if (!checkCollision(newX, player.y)) player.x = newX;
        if (!checkCollision(player.x, newY)) player.y = newY;

        if (player.x < 0) player.x = 0;
        if (player.x + player.w > MAP_WIDTH * TILE_SIZE) player.x = MAP_WIDTH * TILE_SIZE - player.w;
        if (player.y < 0) player.y = 0;
        if (player.y + player.h > MAP_HEIGHT * TILE_SIZE) player.y = MAP_HEIGHT * TILE_SIZE - player.h;
        
        updateUI();
    }
}

// プレイヤーの足元当たり判定
function getPlayerHitbox(x, y) {
    return {
        x: x + 3,
        y: y + 10,
        w: 10,
        h: 6
    };
}

function isPointInRects(px, py, rects) {
    for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        var rx = r.x * TILE_SIZE;
        var ry = r.y * TILE_SIZE;
        var rw = r.w * TILE_SIZE;
        var rh = r.h * TILE_SIZE;
        if (px >= rx && px < rx + rw && py >= ry && py < ry + rh) {
            return true;
        }
    }
    return false;
}

function checkCollision(x, y) {
    var rect = getPlayerHitbox(x, y);

    var tl = isPointInRects(rect.x, rect.y, passableRects);
    var tr = isPointInRects(rect.x + rect.w - 1, rect.y, passableRects);
    var bl = isPointInRects(rect.x, rect.y + rect.h - 1, passableRects);
    var br = isPointInRects(rect.x + rect.w - 1, rect.y + rect.h - 1, passableRects);

    if (!tl || !tr || !bl || !br) {
        return true; 
    }

    for (var i = 0; i < blockedRects.length; i++) {
        var bRect = blockedRects[i];
        var trRect = { x: bRect.x * TILE_SIZE, y: bRect.y * TILE_SIZE, w: bRect.w * TILE_SIZE, h: bRect.h * TILE_SIZE };
        if (isColliding(rect, trRect)) return true;
    }
    for (var j = 0; j < blockedPoints.length; j++) {
        var bp = blockedPoints[j];
        var tp = { x: bp.x * TILE_SIZE, y: bp.y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        if (isColliding(rect, tp)) return true;
    }

    return false;
}

function isColliding(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function handleAction() {
    var checkX = player.x;
    var checkY = player.y;
    var checkSize = TILE_SIZE;

    if (player.dir === 'up') checkY -= checkSize;
    if (player.dir === 'down') checkY += checkSize;
    if (player.dir === 'left') checkX -= checkSize;
    if (player.dir === 'right') checkX += checkSize;

    var targetRect = getPlayerHitbox(checkX, checkY);
    var pRect = getPlayerHitbox(player.x, player.y);

    for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        var tr = { 
            x: t.area.x * TILE_SIZE, y: t.area.y * TILE_SIZE, 
            w: t.area.w * TILE_SIZE, h: t.area.h * TILE_SIZE 
        };

        if (isColliding(targetRect, tr) || isColliding(pRect, tr)) {
            if (t.type === 'inspect') {
                showMessage(t.text);
            } else if (t.type === 'warp') {
                showMessage(t.text + "<br><span style='font-size:14px; color:#aaa;'>(移動します)</span>");
                pendingWarp = t.target;
            } else if (t.type === 'menu') {
                showMessage(t.text);
                openMenu(t.target);
            }
            return;
        }
    }
}

// ==========================================
// 7. UIとシーン管理
// ==========================================
function updateUI() {
    var tileX = Math.floor((player.x + player.w/2) / TILE_SIZE);
    var tileY = Math.floor((player.y + player.h/2) / TILE_SIZE);
    var sceneNameMap = { 'station_plaza': '駅前広場', 'tourist_info_interior': '観光案内所', 'yumado_street_map': '湯窓通り', 'leisure_center_map': '湯窓レジャーセンター', 'tomogushi_alley_map': '灯串横丁' };
    document.getElementById('scene-name').innerText = sceneNameMap[currentScene] || currentScene;
    if (debugMode) document.getElementById('coord-display').innerText = "現在座標: (" + tileX + ", " + tileY + ")";
}

function showMessage(text) {
    document.getElementById('message-window').innerHTML = text;
    document.getElementById('message-window').style.display = 'block';
    isMessageOpen = true;
}
function closeMessage() {
    document.getElementById('message-window').style.display = 'none';
    isMessageOpen = false;
}

function openMenu(menuId) {
    var menuWin = document.getElementById('menu-window');
    var html = '';
    if (menuId === 'shinpo_board') {
        html += '<div class="menu-item" onclick="handleMenuSelect(\'note\')">正解のないアプリばかり作っている</div>';
        html += '<div class="menu-item" onclick="handleMenuSelect(\'note\')">湯窓レジャーセンターに新しい筐体</div>';
        html += '<div class="menu-item" onclick="handleMenuSelect(\'note\')">灯串横丁、本日も営業中</div>';
    }
    html += '<div class="menu-item" style="color:#f88;" onclick="closeMenu()">閉じる</div>';
    menuWin.innerHTML = html; menuWin.style.display = 'block'; isMenuOpen = true;
}
function closeMenu() { document.getElementById('menu-window').style.display = 'none'; isMenuOpen = false; }
window.handleMenuSelect = function(type) { closeMenu(); showMessage((type === 'note') ? "この記事は現在準備中です。後日note記事へ接続予定です。" : "この筐体は準備中です。"); };

window.changeScene = function(sceneId) {
    currentScene = sceneId; updateUI();
    var sceneContainer = document.getElementById('scene-container');
    if (sceneId === 'station_plaza') { sceneContainer.style.display = 'none'; return; }
    var html = '';
    if (sceneId === 'tourist_info_interior') {
        html += '<h2>観光案内所</h2><p>湯間庭町の地図やパンフレットが置かれている。</p><button onclick="handleMenuSelect(\'note\')">湯間庭町について</button>';
    } else if (sceneId === 'yumado_street_map') {
        html += '<h2>湯窓通り</h2><p>食堂、喫茶、雑貨店が並ぶ商店街。</p>';
    } else if (sceneId === 'leisure_center_map') {
        html += '<h2>湯窓レジャーセンター</h2><p>レトロな遊技場。</p><button onclick="handleMenuSelect(\'game\')">雨の日の窓</button>';
    } else if (sceneId === 'tomogushi_alley_map') {
        html += '<h2>灯串横丁</h2><p>提灯の灯りが続く小さな横丁。</p><button onclick="handleMenuSelect(\'game\')">Yakitori Wars</button>';
    }
    html += '<br><button onclick="changeScene(\'station_plaza\')" style="margin-top:30px; background:#222;">駅前へ戻る</button>';
    sceneContainer.innerHTML = html; sceneContainer.style.display = 'block';
};

// ==========================================
// 8. 描画処理 (Canvas)
// ==========================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cam = getCamera();

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.cameraX, -cam.cameraY);

    if (bgLoaded) {
        ctx.drawImage(bgImage, 0, 0, cam.mapPixelW, cam.mapPixelH);
    } else {
        ctx.fillStyle = '#b0a080';
        ctx.fillRect(0, 0, cam.mapPixelW, cam.mapPixelH);
    }

    if (debugMode || isEditMode) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        for (var x = 0; x <= cam.mapPixelW; x += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cam.mapPixelH); ctx.stroke(); }
        for (var y = 0; y <= cam.mapPixelH; y += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cam.mapPixelW, y); ctx.stroke(); }

        ctx.fillStyle = 'rgba(0, 120, 255, 0.25)';
        for (var m = 0; m < passableRects.length; m++) ctx.fillRect(passableRects[m].x * TILE_SIZE, passableRects[m].y * TILE_SIZE, passableRects[m].w * TILE_SIZE, passableRects[m].h * TILE_SIZE);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
        for (var i = 0; i < blockedRects.length; i++) ctx.fillRect(blockedRects[i].x * TILE_SIZE, blockedRects[i].y * TILE_SIZE, blockedRects[i].w * TILE_SIZE, blockedRects[i].h * TILE_SIZE);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.45)';
        for (var j = 0; j < blockedPoints.length; j++) ctx.fillRect(blockedPoints[j].x * TILE_SIZE, blockedPoints[j].y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = 'rgba(255, 230, 0, 0.45)';
        for (var k = 0; k < triggers.length; k++) ctx.fillRect(triggers[k].area.x * TILE_SIZE, triggers[k].area.y * TILE_SIZE, triggers[k].area.w * TILE_SIZE, triggers[k].area.h * TILE_SIZE);

        if (isEditMode) {
            if (editStep === 1 && currentHoverTile) {
                var minX = Math.min(editStartX, currentHoverTile.x);
                var minY = Math.min(editStartY, currentHoverTile.y);
                var w = Math.max(editStartX, currentHoverTile.x) - minX + 1;
                var h = Math.max(editStartY, currentHoverTile.y) - minY + 1;
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
            }
            if (currentHoverTile && editStep === 0 && editTarget === 'blockedPoints') {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
                ctx.fillRect(currentHoverTile.x * TILE_SIZE, currentHoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (editStep === 1) {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
                ctx.fillRect(editStartX * TILE_SIZE, editStartY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        } else if (currentHoverTile) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
            ctx.fillRect(currentHoverTile.x * TILE_SIZE, currentHoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    if (currentScene === 'station_plaza') {
        var px = player.x; var py = player.y;
        ctx.fillStyle = '#f4c2c2'; ctx.fillRect(px + 2, py - 8, 12, 12);
        ctx.fillStyle = '#4a90e2'; ctx.fillRect(px, py + 4, 16, 12);
        ctx.fillStyle = '#ffffff';
        if (player.dir === 'down') { ctx.fillRect(px + 3, py - 4, 3, 3); ctx.fillRect(px + 10, py - 4, 3, 3); }
        else if (player.dir === 'left') { ctx.fillRect(px + 1, py - 4, 3, 3); }
        else if (player.dir === 'right') { ctx.fillRect(px + 12, py - 4, 3, 3); }

        if (debugMode || isEditMode) {
            var hitbox = getPlayerHitbox(px, py);
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 1;
            ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
        }
    }

    ctx.restore();
}
