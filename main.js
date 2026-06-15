// ==========================================
// 1. 定数・データ定義
// ==========================================
var BG_IMAGE_PATH = 'assets/yumaniwa_station_mock_clean.png';
var TILE_SIZE = 16;
var MAP_WIDTH = 48;
var MAP_HEIGHT = 32;
var PLAYER_START = { x: 24, y: 22 };

// 既存データ(初期化用)
var passableRects = [
    { x: 19, y: 7, w: 8, h: 2 },
    { x: 11, y: 8, w: 5, h: 3 },
    { x: 38, y: 8, w: 5, h: 7 },
    { x: 5, y: 9, w: 4, h: 6 },
    { x: 16, y: 9, w: 5, h: 1 },
    { x: 22, y: 9, w: 4, h: 13 },
    { x: 3, y: 10, w: 2, h: 5 },
    { x: 9, y: 10, w: 2, h: 5 },
    { x: 0, y: 11, w: 3, h: 4 },
    { x: 11, y: 11, w: 3, h: 7 },
    { x: 36, y: 13, w: 2, h: 4 },
    { x: 43, y: 13, w: 2, h: 2 },
    { x: 31, y: 14, w: 2, h: 7 },
    { x: 45, y: 14, w: 3, h: 1 },
    { x: 4, y: 15, w: 3, h: 17 },
    { x: 14, y: 15, w: 8, h: 7 },
    { x: 26, y: 15, w: 2, h: 7 },
    { x: 38, y: 15, w: 2, h: 1 },
    { x: 47, y: 15, w: 1, h: 1 },
    { x: 28, y: 16, w: 1, h: 6 },
    { x: 29, y: 17, w: 2, h: 4 },
    { x: 33, y: 17, w: 4, h: 6 },
    { x: 13, y: 18, w: 1, h: 3 },
    { x: 29, y: 21, w: 1, h: 1 },
    { x: 32, y: 21, w: 1, h: 11 },
    { x: 14, y: 22, w: 3, h: 2 },
    { x: 33, y: 23, w: 3, h: 9 },
    { x: 15, y: 24, w: 2, h: 4 },
    { x: 11, y: 26, w: 3, h: 6 },
    { x: 42, y: 26, w: 2, h: 6 },
    { x: 23, y: 28, w: 1, h: 3 },
    { x: 0, y: 29, w: 4, h: 3 },
    { x: 7, y: 29, w: 4, h: 3 },
    { x: 14, y: 29, w: 9, h: 2 },
    { x: 24, y: 29, w: 8, h: 2 },
    { x: 36, y: 29, w: 6, h: 3 },
    { x: 44, y: 29, w: 4, h: 3 },
    { x: 14, y: 31, w: 2, h: 1 }
];

var blockedRects = [
    { x: 0, y: 0, w: 48, h: 7 },
    { x: 0, y: 7, w: 19, h: 1 },
    { x: 27, y: 7, w: 21, h: 1 },
    { x: 0, y: 8, w: 11, h: 1 },
    { x: 16, y: 8, w: 3, h: 1 },
    { x: 27, y: 8, w: 11, h: 5 },
    { x: 43, y: 8, w: 5, h: 5 },
    { x: 0, y: 9, w: 5, h: 1 },
    { x: 9, y: 9, w: 2, h: 1 },
    { x: 21, y: 9, w: 1, h: 6 },
    { x: 26, y: 9, w: 1, h: 6 },
    { x: 0, y: 10, w: 3, h: 1 },
    { x: 16, y: 10, w: 5, h: 5 },
    { x: 14, y: 11, w: 2, h: 4 },
    { x: 27, y: 13, w: 9, h: 1 },
    { x: 45, y: 13, w: 3, h: 1 },
    { x: 27, y: 14, w: 4, h: 1 },
    { x: 33, y: 14, w: 3, h: 3 },
    { x: 0, y: 15, w: 4, h: 14 },
    { x: 7, y: 15, w: 4, h: 14 },
    { x: 28, y: 15, w: 3, h: 1 },
    { x: 40, y: 15, w: 7, h: 11 },
    { x: 29, y: 16, w: 2, h: 1 },
    { x: 38, y: 16, w: 2, h: 13 },
    { x: 47, y: 16, w: 1, h: 13 },
    { x: 37, y: 17, w: 1, h: 12 },
    { x: 11, y: 18, w: 2, h: 8 },
    { x: 13, y: 21, w: 1, h: 5 },
    { x: 30, y: 21, w: 2, h: 8 },
    { x: 17, y: 22, w: 13, h: 6 },
    { x: 36, y: 23, w: 1, h: 6 },
    { x: 14, y: 24, w: 1, h: 5 },
    { x: 40, y: 26, w: 2, h: 3 },
    { x: 44, y: 26, w: 3, h: 3 },
    { x: 15, y: 28, w: 8, h: 1 },
    { x: 24, y: 28, w: 6, h: 1 },
    { x: 16, y: 31, w: 16, h: 1 }
];

var blockedPoints = [];

var triggers = [
    {
        id: "station",
        area: { x: 23, y: 27, w: 2, h: 1 },
        type: "inspect",
        text: "湯間庭駅。のんびりしたローカル線の小さな駅だ。町を歩いてみよう。"
    },
    {
        id: "tourist_info",
        area: { x: 31, y: 13, w: 2, h: 1 },
        type: "warp",
        target: "tourist_info_interior",
        text: "観光案内所に入りますか?"
    },
    {
        id: "yumado_street",
        area: { x: 38, y: 11, w: 6, h: 1 },
        type: "warp",
        target: "yumado_street_map",
        text: "湯窓通りへ進みますか?"
    },
    {
        id: "leisure_center",
        area: { x: 42, y: 26, w: 3, h: 1 },
        type: "warp",
        target: "leisure_center_map",
        text: "湯窓レジャーセンターに入りますか?"
    },
    {
        id: "tomogushi_alley",
        area: { x: 4, y: 28, w: 3, h: 2 },
        type: "warp",
        target: "tomogushi_alley_map",
        text: "灯串横丁へ入りますか?"
    },
    {
        id: "newspaper_board",
        area: { x: 5, y: 8, w: 4, h: 1 },
        type: "menu",
        target: "shinpo_board",
        text: "湯間庭新報の掲示板だ。記事を読んでみますか?"
    },
    {
        id: "tourist_map",
        area: { x: 16, y: 14, w: 5, h: 1 },
        type: "inspect",
        text: "湯間庭観光マップだ。町の見どころが載っている。"
    },
    {
        id: "onsen_construction",
        area: { x: 22, y: 6, w: 4, h: 1 },
        type: "inspect",
        text: "この先、湯間庭温泉。現在整備中です。またのお越しをお待ちください。"
    }
];


// ==========================================
// 2. 状態管理・初期化 (グリッド化)
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
var editStep = 0;
var editStartX = 0;
var editStartY = 0;
var currentHoverTile = null;
var editHistory = [];

// ★当たり判定・ペイント用 2次元配列
var collisionGrid = [];

window.onload = function() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    initGrid(); // 配列データをグリッドに展開

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

function initGrid() {
    collisionGrid = [];
    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(0); // 0: 未設定(ブロック)
        collisionGrid.push(row);
    }
    // passable (1) を塗る
    for(var i=0; i<passableRects.length; i++) {
        var r = passableRects[i];
        for(var cy=r.y; cy<r.y+r.h; cy++) {
            for(var cx=r.x; cx<r.x+r.w; cx++) {
                if(cx>=0 && cx<MAP_WIDTH && cy>=0 && cy<MAP_HEIGHT) collisionGrid[cy][cx] = 1;
            }
        }
    }
    // blocked (2) を上塗り
    for(var i=0; i<blockedRects.length; i++) {
        var r = blockedRects[i];
        for(var cy=r.y; cy<r.y+r.h; cy++) {
            for(var cx=r.x; cx<r.x+r.w; cx++) {
                if(cx>=0 && cx<MAP_WIDTH && cy>=0 && cy<MAP_HEIGHT) collisionGrid[cy][cx] = 2;
            }
        }
    }
    for(var i=0; i<blockedPoints.length; i++) {
        var p = blockedPoints[i];
        if(p.x>=0 && p.x<MAP_WIDTH && p.y>=0 && p.y<MAP_HEIGHT) collisionGrid[p.y][p.x] = 2;
    }
}

// ==========================================
// 3. カメラ計算
// ==========================================
function getCamera() {
    var zoom = (window.innerWidth < 768) ? 2.5 : 2;
    var viewW = canvas.width / zoom;
    var viewH = canvas.height / zoom;
    var mapPixelW = MAP_WIDTH * TILE_SIZE;
    var mapPixelH = MAP_HEIGHT * TILE_SIZE;

    var cameraX = (player.x + player.w / 2) - (viewW / 2);
    var cameraY = (player.y + player.h / 2) - (viewH / 2);

    if (viewW > mapPixelW) cameraX = -(viewW - mapPixelW) / 2;
    else { if (cameraX < 0) cameraX = 0; if (cameraX > mapPixelW - viewW) cameraX = mapPixelW - viewW; }

    if (viewH > mapPixelH) cameraY = -(viewH - mapPixelH) / 2;
    else { if (cameraY < 0) cameraY = 0; if (cameraY > mapPixelH - viewH) cameraY = mapPixelH - viewH; }

    return { zoom: zoom, viewW: viewW, viewH: viewH, cameraX: cameraX, cameraY: cameraY, mapPixelW: mapPixelW, mapPixelH: mapPixelH };
}

// ==========================================
// 4. 入力イベント
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
    bindTouch('btn-up', 'up'); bindTouch('btn-down', 'down'); bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');

    var btnAction = document.getElementById('btn-action');
    var actionFunc = function(e) { e.preventDefault(); handleActionTrigger(); };
    btnAction.addEventListener('touchstart', actionFunc, {passive: false});
    btnAction.addEventListener('click', actionFunc);

    var btnDebug = document.getElementById('btn-debug-toggle');
    if (btnDebug) {
        btnDebug.addEventListener('touchstart', function(e) { e.preventDefault(); toggleDebugMode(); }, {passive: false});
        btnDebug.addEventListener('click', function(e) { e.preventDefault(); toggleDebugMode(); });
    }

    canvas.addEventListener('pointerdown', function(e) {
        if (!debugMode && !isEditMode) return;
        var rect = canvas.getBoundingClientRect();
        var cam = getCamera();
        var worldX = ((e.clientX - rect.left) / cam.zoom) + cam.cameraX;
        var worldY = ((e.clientY - rect.top) / cam.zoom) + cam.cameraY;
        var tileX = Math.floor(worldX / TILE_SIZE);
        var tileY = Math.floor(worldY / TILE_SIZE);

        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;
        document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;

        if (isEditMode) handleEditorTap(tileX, tileY);
        else if (debugMode) currentHoverTile = { x: tileX, y: tileY };
    });

    canvas.addEventListener('pointermove', function(e) {
        if (!isEditMode || editStep !== 1) return;
        var rect = canvas.getBoundingClientRect();
        var cam = getCamera();
        var worldX = ((e.clientX - rect.left) / cam.zoom) + cam.cameraX;
        var worldY = ((e.clientY - rect.top) / cam.zoom) + cam.cameraY;
        currentHoverTile = { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
    });
}

function handleActionTrigger() {
    if (isEditMode) return;
    if (!isMessageOpen && !isMenuOpen && currentScene === 'station_plaza') handleAction();
    else if (isMessageOpen && pendingWarp) { changeScene(pendingWarp); closeMessage(); pendingWarp = null; }
    else if (isMessageOpen) closeMessage();
}

function toggleDebugMode() {
    var panel = document.getElementById('editor-panel');
    var btn = document.getElementById('btn-debug-toggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex'; btn.style.display = 'none';
        debugMode = true; isEditMode = true;
        document.getElementById('debug-info').style.display = 'inline-block';
        updateEditorStatus("編集対象を選んでタップしてください");
    }
}

// ==========================================
// 5. エディタ機能とイベント
// ==========================================
function setupEditorEvents() {
    document.getElementById('btn-close-editor').addEventListener('click', function() {
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('btn-debug-toggle').style.display = 'block';
        isEditMode = false; debugMode = false;
        document.getElementById('debug-info').style.display = 'none';
        editStep = 0; currentHoverTile = null;
    });

    document.getElementById('edit-target').addEventListener('change', function(e) {
        editTarget = e.target.value; editStep = 0; currentHoverTile = null;
        document.getElementById('trigger-form').style.display = (editTarget === 'triggers') ? 'block' : 'none';
        updateEditorStatus(editTarget + " を編集します");
    });

    document.getElementById('btn-editor-undo').addEventListener('click', function() {
        if (editHistory.length === 0) { updateEditorStatus("Undoする履歴がありません"); return; }
        var last = editHistory.pop();
        if (last.type === 'grid') { collisionGrid = last.prev; }
        else if (last.type === 'triggers') { triggers.pop(); }
        updateEditorStatus("直前の編集を取り消しました");
        editStep = 0; currentHoverTile = null;
    });

    document.getElementById('btn-editor-export').addEventListener('click', showExportModal);
    document.getElementById('btn-close-export').addEventListener('click', function() { document.getElementById('export-modal').style.display = 'none'; });
    var btnCopy = document.getElementById('btn-copy-export');
    btnCopy.addEventListener('click', function() {
        var textarea = document.getElementById('export-textarea');
        textarea.select();
        try {
            document.execCommand('copy');
            btnCopy.innerText = "コピー完了!"; setTimeout(function(){ btnCopy.innerText = "コピーする"; }, 2000);
        } catch(err) { alert("コピーに失敗しました。手動でコピーしてください。"); }
    });
}

function updateEditorStatus(msg) { document.getElementById('editor-status').innerText = msg; }

// グリッドをディープコピー(Undo保存用)
function copyGrid() {
    var arr = [];
    for (var y = 0; y < MAP_HEIGHT; y++) arr.push(collisionGrid[y].slice());
    return arr;
}

function handleEditorTap(tx, ty) {
    if (editTarget === 'blockedPoints') {
        editHistory.push({ type: 'grid', prev: copyGrid() });
        collisionGrid[ty][tx] = 2; // block上書き
        updateEditorStatus("Point追加: (" + tx + ", " + ty + ")");
        return;
    }

    if (editStep === 0) {
        editStartX = tx; editStartY = ty; editStep = 1; currentHoverTile = { x: tx, y: ty };
        updateEditorStatus("終点をタップしてください");
    } else if (editStep === 1) {
        var minX = Math.min(editStartX, tx); var minY = Math.min(editStartY, ty);
        var w = Math.max(editStartX, tx) - minX + 1; var h = Math.max(editStartY, ty) - minY + 1;
        var newRect = { x: minX, y: minY, w: w, h: h };

        if (editTarget === 'passableRects' || editTarget === 'blockedRects') {
            editHistory.push({ type: 'grid', prev: copyGrid() });
            var val = (editTarget === 'passableRects') ? 1 : 2;
            for (var cy = minY; cy < minY + h; cy++) {
                for (var cx = minX; cx < minX + w; cx++) {
                    if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) collisionGrid[cy][cx] = val;
                }
            }
        } else if (editTarget === 'triggers') {
            for (var i = triggers.length - 1; i >= 0; i--) {
                if (triggers[i].area.x === minX && triggers[i].area.y === minY && triggers[i].area.w === w && triggers[i].area.h === h) triggers.splice(i, 1);
            }
            var tType = document.getElementById('trigger-type').value;
            var tId = document.getElementById('trigger-id').value;
            var tText = document.getElementById('trigger-text').value;
            var tTarget = document.getElementById('trigger-target').value;
            triggers.push({ id: tId, area: newRect, type: tType, target: tTarget, text: tText });
            editHistory.push({ type: 'triggers' });
        }
        editStep = 0; currentHoverTile = null; updateEditorStatus("追加完了。次の始点をタップ");
    }
}

// 2次元配列からRectの配列を最適化して生成するアルゴリズム
function gridToRects(targetValue) {
    var rects = [];
    var visited = [];
    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(false);
        visited.push(row);
    }
    for (var y = 0; y < MAP_HEIGHT; y++) {
        for (var x = 0; x < MAP_WIDTH; x++) {
            if (collisionGrid[y][x] === targetValue && !visited[y][x]) {
                var w = 0;
                while (x + w < MAP_WIDTH && collisionGrid[y][x + w] === targetValue && !visited[y][x + w]) w++;
                var h = 1; var canExpand = true;
                while (y + h < MAP_HEIGHT && canExpand) {
                    for (var i = 0; i < w; i++) {
                        if (collisionGrid[y + h][x + i] !== targetValue || visited[y + h][x + i]) { canExpand = false; break; }
                    }
                    if (canExpand) h++;
                }
                for (var dy = 0; dy < h; dy++) {
                    for (var dx = 0; dx < w; dx++) visited[y + dy][x + dx] = true;
                }
                rects.push({ x: x, y: y, w: w, h: h });
            }
        }
    }
    return rects;
}

function showExportModal() {
    var pRects = gridToRects(1);
    var bAll = gridToRects(2);
    var newBlockedRects = [];
    var newBlockedPoints = [];
    
    for(var i=0; i<bAll.length; i++) {
        if(bAll[i].w === 1 && bAll[i].h === 1) newBlockedPoints.push({ x: bAll[i].x, y: bAll[i].y });
        else newBlockedRects.push(bAll[i]);
    }

    var str = "var passableRects = [\n";
    for(var i=0; i<pRects.length; i++) {
        str += "    { x: " + pRects[i].x + ", y: " + pRects[i].y + ", w: " + pRects[i].w + ", h: " + pRects[i].h + " }";
        if(i < pRects.length - 1) str += ","; str += "\n";
    }
    str += "];\n\nvar blockedRects = [\n";
    for(var i=0; i<newBlockedRects.length; i++) {
        str += "    { x: " + newBlockedRects[i].x + ", y: " + newBlockedRects[i].y + ", w: " + newBlockedRects[i].w + ", h: " + newBlockedRects[i].h + " }";
        if(i < newBlockedRects.length - 1) str += ","; str += "\n";
    }
    str += "];\n\nvar blockedPoints = [\n";
    for(var i=0; i<newBlockedPoints.length; i++) {
        str += "    { x: " + newBlockedPoints[i].x + ", y: " + newBlockedPoints[i].y + " }";
        if(i < newBlockedPoints.length - 1) str += ","; str += "\n";
    }
    str += "];\n\nvar triggers = [\n";
    for(var i=0; i<triggers.length; i++) {
        var t = triggers[i];
        str += "    {\n        id: \"" + t.id + "\",\n        area: { x: " + t.area.x + ", y: " + t.area.y + ", w: " + t.area.w + ", h: " + t.area.h + " },\n";
        str += "        type: \"" + t.type + "\",\n";
        if (t.target) str += "        target: \"" + t.target + "\",\n";
        str += "        text: \"" + t.text + "\"\n    }";
        if(i < triggers.length - 1) str += ","; str += "\n";
    }
    str += "\n];\n";

    document.getElementById('export-textarea').value = str;
    document.getElementById('export-modal').style.display = 'flex';
}

// ==========================================
// 6. メインループと更新・判定
// ==========================================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

function update() {
    if (isMessageOpen || isMenuOpen || currentScene !== 'station_plaza' || isEditMode) return;

    var dx = 0; var dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up) dy -= player.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down) dy += player.speed;
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left) dx -= player.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right) dx += player.speed;

    if (dx !== 0 || dy !== 0) {
        player.dir = (Math.abs(dx) > Math.abs(dy)) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

        if (!checkCollision(player.x + dx, player.y)) player.x += dx;
        if (!checkCollision(player.x, player.y + dy)) player.y += dy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.w > MAP_WIDTH * TILE_SIZE) player.x = MAP_WIDTH * TILE_SIZE - player.w;
        if (player.y < 0) player.y = 0;
        if (player.y + player.h > MAP_HEIGHT * TILE_SIZE) player.y = MAP_HEIGHT * TILE_SIZE - player.h;
        
        updateUI();
    }
}

function getPlayerHitbox(x, y) { return { x: x + 3, y: y + 10, w: 10, h: 6 }; }

function checkCollision(x, y) {
    var rect = getPlayerHitbox(x, y);
    var points = [
        { x: rect.x, y: rect.y }, { x: rect.x + rect.w - 1, y: rect.y },
        { x: rect.x, y: rect.y + rect.h - 1 }, { x: rect.x + rect.w - 1, y: rect.y + rect.h - 1 }
    ];

    for (var i = 0; i < points.length; i++) {
        var tx = Math.floor(points[i].x / TILE_SIZE);
        var ty = Math.floor(points[i].y / TILE_SIZE);
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
        var val = collisionGrid[ty][tx];
        if (val === 0 || val === 2) return true; // 0:通行不可, 2:ブロック
    }
    return false;
}

function isColliding(r1, r2) { return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y; }

function handleAction() {
    var checkX = player.x; var checkY = player.y; var checkSize = TILE_SIZE;
    if (player.dir === 'up') checkY -= checkSize; if (player.dir === 'down') checkY += checkSize;
    if (player.dir === 'left') checkX -= checkSize; if (player.dir === 'right') checkX += checkSize;

    var targetRect = getPlayerHitbox(checkX, checkY);
    var pRect = getPlayerHitbox(player.x, player.y);

    for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        var tr = { x: t.area.x * TILE_SIZE, y: t.area.y * TILE_SIZE, w: t.area.w * TILE_SIZE, h: t.area.h * TILE_SIZE };
        if (isColliding(targetRect, tr) || isColliding(pRect, tr)) {
            if (t.type === 'inspect') showMessage(t.text);
            else if (t.type === 'warp') { showMessage(t.text + "<br><span style='font-size:14px; color:#aaa;'>(移動します)</span>"); pendingWarp = t.target; }
            else if (t.type === 'menu') { showMessage(t.text); openMenu(t.target); }
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
function showMessage(text) { document.getElementById('message-window').innerHTML = text; document.getElementById('message-window').style.display = 'block'; isMessageOpen = true; }
function closeMessage() { document.getElementById('message-window').style.display = 'none'; isMessageOpen = false; }
function openMenu(menuId) {
    var menuWin = document.getElementById('menu-window'); var html = '';
    if (menuId === 'shinpo_board') {
        html += '<div class="menu-item" onclick="handleMenuSelect(\'note\')">正解のないアプリばかり作っている</div>';
        html += '<div class="menu-item" onclick="handleMenuSelect(\'note\')">湯窓レジャーセンターに新しい筐体</div>';
        html += '<div class="menu-item" onclick="handleMenuSelect(\'note\')">灯串横丁、本日も営業中</div>';
    }
    html += '<div class="menu-item" style="color:#f88;" onclick="closeMenu()">閉じる</div>';
    menuWin.innerHTML = html; menuWin.style.display = 'block'; isMenuOpen = true;
}
function closeMenu() { document.getElementById('menu-window').style.display = 'none'; isMenuOpen = false; }
window.handleMenuSelect = function(type) { closeMenu(); showMessage((type === 'note') ? "この記事は準備中です。" : "この筐体は準備中です。"); };

window.changeScene = function(sceneId) {
    currentScene = sceneId; updateUI(); var sceneContainer = document.getElementById('scene-container');
    if (sceneId === 'station_plaza') { sceneContainer.style.display = 'none'; return; }
    var html = '';
    if (sceneId === 'tourist_info_interior') html += '<h2>観光案内所</h2><p>パンフレットがある。</p><button onclick="handleMenuSelect(\'note\')">戻る</button>';
    else if (sceneId === 'yumado_street_map') html += '<h2>湯窓通り</h2><p>商店街。</p>';
    else if (sceneId === 'leisure_center_map') html += '<h2>湯窓レジャーセンター</h2><p>遊技場。</p><button onclick="handleMenuSelect(\'game\')">雨の日の窓</button>';
    else if (sceneId === 'tomogushi_alley_map') html += '<h2>灯串横丁</h2><p>小さな横丁。</p><button onclick="handleMenuSelect(\'game\')">Yakitori Wars</button>';
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

    if (bgLoaded) ctx.drawImage(bgImage, 0, 0, cam.mapPixelW, cam.mapPixelH);
    else { ctx.fillStyle = '#b0a080'; ctx.fillRect(0, 0, cam.mapPixelW, cam.mapPixelH); }

    if (debugMode || isEditMode) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
        for (var x = 0; x <= cam.mapPixelW; x += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cam.mapPixelH); ctx.stroke(); }
        for (var y = 0; y <= cam.mapPixelH; y += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cam.mapPixelW, y); ctx.stroke(); }

        // グリッド(1=青, 2=赤)を描画
        ctx.fillStyle = 'rgba(0, 120, 255, 0.25)';
        for (var y = 0; y < MAP_HEIGHT; y++) {
            for (var x = 0; x < MAP_WIDTH; x++) {
                if (collisionGrid[y][x] === 1) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
        ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
        for (var y = 0; y < MAP_HEIGHT; y++) {
            for (var x = 0; x < MAP_WIDTH; x++) {
                if (collisionGrid[y][x] === 2) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        ctx.fillStyle = 'rgba(255, 230, 0, 0.45)';
        for (var k = 0; k < triggers.length; k++) ctx.fillRect(triggers[k].area.x * TILE_SIZE, triggers[k].area.y * TILE_SIZE, triggers[k].area.w * TILE_SIZE, triggers[k].area.h * TILE_SIZE);

        if (isEditMode) {
            if (editStep === 1 && currentHoverTile) {
                var minX = Math.min(editStartX, currentHoverTile.x); var minY = Math.min(editStartY, currentHoverTile.y);
                var w = Math.max(editStartX, currentHoverTile.x) - minX + 1; var h = Math.max(editStartY, currentHoverTile.y) - minY + 1;
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
            }
            if (currentHoverTile && editStep === 0 && editTarget === 'blockedPoints') {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; ctx.fillRect(currentHoverTile.x * TILE_SIZE, currentHoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (editStep === 1) {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; ctx.fillRect(editStartX * TILE_SIZE, editStartY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        } else if (currentHoverTile) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; ctx.fillRect(currentHoverTile.x * TILE_SIZE, currentHoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
            ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 1; ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
        }
    }

    ctx.restore();
}
