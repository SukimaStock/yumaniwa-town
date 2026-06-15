// ==========================================
// 1. 定数・データ定義
// ==========================================
var BG_IMAGE_PATH = 'assets/yumaniwa_station_mock_clean.png';
var TILE_SIZE = 16;
var MAP_WIDTH = 48;
var MAP_HEIGHT = 32;
var PLAYER_START = { x: 24, y: 17 };

var passableRects = [
    { x: 19, y: 7, w: 8, h: 2 }, { x: 11, y: 8, w: 5, h: 3 }, { x: 38, y: 8, w: 5, h: 7 },
    { x: 5, y: 9, w: 4, h: 6 }, { x: 16, y: 9, w: 5, h: 1 }, { x: 22, y: 9, w: 4, h: 13 },
    { x: 3, y: 10, w: 2, h: 5 }, { x: 9, y: 10, w: 2, h: 5 }, { x: 0, y: 11, w: 3, h: 4 },
    { x: 11, y: 11, w: 3, h: 7 }, { x: 36, y: 13, w: 2, h: 4 }, { x: 43, y: 13, w: 2, h: 2 },
    { x: 31, y: 14, w: 2, h: 7 }, { x: 45, y: 14, w: 3, h: 1 }, { x: 4, y: 15, w: 3, h: 17 },
    { x: 14, y: 15, w: 8, h: 7 }, { x: 26, y: 15, w: 2, h: 7 }, { x: 38, y: 15, w: 2, h: 1 },
    { x: 47, y: 15, w: 1, h: 1 }, { x: 28, y: 16, w: 1, h: 6 }, { x: 29, y: 17, w: 2, h: 4 },
    { x: 33, y: 17, w: 4, h: 6 }, { x: 13, y: 18, w: 1, h: 3 }, { x: 29, y: 21, w: 1, h: 1 },
    { x: 32, y: 21, w: 1, h: 11 }, { x: 14, y: 22, w: 3, h: 2 }, { x: 33, y: 23, w: 3, h: 9 },
    { x: 15, y: 24, w: 2, h: 4 }, { x: 11, y: 26, w: 3, h: 6 }, { x: 42, y: 26, w: 2, h: 6 },
    { x: 23, y: 28, w: 1, h: 3 }, { x: 0, y: 29, w: 4, h: 3 }, { x: 7, y: 29, w: 4, h: 3 },
    { x: 14, y: 29, w: 9, h: 2 }, { x: 24, y: 29, w: 8, h: 2 }, { x: 36, y: 29, w: 6, h: 3 },
    { x: 44, y: 29, w: 4, h: 3 }, { x: 14, y: 31, w: 2, h: 1 }
];

var blockedRects = [
    { x: 0, y: 0, w: 48, h: 7 }, { x: 0, y: 7, w: 19, h: 1 }, { x: 27, y: 7, w: 21, h: 1 },
    { x: 0, y: 8, w: 11, h: 1 }, { x: 16, y: 8, w: 3, h: 1 }, { x: 27, y: 8, w: 11, h: 5 },
    { x: 43, y: 8, w: 5, h: 5 }, { x: 0, y: 9, w: 5, h: 1 }, { x: 9, y: 9, w: 2, h: 1 },
    { x: 21, y: 9, w: 1, h: 6 }, { x: 26, y: 9, w: 1, h: 6 }, { x: 0, y: 10, w: 3, h: 1 },
    { x: 16, y: 10, w: 5, h: 5 }, { x: 14, y: 11, w: 2, h: 4 }, { x: 27, y: 13, w: 9, h: 1 },
    { x: 45, y: 13, w: 3, h: 1 }, { x: 27, y: 14, w: 4, h: 1 }, { x: 33, y: 14, w: 3, h: 3 },
    { x: 0, y: 15, w: 4, h: 14 }, { x: 7, y: 15, w: 4, h: 14 }, { x: 28, y: 15, w: 3, h: 1 },
    { x: 40, y: 15, w: 7, h: 11 }, { x: 29, y: 16, w: 2, h: 1 }, { x: 38, y: 16, w: 2, h: 13 },
    { x: 47, y: 16, w: 1, h: 13 }, { x: 37, y: 17, w: 1, h: 12 }, { x: 11, y: 18, w: 2, h: 8 },
    { x: 13, y: 21, w: 1, h: 5 }, { x: 30, y: 21, w: 2, h: 8 }, { x: 17, y: 22, w: 13, h: 6 },
    { x: 36, y: 23, w: 1, h: 6 }, { x: 14, y: 24, w: 1, h: 5 }, { x: 40, y: 26, w: 2, h: 3 },
    { x: 44, y: 26, w: 3, h: 3 }, { x: 15, y: 28, w: 8, h: 1 }, { x: 24, y: 28, w: 6, h: 1 },
    { x: 16, y: 31, w: 16, h: 1 }
];

var blockedPoints = [];

var triggers = [
    { id: "station", label: "湯間庭駅", actionLabel: "調べる", area: { x: 23, y: 27, w: 2, h: 1 }, type: "inspect", text: "湯間庭駅。\n\nのんびりしたローカル線の小さな駅だ。\nここから、湯気と看板の町歩きが始まる。" },
    { id: "tourist_info", label: "観光案内所", actionLabel: "入る", area: { x: 31, y: 13, w: 2, h: 1 }, type: "warp", target: "tourist_info_interior", text: "観光案内所に入りますか?" },
    { id: "yumado_street", label: "湯窓通り", actionLabel: "進む", area: { x: 38, y: 11, w: 6, h: 1 }, type: "warp", target: "yumado_street_map", text: "湯窓通りへ進みますか?" },
    { id: "leisure_center", label: "湯窓レジャーセンター", actionLabel: "入る", area: { x: 42, y: 26, w: 3, h: 1 }, type: "warp", target: "leisure_center_map", text: "湯窓レジャーセンターに入りますか?" },
    { id: "tomogushi_alley", label: "灯串横丁", actionLabel: "入る", area: { x: 4, y: 28, w: 3, h: 2 }, type: "warp", target: "tomogushi_alley_map", text: "灯串横丁へ入りますか?" },
    { id: "newspaper_board", label: "湯間庭新報", actionLabel: "読む", area: { x: 5, y: 8, w: 4, h: 1 }, type: "menu", target: "shinpo_board", text: "湯間庭新報の掲示板だ。記事を読んでみますか?" },
    { id: "tourist_map", label: "観光マップ", actionLabel: "調べる", area: { x: 16, y: 14, w: 5, h: 1 }, type: "inspect", text: "湯間庭観光マップだ。町の見どころが載っている。" },
    { id: "onsen_construction", label: "湯間庭温泉方面", actionLabel: "調べる", area: { x: 22, y: 6, w: 4, h: 1 }, type: "inspect", text: "この先、湯間庭温泉。\n\n現在、石段と湯けむりの整備中です。\nもう少し町が広がったら、入れるようになるかもしれません。" }
];

var areaZones = [
    { id: "station_plaza_center", title: "湯間庭駅前", subtitle: "Station Plaza", area: { x: 14, y: 15, w: 18, h: 10 } },
    { id: "yumado_street_gate", title: "湯窓通り入口", subtitle: "Yumado Street", area: { x: 38, y: 8, w: 7, h: 8 } },
    { id: "leisure_center_front", title: "湯窓レジャーセンター前", subtitle: "Yumado Leisure Center", area: { x: 39, y: 24, w: 8, h: 6 } },
    { id: "tomogushi_alley_gate", title: "灯串横丁", subtitle: "Tomogushi Alley", area: { x: 4, y: 24, w: 5, h: 6 } },
    { id: "shinpo_board_area", title: "湯間庭新報 掲示板前", subtitle: "Yumaniwa Shinpo", area: { x: 4, y: 7, w: 8, h: 5 } },
    { id: "onsen_road_closed", title: "湯間庭温泉方面", subtitle: "Under Construction", area: { x: 20, y: 6, w: 8, h: 4 } }
];

// ★ 追加: RPG共通メニュー用データ構造 DESTINATIONS
var DESTINATIONS = {
    tourist_info_interior: {
        id: "tourist_info_interior",
        title: "観光案内所",
        subtitle: "Information",
        description: "木のカウンターの上に、手描きの地図と古いパンフレットが並んでいる。",
        flavor: "係の人が、少し眠そうにこちらを見ている。",
        menuTitle: "なにを見ますか?",
        items: [
            {
                label: "湯間庭町について",
                kind: "message",
                text: "湯間庭町は、湯気と余白のあいだにある小さな温泉町です。駅前から、商店街、横丁、レジャーセンターへ歩いて行けます。まだ開いていない場所もありますが、町は少しずつ広がっていく予定です。"
            },
            {
                label: "現在行ける場所",
                kind: "message",
                text: "いま歩けるのは、湯間庭駅前、観光案内所、湯間庭新報、湯窓レジャーセンター、灯串横丁、湯窓通り入口です。湯間庭温泉方面は、現在整備中です。"
            },
            {
                label: "この町の作り手について",
                kind: "message",
                text: "この町は、SukimaStockの制作記録から少しずつ運び込まれたものたちでできています。アプリ、文章、ゲーム未満の小さな作品たちが、町の施設として並びはじめています。"
            },
            {
                label: "更新履歴",
                kind: "message",
                text: "駅前広場を歩けるようになりました。観光案内、掲示板、レジャーセンター、横丁の入口が開きました。町内の案内表示とエリア名表示も追加されています。"
            },
            {
                label: "駅前へ戻る",
                kind: "back"
            }
        ]
    },
    shinpo_board: {
        id: "shinpo_board",
        title: "湯間庭新報",
        subtitle: "Town Bulletin",
        description: "掲示板には、町の知らせや読みものが何枚か貼られている。",
        flavor: "紙の端が、風で少しだけ揺れている。",
        menuTitle: "どの記事を読みますか?",
        items: [
            {
                label: "正解のないアプリばかり作っている",
                kind: "external",
                url: "",
                emptyText: "この記事はまだ掲示準備中です。掲示板には、白い押しピンだけが残っている。"
            },
            {
                label: "コードが読めないと作れない、は本当だろうか",
                kind: "external",
                url: "",
                emptyText: "この記事はまだ掲示準備中です。掲示板には、白い押しピンだけが残っている。"
            },
            {
                label: "ゲーム未満、アプリ未満の心地よさ",
                kind: "external",
                url: "",
                emptyText: "この記事はまだ掲示準備中です。掲示板には、白い押しピンだけが残っている。"
            },
            {
                label: "Yakitori Wars おいしさアップデート",
                kind: "external",
                url: "",
                emptyText: "この記事はまだ掲示準備中です。掲示板には、白い押しピンだけが残っている。"
            },
            {
                label: "駅前へ戻る",
                kind: "back"
            }
        ]
    },
    leisure_center_map: {
        id: "leisure_center_map",
        title: "湯窓レジャーセンター",
        subtitle: "Playable Works",
        description: "少し古びた遊技場。奥の筐体から、小さな光と音がこぼれている。",
        flavor: "入口近くの看板には『さわれるらくがき、稼働中』と書かれている。",
        menuTitle: "どの筐体で遊びますか?",
        items: [
            {
                label: "雨の日の窓",
                kind: "work",
                url: "",
                emptyText: "この筐体は現在調整中です。ガラスの向こうで、雨音だけが聞こえます。"
            },
            {
                label: "絶対に押せないボタン",
                kind: "work",
                url: "",
                emptyText: "この筐体は現在調整中です。ボタンだけが、こちらを警戒しています。"
            },
            {
                label: "通知バッジ増殖",
                kind: "work",
                url: "",
                emptyText: "この筐体は現在調整中です。赤い丸が、まだ眠っています。"
            },
            {
                label: "誰かの歩数計",
                kind: "work",
                url: "",
                emptyText: "この筐体は現在調整中です。小さな数字だけが、ときどき動きます。"
            },
            {
                label: "Fast-Forward Clock",
                kind: "work",
                url: "",
                emptyText: "この筐体は現在調整中です。針だけが、少し先の時間を見ているようです。"
            },
            {
                label: "駅前へ戻る",
                kind: "back"
            }
        ]
    },
    tomogushi_alley_map: {
        id: "tomogushi_alley_map",
        title: "灯串横丁",
        subtitle: "Yakitori Alley",
        description: "提灯の灯りが続く小さな横丁。奥に、串焼き勝負台が置かれている。",
        flavor: "炭のにおいと、誰かの笑い声が路地の奥から流れてくる。",
        menuTitle: "どこへ向かいますか?",
        items: [
            {
                label: "串焼き勝負台:Yakitori Wars",
                kind: "game",
                url: "",
                emptyText: "勝負台は準備中です。炭だけが静かに赤くなっています。"
            },
            {
                label: "本日の注文札",
                kind: "message",
                text: "本日の注文札には、\n\n『ねぎま、つくね、かわ。\n焼きすぎ注意』\n\nと書かれている。"
            },
            {
                label: "灯串横丁について",
                kind: "message",
                text: "灯串横丁は、駅前のはずれにある小さな横丁です。まだ店は多くありませんが、夕方になると提灯が灯り、どこからか焼き鳥のにおいがしてきます。"
            },
            {
                label: "駅前へ戻る",
                kind: "back"
            }
        ]
    },
    yumado_street_map: {
        id: "yumado_street_map",
        title: "湯窓通り",
        subtitle: "Shopping Street",
        description: "湯気の向こうに、小さな店の看板が並んでいる。",
        flavor: "まだ開いていない店も多いが、通りの奥には少しだけ気配がある。",
        menuTitle: "どこを見ますか?",
        items: [
            {
                label: "喫茶まどべ",
                kind: "message",
                text: "窓際の席がよさそうな小さな喫茶店。まだ準備中の札がかかっている。"
            },
            {
                label: "湯まんじゅう屋",
                kind: "message",
                text: "蒸し器から白い湯気が上がっている。開店までもう少しらしい。"
            },
            {
                label: "古道具屋",
                kind: "message",
                text: "入口の箱に、古いボタンや謎の部品が並んでいる。何に使うものかは分からないが、少しだけ気になる。"
            },
            {
                label: "まだ閉まっている店",
                kind: "message",
                text: "シャッターの奥から、小さな物音がした気がする。この通りは、まだ少しずつ準備をしている。"
            },
            {
                label: "駅前へ戻る",
                kind: "back"
            }
        ]
    }
};

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
var pendingWarp = null;

var debugMode = false;
var keys = {};
var dpad = { up: false, down: false, left: false, right: false };

var isEditMode = false;
var editTarget = 'passableRects';
var editStep = 0;
var editStartX = 0;
var editStartY = 0;
var currentHoverTile = null;
var editHistory = [];

var collisionGrid = [];
var currentAreaId = null;
var areaTitleTimer = null;

var tapMovePath = [];
var tapMoveTargetTile = null;
var tapMarkerTimer = 0;
var tapMarkerPos = null;

// ★ 新規追加: RPGメニュー用状態変数
var destinationViewMode = "intro"; // "intro" | "menu" | "message"
var currentDestinationId = null;
var currentDestinationMessage = "";
var currentDestinationMessageTitle = "";

window.onload = function() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    initGrid();

    bgImage.onload = function() { bgLoaded = true; };
    bgImage.onerror = function() { bgError = true; };
    bgImage.src = BG_IMAGE_PATH;

    setupEvents();
    setupEditorEvents();
    setupMessageLayerEvents();
    requestAnimationFrame(gameLoop);

    setTimeout(function() {
        updateCurrentArea();
        updateInteractionHint();
    }, 500);
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function initGrid() {
    collisionGrid = [];
    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(0);
        collisionGrid.push(row);
    }
    for(var i=0; i<passableRects.length; i++) {
        var r = passableRects[i];
        for(var cy=r.y; cy<r.y+r.h; cy++) {
            for(var cx=r.x; cx<r.x+r.w; cx++) {
                if(cx>=0 && cx<MAP_WIDTH && cy>=0 && cy<MAP_HEIGHT) collisionGrid[cy][cx] = 1;
            }
        }
    }
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

function getPlayerTile() {
    var hitbox = getPlayerHitbox(player.x, player.y);
    var cx = hitbox.x + hitbox.w / 2;
    var cy = hitbox.y + hitbox.h / 2;
    return {
        x: Math.floor(cx / TILE_SIZE),
        y: Math.floor(cy / TILE_SIZE)
    };
}

function isWalkableTile(tx, ty) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return false;
    return collisionGrid[ty][tx] === 1;
}

function findPath(startX, startY, goalX, goalY) {
    if (!isWalkableTile(goalX, goalY)) return null;
    if (startX === goalX && startY === goalY) return [];

    var queue = [{ x: startX, y: startY, path: [] }];
    var visited = [];
    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(false);
        visited.push(row);
    }
    visited[startY][startX] = true;

    var dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    while (queue.length > 0) {
        var cur = queue.shift();
        
        if (cur.x === goalX && cur.y === goalY) {
            return cur.path;
        }

        for (var i = 0; i < dirs.length; i++) {
            var nx = cur.x + dirs[i].dx;
            var ny = cur.y + dirs[i].dy;

            if (isWalkableTile(nx, ny) && !visited[ny][nx]) {
                visited[ny][nx] = true;
                var newPath = cur.path.slice();
                newPath.push({ x: nx, y: ny });
                queue.push({ x: nx, y: ny, path: newPath });
            }
        }
    }
    return null;
}

function startTapMoveTo(tileX, tileY) {
    if (!isWalkableTile(tileX, tileY)) return;
    var startTile = getPlayerTile();
    var path = findPath(startTile.x, startTile.y, tileX, tileY);
    if (path && path.length > 0) {
        tapMovePath = path;
        tapMoveTargetTile = path[0];
        tapMarkerPos = { x: tileX, y: tileY };
        tapMarkerTimer = 60;
    }
}

function cancelTapMove() {
    tapMovePath = [];
    tapMoveTargetTile = null;
}

function updateTapMove() {
    if (!tapMoveTargetTile) return false;

    var targetPixelX = tapMoveTargetTile.x * TILE_SIZE + TILE_SIZE / 2;
    var targetPixelY = tapMoveTargetTile.y * TILE_SIZE + TILE_SIZE / 2;

    var hitbox = getPlayerHitbox(player.x, player.y);
    var cx = hitbox.x + hitbox.w / 2;
    var cy = hitbox.y + hitbox.h / 2;

    var dx = targetPixelX - cx;
    var dy = targetPixelY - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.speed) {
        player.x += dx;
        player.y += dy;
        tapMovePath.shift();
        if (tapMovePath.length > 0) {
            tapMoveTargetTile = tapMovePath[0];
        } else {
            tapMoveTargetTile = null;
            updateInteractionHint();
            updateCurrentArea();
        }
        return true;
    }

    var moveX = (dx / dist) * player.speed;
    var moveY = (dy / dist) * player.speed;

    if (Math.abs(moveX) > Math.abs(moveY)) {
        player.dir = moveX > 0 ? "right" : "left";
    } else {
        player.dir = moveY > 0 ? "down" : "up";
    }

    if (!checkCollision(player.x + moveX, player.y)) player.x += moveX;
    if (!checkCollision(player.x, player.y + moveY)) player.y += moveY;
    
    return true;
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
        if (e.key === 'Escape') {
            closeMessage();
            if (currentScene !== 'station_plaza') changeScene('station_plaza');
            pendingWarp = null;
        }
        if (e.key === 'Enter' || e.key === ' ') handleActionTrigger();
    });
    window.addEventListener('keyup', function(e) { keys[e.key] = false; });

    function stopProp(e) { e.stopPropagation(); }

    function bindTouch(id, dir) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', stopProp);
        el.addEventListener('touchstart', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            if (isMessageOpen) return;
            dpad[dir] = true; 
        }, {passive: false});
        el.addEventListener('touchend', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            dpad[dir] = false; 
        }, {passive: false});
    }
    bindTouch('btn-up', 'up'); bindTouch('btn-down', 'down'); bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right');

    var btnAction = document.getElementById('btn-action');
    if (btnAction) {
        var actionFunc = function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            handleActionTrigger(); 
        };
        btnAction.addEventListener('pointerdown', stopProp);
        btnAction.addEventListener('touchstart', actionFunc, {passive: false});
        btnAction.addEventListener('click', actionFunc);
    }

    var btnDebug = document.getElementById('btn-debug-toggle');
    if (btnDebug) {
        btnDebug.addEventListener('pointerdown', stopProp);
        btnDebug.addEventListener('touchstart', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            toggleDebugMode(); 
        }, {passive: false});
        btnDebug.addEventListener('click', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            toggleDebugMode(); 
        });
    }

    var hintEl = document.getElementById('interaction-hint');
    if (hintEl) {
        hintEl.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!isEditMode && !debugMode) {
                cancelTapMove();
                handleActionTrigger();
            }
        });
    }

    var sceneContainer = document.getElementById('scene-container');
    if (sceneContainer) {
        sceneContainer.addEventListener('pointerdown', stopProp);
        sceneContainer.addEventListener('touchstart', stopProp, {passive: false});
    }

    canvas.addEventListener('pointerdown', function(e) {
        if (isMessageOpen || currentScene !== 'station_plaza') return;

        var rect = canvas.getBoundingClientRect();
        var cam = getCamera();
        var worldX = ((e.clientX - rect.left) / cam.zoom) + cam.cameraX;
        var worldY = ((e.clientY - rect.top) / cam.zoom) + cam.cameraY;
        var tileX = Math.floor(worldX / TILE_SIZE);
        var tileY = Math.floor(worldY / TILE_SIZE);

        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;

        if (isEditMode) {
            document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;
            handleEditorTap(tileX, tileY);
            return;
        }

        if (debugMode) {
            document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;
            currentHoverTile = { x: tileX, y: tileY };
            return;
        }

        startTapMoveTo(tileX, tileY);
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

function setupMessageLayerEvents() {
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    function handleMessageTap(e) {
        e.preventDefault();
        e.stopPropagation();

        if (pendingWarp) {
            var target = pendingWarp;
            pendingWarp = null;
            closeMessage();
            changeScene(target);
            return;
        }

        closeMessage();
    }

    if (msgWin) {
        msgWin.addEventListener('pointerdown', handleMessageTap);
    }

    if (backdrop) {
        backdrop.addEventListener('pointerdown', handleMessageTap);
    }
}

function handleActionTrigger() {
    if (isEditMode) return;

    if (isMessageOpen) {
        if (pendingWarp) {
            var target = pendingWarp;
            pendingWarp = null;
            closeMessage();
            changeScene(target);
            return;
        }
        closeMessage();
        return;
    }

    if (currentScene === 'station_plaza') {
        handleAction();
    }
}

function toggleDebugMode() {
    var panel = document.getElementById('editor-panel');
    var btn = document.getElementById('btn-debug-toggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex'; btn.style.display = 'none';
        debugMode = true; isEditMode = true;
        document.getElementById('debug-info').style.display = 'inline-block';
        updateEditorStatus("編集対象を選んでタップしてください");
        document.getElementById('interaction-hint').classList.remove('visible');
        document.getElementById('area-title').classList.remove('visible');
    }
}

// ==========================================
// 5. エディタ機能
// ==========================================
function setupEditorEvents() {
    document.getElementById('btn-close-editor').addEventListener('click', function() {
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('btn-debug-toggle').style.display = 'block';
        isEditMode = false; debugMode = false;
        document.getElementById('debug-info').style.display = 'none';
        editStep = 0; currentHoverTile = null;
        updateInteractionHint();
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
        try { document.execCommand('copy'); btnCopy.innerText = "コピー完了!"; setTimeout(function(){ btnCopy.innerText = "コピーする"; }, 2000); }
        catch(err) { alert("コピーに失敗しました。手動でコピーしてください。"); }
    });
}

function updateEditorStatus(msg) { document.getElementById('editor-status').innerText = msg; }
function copyGrid() { var arr = []; for (var y = 0; y < MAP_HEIGHT; y++) arr.push(collisionGrid[y].slice()); return arr; }

function handleEditorTap(tx, ty) {
    if (editTarget === 'blockedPoints') {
        editHistory.push({ type: 'grid', prev: copyGrid() });
        collisionGrid[ty][tx] = 2; 
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
            triggers.push({ id: tId, label: "新規トリガー", actionLabel: "調べる", area: newRect, type: tType, target: tTarget, text: tText });
            editHistory.push({ type: 'triggers' });
        }
        editStep = 0; currentHoverTile = null; updateEditorStatus("追加完了。次の始点をタップ");
    }
}

function gridToRects(targetValue) {
    var rects = []; var visited = [];
    for (var y = 0; y < MAP_HEIGHT; y++) { var row = []; for (var x = 0; x < MAP_WIDTH; x++) row.push(false); visited.push(row); }
    for (var y = 0; y < MAP_HEIGHT; y++) {
        for (var x = 0; x < MAP_WIDTH; x++) {
            if (collisionGrid[y][x] === targetValue && !visited[y][x]) {
                var w = 0; while (x + w < MAP_WIDTH && collisionGrid[y][x + w] === targetValue && !visited[y][x + w]) w++;
                var h = 1; var canExpand = true;
                while (y + h < MAP_HEIGHT && canExpand) {
                    for (var i = 0; i < w; i++) if (collisionGrid[y + h][x + i] !== targetValue || visited[y + h][x + i]) { canExpand = false; break; }
                    if (canExpand) h++;
                }
                for (var dy = 0; dy < h; dy++) for (var dx = 0; dx < w; dx++) visited[y + dy][x + dx] = true;
                rects.push({ x: x, y: y, w: w, h: h });
            }
        }
    }
    return rects;
}

function showExportModal() {
    var pRects = gridToRects(1); var bAll = gridToRects(2);
    var newBlockedRects = []; var newBlockedPoints = [];
    for(var i=0; i<bAll.length; i++) {
        if(bAll[i].w === 1 && bAll[i].h === 1) newBlockedPoints.push({ x: bAll[i].x, y: bAll[i].y });
        else newBlockedRects.push(bAll[i]);
    }
    var str = "var passableRects = [\n";
    for(var i=0; i<pRects.length; i++) { str += "    { x: " + pRects[i].x + ", y: " + pRects[i].y + ", w: " + pRects[i].w + ", h: " + pRects[i].h + " }"; if(i < pRects.length - 1) str += ","; str += "\n"; }
    str += "];\n\nvar blockedRects = [\n";
    for(var i=0; i<newBlockedRects.length; i++) { str += "    { x: " + newBlockedRects[i].x + ", y: " + newBlockedRects[i].y + ", w: " + newBlockedRects[i].w + ", h: " + newBlockedRects[i].h + " }"; if(i < newBlockedRects.length - 1) str += ","; str += "\n"; }
    str += "];\n\nvar blockedPoints = [\n";
    for(var i=0; i<newBlockedPoints.length; i++) { str += "    { x: " + newBlockedPoints[i].x + ", y: " + newBlockedPoints[i].y + " }"; if(i < newBlockedPoints.length - 1) str += ","; str += "\n"; }
    str += "];\n\nvar triggers = [\n";
    for(var i=0; i<triggers.length; i++) {
        var t = triggers[i];
        str += "    {\n        id: \"" + t.id + "\", label: \"" + (t.label||"") + "\", actionLabel: \"" + (t.actionLabel||"調べる") + "\",\n";
        str += "        area: { x: " + t.area.x + ", y: " + t.area.y + ", w: " + t.area.w + ", h: " + t.area.h + " },\n";
        str += "        type: \"" + t.type + "\",\n"; if (t.target) str += "        target: \"" + t.target + "\",\n"; str += "        text: \"" + t.text + "\"\n    }";
        if(i < triggers.length - 1) str += ","; str += "\n";
    }
    str += "\n];\n\nvar areaZones = [\n";
    for(var i=0; i<areaZones.length; i++) {
        var z = areaZones[i];
        str += "    {\n        id: \"" + z.id + "\", title: \"" + z.title + "\", subtitle: \"" + z.subtitle + "\",\n";
        str += "        area: { x: " + z.area.x + ", y: " + z.area.y + ", w: " + z.area.w + ", h: " + z.area.h + " }\n    }";
        if(i < areaZones.length - 1) str += ","; str += "\n";
    }
    str += "\n];\n";
    document.getElementById('export-textarea').value = str; document.getElementById('export-modal').style.display = 'flex';
}

// ==========================================
// 6. メインループと更新・判定
// ==========================================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

function update() {
    if (isMessageOpen || currentScene !== 'station_plaza' || isEditMode) return;

    var dx = 0; var dy = 0;
    var manualInput = false;

    if (keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up) { dy -= player.speed; manualInput = true; }
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down) { dy += player.speed; manualInput = true; }
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left) { dx -= player.speed; manualInput = true; }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right) { dx += player.speed; manualInput = true; }

    if (manualInput) {
        cancelTapMove();
        
        player.dir = (Math.abs(dx) > Math.abs(dy)) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

        if (!checkCollision(player.x + dx, player.y)) player.x += dx;
        if (!checkCollision(player.x, player.y + dy)) player.y += dy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.w > MAP_WIDTH * TILE_SIZE) player.x = MAP_WIDTH * TILE_SIZE - player.w;
        if (player.y < 0) player.y = 0;
        if (player.y + player.h > MAP_HEIGHT * TILE_SIZE) player.y = MAP_HEIGHT * TILE_SIZE - player.h;
        
        updateUI();
        updateInteractionHint();
        updateCurrentArea();
    } else {
        var moved = updateTapMove();
        if (moved) {
            updateUI();
            updateInteractionHint();
            updateCurrentArea();
        }
    }

    if (tapMarkerTimer > 0) {
        tapMarkerTimer--;
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
        var tx = Math.floor(points[i].x / TILE_SIZE); var ty = Math.floor(points[i].y / TILE_SIZE);
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
        var val = collisionGrid[ty][tx];
        if (val === 0 || val === 2) return true;
    }
    return false;
}

function isColliding(r1, r2) { return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y; }

function getNearbyTrigger() {
    var checkX = player.x; var checkY = player.y; var checkSize = TILE_SIZE;
    if (player.dir === 'up') checkY -= checkSize; if (player.dir === 'down') checkY += checkSize;
    if (player.dir === 'left') checkX -= checkSize; if (player.dir === 'right') checkX += checkSize;

    var targetRect = getPlayerHitbox(checkX, checkY);
    var pRect = getPlayerHitbox(player.x, player.y);

    for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        var tr = { x: t.area.x * TILE_SIZE, y: t.area.y * TILE_SIZE, w: t.area.w * TILE_SIZE, h: t.area.h * TILE_SIZE };
        if (isColliding(targetRect, tr) || isColliding(pRect, tr)) return t;
    }
    return null;
}

function updateInteractionHint() {
    var hintEl = document.getElementById('interaction-hint');
    var btnAction = document.getElementById('btn-action');

    if (isEditMode || currentScene !== 'station_plaza') {
        hintEl.classList.remove('visible');
        btnAction.innerText = "調べる";
        return;
    }

    var t = getNearbyTrigger();
    if (t) {
        document.getElementById('interaction-label').innerText = t.label || "";
        document.getElementById('interaction-action').innerText = t.actionLabel || "調べる";
        hintEl.classList.add('visible');
        btnAction.innerText = t.actionLabel || "調べる";
    } else {
        hintEl.classList.remove('visible');
        btnAction.innerText = "調べる";
    }
}

function updateCurrentArea() {
    if (currentScene !== 'station_plaza') return;

    var pRect = getPlayerHitbox(player.x, player.y);
    var centerX = pRect.x + pRect.w / 2;
    var centerY = pRect.y + pRect.h / 2;
    var tileX = Math.floor(centerX / TILE_SIZE);
    var tileY = Math.floor(centerY / TILE_SIZE);

    var foundZone = null;
    for (var i = 0; i < areaZones.length; i++) {
        var z = areaZones[i];
        if (tileX >= z.area.x && tileX < z.area.x + z.area.w && tileY >= z.area.y && tileY < z.area.y + z.area.h) {
            foundZone = z;
            break;
        }
    }

    if (foundZone && foundZone.id !== currentAreaId) {
        currentAreaId = foundZone.id;
        showAreaTitle(foundZone);
    }
}

function showAreaTitle(zone) {
    if (isEditMode) return;
    var titleEl = document.getElementById('area-title');
    document.getElementById('area-title-main').innerText = zone.title;
    document.getElementById('area-title-sub').innerText = zone.subtitle;

    titleEl.classList.remove('visible');
    setTimeout(function() { titleEl.classList.add('visible'); }, 50);

    if (areaTitleTimer) clearTimeout(areaTitleTimer);
    areaTitleTimer = setTimeout(function() { titleEl.classList.remove('visible'); }, 2200);
}

function handleAction() {
    var t = getNearbyTrigger();
    if (t) {
        if (t.type === 'inspect') {
            showMessage(t.text);
        } else if (t.type === 'warp' || t.type === 'menu') {
            var actionName = t.actionLabel || "調べる";
            showMessage(t.text + "<br><span style='font-size:14px; color:#aaa;'>(もう一度「" + actionName + "」で開く)</span>"); 
            pendingWarp = t.target; 
        }
    }
}

// ==========================================
// 7. UI・シーン・RPGメニュー管理
// ==========================================
function updateUI() {
    var tileX = Math.floor((player.x + player.w/2) / TILE_SIZE);
    var tileY = Math.floor((player.y + player.h/2) / TILE_SIZE);
    var sceneNameMap = { 'station_plaza': '駅前広場' };
    if (DESTINATIONS[currentScene]) sceneNameMap[currentScene] = DESTINATIONS[currentScene].title;
    document.getElementById('scene-name').innerText = sceneNameMap[currentScene] || currentScene;
    if (debugMode) document.getElementById('coord-display').innerText = "現在座標: (" + tileX + ", " + tileY + ")";
}

// ★ 追加: テキストフォーマットの共通化
function formatText(text) {
    return String(text || "").replace(/\n/g, "<br>");
}

function showMessage(text) {
    if (typeof cancelTapMove === "function") {
        cancelTapMove();
    }
    var msg = formatText(text);
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    msgWin.innerHTML = msg;
    msgWin.style.display = 'block';

    if (backdrop) {
        backdrop.style.display = 'block';
    }

    isMessageOpen = true;
}

function closeMessage() { 
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    msgWin.style.display = 'none';

    if (backdrop) {
        backdrop.style.display = 'none';
    }

    isMessageOpen = false; 

    if (typeof updateInteractionHint === "function") {
        updateInteractionHint();
    }
}

function resetDestinationState() {
    currentDestinationId = null;
    destinationViewMode = "intro";
    currentDestinationMessage = "";
    currentDestinationMessageTitle = "";
}

// ★ RPG共通メニューの生成と遷移
window.changeScene = function(sceneId) {
    currentScene = sceneId;
    updateUI();

    var sceneContainer = document.getElementById('scene-container');
    document.getElementById('area-title').classList.remove('visible');
    document.getElementById('interaction-hint').classList.remove('visible');
    var btnAction = document.getElementById('btn-action');
    if (btnAction) {
        btnAction.innerText = "調べる";
    }

    if (sceneId === 'station_plaza') {
        resetDestinationState();
        closeDestinationScene();
        return;
    }

    openDestination(sceneId);
};

window.openDestination = function(destId) {
    currentDestinationId = destId;
    destinationViewMode = "intro";
    currentDestinationMessage = "";
    currentDestinationMessageTitle = "";
    renderDestination();
};

window.renderDestination = function() {
    var dest = DESTINATIONS[currentDestinationId];
    if (!dest) return;

    var html = "";
    if (destinationViewMode === "intro") {
        html = renderDestinationIntro(dest);
    } else if (destinationViewMode === "menu") {
        html = renderDestinationMenu(dest);
    } else if (destinationViewMode === "message") {
        html = renderDestinationMessage(dest, currentDestinationMessageTitle, currentDestinationMessage);
    }

    var sceneContainer = document.getElementById('scene-container');
    sceneContainer.innerHTML = html;
    sceneContainer.style.display = 'block';
};

window.renderDestinationIntro = function(dest) {
    var html = '<div class="rpg-window">';
    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + dest.title + '</div>';
    if (dest.subtitle) html += '<div class="rpg-subtitle">' + dest.subtitle + '</div>';
    html += '</div>';

    if (dest.description) html += '<p class="rpg-description">' + formatText(dest.description) + '</p>';
    if (dest.flavor) html += '<p class="rpg-flavor">' + formatText(dest.flavor) + '</p>';

    html += '<div class="rpg-menu-list">';
    html += '<button class="rpg-menu-item" onclick="returnDestinationMenu()">▶ つづける</button>';
    html += '<button class="rpg-menu-item rpg-back" onclick="changeScene(\'station_plaza\')">駅前へ戻る</button>';
    html += '</div></div>';

    return html;
};

window.renderDestinationMenu = function(dest) {
    var html = '<div class="rpg-window">';
    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + dest.title + '</div>';
    if (dest.subtitle) html += '<div class="rpg-subtitle">' + dest.subtitle + '</div>';
    html += '</div>';

    if (dest.menuTitle) html += '<div class="rpg-menu-title">' + dest.menuTitle + '</div>';

    html += '<div class="rpg-menu-list">';
    for (var i = 0; i < dest.items.length; i++) {
        var item = dest.items[i];
        var btnClass = 'rpg-menu-item';
        
        if (item.kind === 'back') {
            btnClass += ' rpg-back';
            html += '<button class="' + btnClass + '" onclick="changeScene(\'station_plaza\')">' + item.label + '</button>';
        } else {
            var label = '▶ ' + item.label;
            html += '<button class="' + btnClass + '" onclick="handleDestinationItem(\'' + dest.id + '\', ' + i + ')">' + label + '</button>';
        }
    }
    html += '</div></div>';

    return html;
};

window.renderDestinationMessage = function(dest, title, text) {
    var html = '<div class="rpg-window">';
    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + title + '</div>';
    html += '</div>';

    html += '<p class="rpg-description">' + formatText(text) + '</p>';

    html += '<div class="rpg-menu-list" style="margin-top: 20px;">';
    html += '<button class="rpg-menu-item" onclick="returnDestinationMenu()">▶ 選択肢へ戻る</button>';
    html += '<button class="rpg-menu-item rpg-back" onclick="changeScene(\'station_plaza\')">駅前へ戻る</button>';
    html += '</div></div>';

    return html;
};

window.showDestinationMessage = function(title, text) {
    destinationViewMode = "message";
    currentDestinationMessageTitle = title;
    currentDestinationMessage = text;
    renderDestination();
};

window.returnDestinationMenu = function() {
    destinationViewMode = "menu";
    currentDestinationMessage = "";
    currentDestinationMessageTitle = "";
    renderDestination();
};

function closeDestinationScene() {
    var sceneContainer = document.getElementById('scene-container');
    sceneContainer.style.display = 'none';
    sceneContainer.innerHTML = '';
    updateInteractionHint();
    updateCurrentArea();
}

window.handleDestinationItem = function(destId, index) {
    var dest = DESTINATIONS[destId];
    if (!dest) return;
    var item = dest.items[index];
    if (!item) return;

    if (item.kind === 'message') {
        showDestinationMessage(item.label, item.text);
        return;
    }
    
    if (item.kind === 'external' || item.kind === 'work' || item.kind === 'game') {
        if (item.url && item.url !== "") {
            window.open(item.url, '_blank');
        } else {
            showDestinationMessage(item.label, item.emptyText || "まだ準備中です。");
        }
        return;
    }
    
    if (item.kind === 'back') {
        changeScene('station_plaza');
        return;
    }
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

    if (tapMarkerTimer > 0 && tapMarkerPos && !isEditMode && !debugMode) {
        ctx.beginPath();
        ctx.arc(tapMarkerPos.x * TILE_SIZE + TILE_SIZE / 2, tapMarkerPos.y * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (tapMarkerTimer / 60) + ")";
        ctx.fill();
    }

    if (debugMode || isEditMode) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
        for (var x = 0; x <= cam.mapPixelW; x += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cam.mapPixelH); ctx.stroke(); }
        for (var y = 0; y <= cam.mapPixelH; y += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cam.mapPixelW, y); ctx.stroke(); }

        ctx.fillStyle = 'rgba(0, 120, 255, 0.25)';
        for (var y = 0; y < MAP_HEIGHT; y++) {
            for (var x = 0; x < MAP_WIDTH; x++) { if (collisionGrid[y][x] === 1) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE); }
        }
        ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
        for (var y = 0; y < MAP_HEIGHT; y++) {
            for (var x = 0; x < MAP_WIDTH; x++) { if (collisionGrid[y][x] === 2) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE); }
        }

        ctx.fillStyle = 'rgba(255, 230, 0, 0.45)';
        for (var k = 0; k < triggers.length; k++) ctx.fillRect(triggers[k].area.x * TILE_SIZE, triggers[k].area.y * TILE_SIZE, triggers[k].area.w * TILE_SIZE, triggers[k].area.h * TILE_SIZE);

        for (var a = 0; a < areaZones.length; a++) {
            var z = areaZones[a].area;
            ctx.fillStyle = 'rgba(180, 80, 255, 0.20)'; ctx.fillRect(z.x * TILE_SIZE, z.y * TILE_SIZE, z.w * TILE_SIZE, z.h * TILE_SIZE);
            ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText(areaZones[a].title, z.x * TILE_SIZE + 2, z.y * TILE_SIZE + 10);
        }

        if (isEditMode) {
            if (editStep === 1 && currentHoverTile) {
                var minX = Math.min(editStartX, currentHoverTile.x); var minY = Math.min(editStartY, currentHoverTile.y);
                var w = Math.max(editStartX, currentHoverTile.x) - minX + 1; var h = Math.max(editStartY, currentHoverTile.y) - minY + 1;
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
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
