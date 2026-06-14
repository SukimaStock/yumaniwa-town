// ==========================================
// 1. 定数・データ定義
// ==========================================
var BG_IMAGE_PATH = 'assets/yumaniwa_station_mock_clean.png';
var TILE_SIZE = 16;
var MAP_WIDTH = 48;
var MAP_HEIGHT = 32;

var PLAYER_START = { x: 24, y: 22 };

// 通行不可エリア
var blockedRects = [
    { x: 19, y: 24, w: 12, h: 7 },  // 湯間庭駅
    { x: 29, y: 10, w: 7,  h: 8 },  // 観光案内所
    { x: 38, y: 3,  w: 10, h: 8 },  // 湯窓通り入口周辺建物
    { x: 39, y: 19, w: 9,  h: 11 }, // 湯窓レジャーセンター
    { x: 0,  y: 16, w: 5,  h: 13 }, // 灯串横丁左側建物
    { x: 9,  y: 16, w: 5,  h: 12 }, // 灯串横丁右側建物
    { x: 0,  y: 3,  w: 13, h: 7 },  // 新聞掲示板奥の建物群
    { x: 24, y: 6,  w: 5,  h: 1 },  // 温泉方面バリケード
    { x: 0,  y: 31, w: 48, h: 1 }   // 最下段
];

// 通行不可ポイント
var blockedPoints = [
    { x: 22, y: 11 }, { x: 23, y: 11 }, { x: 24, y: 11 }, { x: 25, y: 11 }, // 看板
    { x: 22, y: 12 }, { x: 23, y: 12 }, { x: 24, y: 12 }, { x: 25, y: 12 },
    { x: 22, y: 13 }, { x: 23, y: 13 }, { x: 24, y: 13 },                   // ベンチ
    { x: 27, y: 11 },                                                       // 街灯
    { x: 18, y: 4 }, { x: 18, y: 5 }, { x: 33, y: 4 }, { x: 33, y: 5 },     // 電柱
    { x: 20, y: 12 }, { x: 26, y: 13 }, { x: 30, y: 11 }, { x: 35, y: 14 }, // 植木鉢
    { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 6 },         // 掲示板
    { x: 5, y: 7 }, { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }
];

// トリガーイベント
var triggers = [
    {
        id: "station",
        area: { x: 23, y: 23, w: 4, h: 1 },
        type: "inspect",
        text: "湯間庭駅。のんびりしたローカル線の小さな駅だ。町を歩いてみよう。"
    },
    {
        id: "tourist_info",
        area: { x: 31, y: 18, w: 3, h: 1 },
        type: "warp",
        target: "tourist_info_interior",
        text: "観光案内所に入りますか?"
    },
    {
        id: "yumado_street",
        area: { x: 41, y: 12, w: 4, h: 1 },
        type: "warp",
        target: "yumado_street_map",
        text: "湯窓通りへ進みますか?"
    },
    {
        id: "leisure_center",
        area: { x: 42, y: 24, w: 3, h: 1 },
        type: "warp",
        target: "leisure_center_map",
        text: "湯窓レジャーセンターに入りますか?"
    },
    {
        id: "tomogushi_alley",
        area: { x: 5, y: 21, w: 3, h: 1 },
        type: "warp",
        target: "tomogushi_alley_map",
        text: "灯串横丁へ入りますか?"
    },
    {
        id: "newspaper_board",
        area: { x: 5, y: 8, w: 4, h: 1 },
        type: "menu",
        target: "shinpo_board",
        text: "湯間庭新報の掲示板だ。記事を読んでみますか?"
    },
    {
        id: "tourist_map",
        area: { x: 22, y: 14, w: 4, h: 1 },
        type: "inspect",
        text: "湯間庭観光マップだ。町の見どころが載っている。"
    },
    {
        id: "onsen_construction",
        area: { x: 25, y: 6, w: 3, h: 1 },
        type: "inspect",
        text: "この先、湯間庭温泉。現在整備中です。またのお越しをお待ちください。"
    }
];

// 通行可能エリア(デバッグ表示用)
var passableRects = [
    { x: 14, y: 10, w: 22, h: 14 }, { x: 20, y: 22, w: 10, h: 3 },
    { x: 22, y: 0,  w: 9,  h: 10 }, { x: 4,  y: 6,  w: 15, h: 10 },
    { x: 37, y: 6,  w: 11, h: 12 }, { x: 0,  y: 18, w: 14, h: 11 },
    { x: 4,  y: 16, w: 5,  h: 11 }, { x: 36, y: 18, w: 12, h: 13 }
];


// ==========================================
// 2. 状態管理・初期化
// ==========================================
var canvas, ctx;
var bgImage = new Image();
var bgLoaded = false;
var bgError = false;

var player = {
    x: PLAYER_START.x * TILE_SIZE,
    y: PLAYER_START.y * TILE_SIZE,
    w: 16,
    h: 16,
    speed: 2,
    dir: 'down'
};

var currentScene = 'station_plaza';
var isMessageOpen = false;
var isMenuOpen = false;
var pendingWarp = null;

var debugMode = false;

var keys = {};
var dpad = { up: false, down: false, left: false, right: false };

window.onload = function() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // キャンバスを画面サイズに合わせる
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    bgImage.onload = function() { bgLoaded = true; };
    bgImage.onerror = function() { bgError = true; };
    bgImage.src = BG_IMAGE_PATH;

    setupEvents();
    requestAnimationFrame(gameLoop);
};

// 画面サイズが変わった時の処理
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ==========================================
// 3. 入力イベント設定
// ==========================================
function setupEvents() {
    window.addEventListener('keydown', function(e) {
        keys[e.key] = true;
        
        // デバッグ切り替え (GまたはDキーでON/OFFを統一)
        if (e.key === 'g' || e.key === 'G' || e.key === 'd' || e.key === 'D') {
            debugMode = !debugMode;
            document.getElementById('debug-info').style.display = debugMode ? 'inline-block' : 'none';
        }
        
        if (e.key === 'Escape') {
            closeMessage();
            closeMenu();
            pendingWarp = null;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            handleActionTrigger();
        }
    });

    window.addEventListener('keyup', function(e) {
        keys[e.key] = false;
    });

    // スマホ用タッチ入力
    function bindTouch(id, dir) {
        var el = document.getElementById(id);
        el.addEventListener('touchstart', function(e) { e.preventDefault(); dpad[dir] = true; }, {passive: false});
        el.addEventListener('touchend', function(e) { e.preventDefault(); dpad[dir] = false; }, {passive: false});
    }
    bindTouch('btn-up', 'up'); bindTouch('btn-down', 'down');
    bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');

    var btnAction = document.getElementById('btn-action');
    var actionFunc = function(e) {
        e.preventDefault();
        handleActionTrigger();
    };
    btnAction.addEventListener('touchstart', actionFunc, {passive: false});
    btnAction.addEventListener('click', actionFunc);
}

function handleActionTrigger() {
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

// ==========================================
// 4. メインループと更新・判定
// ==========================================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (isMessageOpen || isMenuOpen || currentScene !== 'station_plaza') return;

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

function checkCollision(x, y) {
    var rect = { x: x, y: y, w: player.w, h: player.h };

    for (var i = 0; i < blockedRects.length; i++) {
        var br = blockedRects[i];
        var tr = { x: br.x * TILE_SIZE, y: br.y * TILE_SIZE, w: br.w * TILE_SIZE, h: br.h * TILE_SIZE };
        if (isColliding(rect, tr)) return true;
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

// ==========================================
// 5. インタラクション
// ==========================================
function handleAction() {
    var checkX = player.x;
    var checkY = player.y;
    var checkSize = TILE_SIZE;

    if (player.dir === 'up') checkY -= checkSize;
    if (player.dir === 'down') checkY += checkSize;
    if (player.dir === 'left') checkX -= checkSize;
    if (player.dir === 'right') checkX += checkSize;

    var targetRect = { x: checkX, y: checkY, w: player.w, h: player.h };

    for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        var tr = { 
            x: t.area.x * TILE_SIZE, y: t.area.y * TILE_SIZE, 
            w: t.area.w * TILE_SIZE, h: t.area.h * TILE_SIZE 
        };

        if (isColliding(targetRect, tr) || isColliding(player, tr)) {
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
// 6. UIとシーン管理
// ==========================================
function updateUI() {
    var tileX = Math.floor((player.x + player.w/2) / TILE_SIZE);
    var tileY = Math.floor((player.y + player.h/2) / TILE_SIZE);
    
    var sceneNameMap = {
        'station_plaza': '駅前広場',
        'tourist_info_interior': '観光案内所',
        'yumado_street_map': '湯窓通り',
        'leisure_center_map': '湯窓レジャーセンター',
        'tomogushi_alley_map': '灯串横丁'
    };

    document.getElementById('scene-name').innerText = sceneNameMap[currentScene] || currentScene;
    if (debugMode) {
        document.getElementById('coord-display').innerText = "座標: (" + tileX + ", " + tileY + ")";
    }
}

function showMessage(text) {
    var msgWin = document.getElementById('message-window');
    msgWin.innerHTML = text;
    msgWin.style.display = 'block';
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
    
    menuWin.innerHTML = html;
    menuWin.style.display = 'block';
    isMenuOpen = true;
}

function closeMenu() {
    document.getElementById('menu-window').style.display = 'none';
    isMenuOpen = false;
}

window.handleMenuSelect = function(type) {
    closeMenu();
    if (type === 'note') {
        showMessage("この記事は現在準備中です。後日note記事へ接続予定です。");
    } else if (type === 'game') {
        showMessage("この筐体は準備中です。");
    }
};

window.changeScene = function(sceneId) {
    currentScene = sceneId;
    var sceneContainer = document.getElementById('scene-container');
    updateUI();

    if (sceneId === 'station_plaza') {
        sceneContainer.style.display = 'none';
        return;
    }

    var html = '';
    if (sceneId === 'tourist_info_interior') {
        html += '<h2>観光案内所</h2>';
        html += '<p>湯間庭町の地図やパンフレットが置かれている。ここから町のことを少しずつ知ることができそうだ。</p>';
        html += '<button onclick="handleMenuSelect(\'note\')">湯間庭町について</button>';
        html += '<button onclick="handleMenuSelect(\'note\')">町内マップ</button>';
        html += '<button onclick="handleMenuSelect(\'note\')">SukimaStockについて</button>';
    } else if (sceneId === 'yumado_street_map') {
        html += '<h2>湯窓通り</h2>';
        html += '<p>食堂、喫茶、雑貨店が並ぶ商店街。湯気と看板のにおいがする。</p>';
    } else if (sceneId === 'leisure_center_map') {
        html += '<h2>湯窓レジャーセンター</h2>';
        html += '<p>レトロな遊技場。ここには、触れるらくがきの筐体が並ぶ予定です。</p>';
        html += '<button onclick="handleMenuSelect(\'game\')">雨の日の窓</button>';
        html += '<button onclick="handleMenuSelect(\'game\')">絶対に押せないボタン</button>';
        html += '<button onclick="handleMenuSelect(\'game\')">通知バッジ増殖</button>';
        html += '<button onclick="handleMenuSelect(\'game\')">誰かの歩数計</button>';
    } else if (sceneId === 'tomogushi_alley_map') {
        html += '<h2>灯串横丁</h2>';
        html += '<p>提灯の灯りが続く小さな横丁。奥には串焼き勝負台があるらしい。</p>';
        html += '<button onclick="handleMenuSelect(\'game\')">Yakitori Wars</button>';
        html += '<button onclick="handleMenuSelect(\'note\')">本日の注文札</button>';
    }

    html += '<br><button onclick="changeScene(\'station_plaza\')" style="margin-top:30px; background:#222;">駅前へ戻る</button>';
    
    sceneContainer.innerHTML = html;
    sceneContainer.style.display = 'block';
};

// ==========================================
// 7. 描画処理 (カメラ計算とCanvas描画)
// ==========================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // スマホなど画面が狭い場合はズーム倍率を上げる
    var zoom = (window.innerWidth < 768) ? 2.5 : 2;

    // 画面(ビューポート)の論理サイズを計算
    var viewW = canvas.width / zoom;
    var viewH = canvas.height / zoom;

    // プレイヤーが画面の中心にくるようにカメラの左上座標を計算
    var cameraX = (player.x + player.w / 2) - (viewW / 2);
    var cameraY = (player.y + player.h / 2) - (viewH / 2);

    // マップ外を映さないようにカメラ位置を制限 (クランプ)
    var mapPixelW = MAP_WIDTH * TILE_SIZE;
    var mapPixelH = MAP_HEIGHT * TILE_SIZE;

    // マップより画面の方が大きい場合のセンタリング調整
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

    // ---------- ここからカメラを適用した描画 ----------
    ctx.save();
    ctx.scale(zoom, zoom);
    // カメラの座標分だけ全体を逆にずらすことで追従を実現
    ctx.translate(-cameraX, -cameraY);

    // 1. 背景描画
    if (bgLoaded) {
        ctx.drawImage(bgImage, 0, 0);
    } else {
        ctx.fillStyle = '#b0a080';
        ctx.fillRect(0, 0, mapPixelW, mapPixelH);
    }

    // 2. デバッグ:グリッドと当たり判定
    if (debugMode) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        for (var x = 0; x <= mapPixelW; x += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapPixelH); ctx.stroke();
        }
        for (var y = 0; y <= mapPixelH; y += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapPixelW, y); ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        for (var i = 0; i < blockedRects.length; i++) {
            ctx.fillRect(blockedRects[i].x * TILE_SIZE, blockedRects[i].y * TILE_SIZE, blockedRects[i].w * TILE_SIZE, blockedRects[i].h * TILE_SIZE);
        }
        for (var j = 0; j < blockedPoints.length; j++) {
            ctx.fillRect(blockedPoints[j].x * TILE_SIZE, blockedPoints[j].y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        for (var k = 0; k < triggers.length; k++) {
            ctx.fillRect(triggers[k].area.x * TILE_SIZE, triggers[k].area.y * TILE_SIZE, triggers[k].area.w * TILE_SIZE, triggers[k].area.h * TILE_SIZE);
        }

        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        for (var m = 0; m < passableRects.length; m++) {
            ctx.fillRect(passableRects[m].x * TILE_SIZE, passableRects[m].y * TILE_SIZE, passableRects[m].w * TILE_SIZE, passableRects[m].h * TILE_SIZE);
        }
    }

    // 3. プレイヤー描画
    if (currentScene === 'station_plaza') {
        drawPlayer();
    }

    // カメラの適用を解除
    ctx.restore();
    // ---------- カメラ適用ここまで ----------
}

function drawPlayer() {
    var px = player.x;
    var py = player.y;

    ctx.fillStyle = '#f4c2c2'; 
    ctx.fillRect(px + 2, py - 8, 12, 12);
    
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(px, py + 4, 16, 12);

    ctx.fillStyle = '#ffffff';
    if (player.dir === 'down') {
        ctx.fillRect(px + 3, py - 4, 3, 3);
        ctx.fillRect(px + 10, py - 4, 3, 3);
    } else if (player.dir === 'left') {
        ctx.fillRect(px + 1, py - 4, 3, 3);
    } else if (player.dir === 'right') {
        ctx.fillRect(px + 12, py - 4, 3, 3);
    }

    if (debugMode) {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(player.x, player.y, player.w, player.h);
    }
}
