// ==========================================
// 湯間庭町 / 本体エンジン
// 歩行・入力・描画・画面遷移を担当します。
// 日々の更新では原則として data/ 以下だけを編集してください。
// ==========================================

// ==========================================
// 2. 状態管理・初期化
// ==========================================
var canvas, ctx;
var bgImage = new Image();
var bgLoaded = false;
var bgError = false;

// スプライト番号: 1=下, 2=左, 3=上, 4=右
// 当たり判定は従来どおり player の 16×16 のまま使う。
var PLAYER_SPRITE_PATHS = {
    stand: {
        down: 'assets/stand-1.png',
        left: 'assets/stand-2.png',
        up: 'assets/stand-3.png',
        right: 'assets/stand-4.png'
    },
    walk: {
        down: 'assets/walk-1.png',
        left: 'assets/walk-2.png',
        up: 'assets/walk-3.png',
        right: 'assets/walk-4.png'
    }
};

var playerSprites = {
    stand: { down: null, left: null, up: null, right: null },
    walk: { down: null, left: null, up: null, right: null }
};

// スプライト画像の本来の縦横比を保ったまま描く。
// height を上げると、町の中での人物の存在感も上がる。
var PLAYER_SPRITE_DRAW = { height: 32 };

// 実際に何px歩いたら、stand / walk を切り替えるか。
// さらにゆっくり見せるため、1.5タイルぶん（24px）で切り替える。
var PLAYER_WALK_STEP_PX = 24;


var player = {
    x: PLAYER_START.x * TILE_SIZE,
    y: PLAYER_START.y * TILE_SIZE,
    w: 16,
    h: 16,
    speed: 2,
    dir: 'down',
    isMoving: false,
    walkDistance: 0,
    walkFrame: 0,
    walkWasMoving: false
};
var currentScene = 'station_plaza';
var isMessageOpen = false;
var pendingWarp = null;

// 開発モードを戻すときは、この値だけ true にしてください。
var DEV_MODE_ENABLED = false;
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

// 町内コンテンツ用: 触れるらくがき・itch.ioゲームを iframe 内で開く共通プレイヤー
var isWorkPlayerOpen = false;
var currentWorkId = null;
var workPlayerReturnDestinationId = null;

function getWorkPlayerSource(work) {
    if (!work) return "";

    if (work.launch === "itch_embed") {
        return work.embedUrl || "";
    }

    return work.entry || "";
}

function getWorkPlayerReturnLabel(work) {
    if (work && work.returnLabel) {
        return work.returnLabel;
    }

    if (work && work.venue === "tomogushi_alley") {
        return "灯串横丁へ戻る";
    }

    if (work && work.venue === "leisure_center") {
        return "レジャーセンターへ戻る";
    }

    return "町へ戻る";
}


function clearDpadInput() {
    dpad.up = false;
    dpad.down = false;
    dpad.left = false;
    dpad.right = false;

    var ids = ["btn-up", "btn-down", "btn-left", "btn-right"];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.classList.remove("pressed");
    }
}

function updateControlVisibility() {
    var controls = document.getElementById("mobile-controls");
    if (!controls) return;

    if (isMessageOpen || isEditMode || debugMode || isWorkPlayerOpen || currentScene !== "station_plaza") {
        controls.classList.add("disabled");
    } else {
        controls.classList.remove("disabled");
    }
}


function applyDeveloperModeVisibility() {
    if (DEV_MODE_ENABLED) return;

    var panel = document.getElementById('editor-panel');
    var button = document.getElementById('btn-debug-toggle');
    var info = document.getElementById('debug-info');

    if (panel) panel.style.display = 'none';
    if (button) button.style.display = 'none';
    if (info) info.style.display = 'none';

    debugMode = false;
    isEditMode = false;
}

function setupTouchSelectionGuards() {
    // 町の操作領域だけ、iPhone Safari の長押し選択・虫眼鏡を抑止する。
    // scene-container は除外し、施設メニューの縦スクロールは残す。
    // 作品プレイヤーの「戻る」ボタンは、Safari の click を確実に受け取れるよう除外する。
    var gameTouchSelector =
        "#game-canvas, #mobile-controls, #interaction-hint, " +
        "#message-window, #message-backdrop, #work-player-frame, #work-player-loading";

    function isEditableTarget(target) {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            (target && target.isContentEditable)
        );
    }

    function isInteractiveControl(target) {
        return !!(
            target &&
            target.closest &&
            target.closest("button, a, input, textarea, select, [role=button]")
        );
    }

    function isGameTouchTarget(target) {
        if (!target || isEditableTarget(target) || isInteractiveControl(target) || !target.closest) return false;
        return !!target.closest(gameTouchSelector);
    }

    function blockNativeGameTouch(e) {
        if (isGameTouchTarget(e.target)) {
            e.preventDefault();
        }
    }

    document.addEventListener("selectstart", blockNativeGameTouch);
    document.addEventListener("dragstart", blockNativeGameTouch);
    document.addEventListener("contextmenu", blockNativeGameTouch);
    document.addEventListener("touchstart", blockNativeGameTouch, { passive: false });
    document.addEventListener("touchmove", blockNativeGameTouch, { passive: false });
}


window.onload = function() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    applyDeveloperModeVisibility();
    setupTouchSelectionGuards();
    if (typeof refreshTownContent === 'function') refreshTownContent();
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    initGrid();

    bgImage.onload = function() { bgLoaded = true; };
    bgImage.onerror = function() { bgError = true; };
    bgImage.src = BG_IMAGE_PATH;
    loadPlayerSprites();

    setupEvents();
    setupEditorEvents();
    setupMessageLayerEvents();
    setupWorkPlayerEvents();
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

function loadPlayerSprites() {
    var poses = ['stand', 'walk'];
    var dirs = ['down', 'left', 'up', 'right'];

    for (var p = 0; p < poses.length; p++) {
        for (var d = 0; d < dirs.length; d++) {
            var pose = poses[p];
            var dir = dirs[d];
            var image = new Image();

            image.src = PLAYER_SPRITE_PATHS[pose][dir];
            playerSprites[pose][dir] = image;
        }
    }
}

function drawFallbackPlayer(px, py) {
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
}

function updatePlayerWalkAnimation(movedDistance) {
    if (!player.isMoving) {
        player.walkDistance = 0;
        player.walkFrame = 0;
        player.walkWasMoving = false;
        return;
    }

    // 動き始めた最初のフレームから walk を出す。
    if (!player.walkWasMoving) {
        player.walkWasMoving = true;
        player.walkFrame = 1;
        player.walkDistance = 0;
        return;
    }

    player.walkDistance += Math.max(0, movedDistance || 0);

    while (player.walkDistance >= PLAYER_WALK_STEP_PX) {
        player.walkDistance -= PLAYER_WALK_STEP_PX;
        player.walkFrame = player.walkFrame === 0 ? 1 : 0;
    }
}

function getPlayerSpritePose() {
    if (!player.isMoving) return 'stand';
    return player.walkFrame === 1 ? 'walk' : 'stand';
}

function drawPlayerSprite(px, py) {
    var pose = getPlayerSpritePose();
    var sprite = playerSprites[pose] && playerSprites[pose][player.dir];

    if (!sprite || !sprite.complete || !sprite.naturalWidth) {
        drawFallbackPlayer(px, py);
        return;
    }

    // PNGの自然な縦横比を維持する。
    // 正方形PNGなら32×32、縦長PNGなら自然に縦長のまま描かれる。
    var drawH = PLAYER_SPRITE_DRAW.height;
    var sourceRatio = sprite.naturalWidth / sprite.naturalHeight;
    var drawW = Math.round(drawH * sourceRatio);

    // 足元を従来の16pxプレイヤー枠の下端に合わせる。
    var drawX = Math.round(px + (player.w - drawW) / 2);
    var drawY = Math.round(py + player.h - drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    ctx.restore();
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
        if (DEV_MODE_ENABLED && (e.key === 'g' || e.key === 'G' || e.key === 'd' || e.key === 'D')) toggleDebugMode();
        if (e.key === 'Escape') {
            if (isWorkPlayerOpen) {
                closeWorkPlayer();
                return;
            }
            closeMessage();
            if (currentScene !== 'station_plaza') changeScene('station_plaza');
            pendingWarp = null;
        }
        if (e.key === 'Enter' || e.key === ' ') handleActionTrigger();
    });
    window.addEventListener('keyup', function(e) { keys[e.key] = false; });

    window.addEventListener("blur", clearDpadInput);
    document.addEventListener("visibilitychange", function() {
        if (document.hidden) clearDpadInput();
    });

    function stopProp(e) { e.stopPropagation(); }

    function bindDpadButton(id, dir) {
        var el = document.getElementById(id);
        if (!el) return;

        function press(e) {
            e.preventDefault();
            e.stopPropagation();

            if (isMessageOpen || isEditMode || debugMode || currentScene !== "station_plaza") return;

            cancelTapMove();
            dpad[dir] = true;
            el.classList.add("pressed");

            if (el.setPointerCapture && e.pointerId !== undefined) {
                try {
                    el.setPointerCapture(e.pointerId);
                } catch (err) {}
            }
        }

        function release(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            dpad[dir] = false;
            el.classList.remove("pressed");

            if (el.releasePointerCapture && e && e.pointerId !== undefined) {
                try {
                    el.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }
        }

        el.addEventListener("pointerdown", press, { passive: false });
        el.addEventListener("pointerup", release, { passive: false });
        el.addEventListener("pointercancel", release, { passive: false });
        el.addEventListener("pointerleave", release, { passive: false });
    }

    bindDpadButton("btn-up", "up");
    bindDpadButton("btn-down", "down");
    bindDpadButton("btn-left", "left");
    bindDpadButton("btn-right", "right");

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
    if (DEV_MODE_ENABLED && btnDebug) {
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

    // Safariの虫眼鏡・長押し選択を、ゲームCanvas自身で確実に抑止する。
    // 施設メニューや作品プレイヤーのボタンには触れない。
    function suppressCanvasNativeGesture(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    function applyNativeGestureSuppression(el) {
        if (!el) return;

        el.style.webkitTouchCallout = 'none';
        el.style.webkitUserSelect = 'none';
        el.style.userSelect = 'none';
        el.oncontextmenu = function() {
            return false;
        };

        el.addEventListener('selectstart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('dragstart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('contextmenu', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('touchstart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('touchmove', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('gesturestart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('gesturechange', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('gestureend', suppressCanvasNativeGesture, { passive: false });
    }

    // Canvas本体
    applyNativeGestureSuppression(canvas);

    // 十字キー・調べるボタン側でも虫眼鏡を抑止する
    applyNativeGestureSuppression(document.getElementById('mobile-controls'));
    applyNativeGestureSuppression(document.getElementById('dpad'));
    applyNativeGestureSuppression(document.getElementById('btn-action'));

    var dpadButtons = document.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(function(btn) {
        applyNativeGestureSuppression(btn);
    });

    canvas.addEventListener('pointerdown', function(e) {
        e.preventDefault();

        if (isMessageOpen || currentScene !== 'station_plaza') return;

        var rect = canvas.getBoundingClientRect();
        var cam = getCamera();
        var worldX = ((e.clientX - rect.left) / cam.zoom) + cam.cameraX;
        var worldY = ((e.clientY - rect.top) / cam.zoom) + cam.cameraY;
        var tileX = Math.floor(worldX / TILE_SIZE);
        var tileY = Math.floor(worldY / TILE_SIZE);

        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;

        if (isEditMode) {
            document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;
            handleEditorTap(tileX, tileY);
            return;
        }

        if (debugMode) {
            document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;
            currentHoverTile = { x: tileX, y: tileY };
            return;
        }

        startTapMoveTo(tileX, tileY);
    });

    canvas.addEventListener('pointermove', function(e) {
        e.preventDefault();

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
    if (!DEV_MODE_ENABLED) return;

    var panel = document.getElementById('editor-panel');
    var btn = document.getElementById('btn-debug-toggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex'; btn.style.display = 'none';
        debugMode = true; isEditMode = true;
        document.getElementById('debug-info').style.display = 'inline-block';
        updateEditorStatus("編集対象を選んでタップしてください");
        document.getElementById('interaction-hint').classList.remove('visible');
        document.getElementById('area-title').classList.remove('visible');
        clearDpadInput();
        updateControlVisibility();
    }
}


// ==========================================
// 5. エディタ機能
// ==========================================
function setupEditorEvents() {
    document.getElementById('btn-close-editor').addEventListener('click', function() {
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('btn-debug-toggle').style.display = DEV_MODE_ENABLED ? 'block' : 'none';
        isEditMode = false; debugMode = false;
        document.getElementById('debug-info').style.display = 'none';
        editStep = 0; currentHoverTile = null;
        updateInteractionHint();
        updateControlVisibility();
    });

    document.getElementById('edit-target').addEventListener('change', function(e) {
        editTarget = e.target.value; editStep = 0; currentHoverTile = null;
        document.getElementById('trigger-form').style.display = (editTarget === 'triggers') ? 'block' : 'none';
        updateEditorStatus(editTarget + " を編集します");
    });

    document.getElementById('btn-editor-undo').addEventListener('click', function() {
        if (editHistory.length === 0) { updateEditorStatus("Undoする履歴がありません"); return; }
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
        try { document.execCommand('copy'); btnCopy.innerText = "コピー完了!"; setTimeout(function(){ btnCopy.innerText = "コピーする"; }, 2000); }
        catch(err) { alert("コピーに失敗しました。手動でコピーしてください。"); }
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
    var str = "// data/station-plaza.js に貼り付けるエクスポート\n\nvar passableRects = [\n";
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
    if (isMessageOpen || currentScene !== 'station_plaza' || isEditMode) {
        player.isMoving = false;
        updatePlayerWalkAnimation(0);
        return;
    }

    var dx = 0; var dy = 0;
    var manualInput = false;
    var movedDistance = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up) { dy -= player.speed; manualInput = true; }
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down) { dy += player.speed; manualInput = true; }
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left) { dx -= player.speed; manualInput = true; }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right) { dx += player.speed; manualInput = true; }

    if (manualInput) {
        var beforeManualX = player.x;
        var beforeManualY = player.y;

        cancelTapMove();
        
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        player.dir = (Math.abs(dx) > Math.abs(dy)) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

        if (!checkCollision(player.x + dx, player.y)) player.x += dx;
        if (!checkCollision(player.x, player.y + dy)) player.y += dy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.w > MAP_WIDTH * TILE_SIZE) player.x = MAP_WIDTH * TILE_SIZE - player.w;
        if (player.y < 0) player.y = 0;
        if (player.y + player.h > MAP_HEIGHT * TILE_SIZE) player.y = MAP_HEIGHT * TILE_SIZE - player.h;

        var manualMovedX = player.x - beforeManualX;
        var manualMovedY = player.y - beforeManualY;

        movedDistance = Math.sqrt(
            manualMovedX * manualMovedX +
            manualMovedY * manualMovedY
        );

        // 壁に当たって動いていない時は、足踏みしない。
        player.isMoving = movedDistance > 0.01;
        
        updateUI();
        updateInteractionHint();
        updateCurrentArea();
    } else {
        // 経路の最初・最後の短い一歩も含め、タップ移動中は歩行アニメを維持する。
        var tapPathWasActive = !!tapMoveTargetTile;
        var beforeTapX = player.x;
        var beforeTapY = player.y;
        var moved = updateTapMove();

        var tapMovedX = player.x - beforeTapX;
        var tapMovedY = player.y - beforeTapY;

        movedDistance = Math.sqrt(
            tapMovedX * tapMovedX +
            tapMovedY * tapMovedY
        );

        var movedThisFrame = movedDistance > 0.01;

        // 経路が続いている間は、タップ移動の歩行ポーズを保つ。
        player.isMoving =
            movedThisFrame ||
            tapPathWasActive ||
            !!tapMoveTargetTile;

        if (moved) {
            updateUI();
            updateInteractionHint();
            updateCurrentArea();
        }
    }

    updatePlayerWalkAnimation(movedDistance);

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
        if (t.type === "inspect") {
            showMessage(t.text);
        } else if (t.type === "warp" || t.type === "menu") {
            if (t.target === "shinpo_board") {
                refreshShinpoBoard();
            }

            var actionName = t.actionLabel || "調べる";
            showMessage(t.text + "<br><span style='font-size:14px; color:#aaa;'>(もう一度「" + actionName + "」で開く)</span>");
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
    clearDpadInput();
    updateControlVisibility();
}


function closeMessage() { 
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    msgWin.style.display = 'none';

    if (backdrop) {
        backdrop.style.display = 'none';
    }

    isMessageOpen = false; 
    updateControlVisibility();

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
        btnAction.innerText = "調べる";
    }

    if (sceneId === 'station_plaza') {
        resetDestinationState();
        closeDestinationScene();
        clearDpadInput();
        updateControlVisibility();
        return;
    }

    openDestination(sceneId);
    clearDpadInput();
    updateControlVisibility();
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

function setWorkPlayerLoading(isLoading, label) {
    var loading = document.getElementById("work-player-loading");
    var loadingLabel = document.getElementById("work-player-loading-label");

    if (!loading) return;

    if (loadingLabel && label) {
        loadingLabel.innerText = label;
    }

    loading.classList.toggle("visible", !!isLoading);
    loading.setAttribute("aria-hidden", isLoading ? "false" : "true");
}

function setupWorkPlayerEvents() {
    var closeButton = document.getElementById("btn-close-work");
    var frame = document.getElementById("work-player-frame");

    if (closeButton) {
        // pointerup と click の両方を受ける。iPhone Safari で click が遅延・欠落しても戻れるようにする。
        var closeFromControl = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeWorkPlayer();
        };

        closeButton.addEventListener("pointerup", closeFromControl, { passive: false });
        closeButton.addEventListener("click", closeFromControl);
    }

    if (frame) {
        frame.addEventListener("load", function() {
            if (!isWorkPlayerOpen) return;

            // about:blank ではなく、指定した作品が読み込まれた時だけローディングを閉じる。
            if (frame.src && frame.src !== "about:blank") {
                window.setTimeout(function() {
                    if (isWorkPlayerOpen) {
                        setWorkPlayerLoading(false);
                    }
                }, 120);
            }
        });
    }

    window.addEventListener("message", function(e) {
        var frame = document.getElementById("work-player-frame");
        if (!isWorkPlayerOpen || !frame || e.source !== frame.contentWindow) return;

        if (e.data && e.data.type === "yumaniwa:close-work") {
            closeWorkPlayer();
        }
    });
}

window.openWorkPlayer = function(work) {
    var source = getWorkPlayerSource(work);

    if (!work || !source) {
        showDestinationMessage(
            work && work.title ? work.title : "作品",
            work && work.emptyText ? work.emptyText : "この作品は、まだ準備中です。"
        );
        return;
    }

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var title = document.getElementById("work-player-title");
    var closeButton = document.getElementById("btn-close-work");

    if (!playerLayer || !frame || !title) return;

    if (typeof cancelTapMove === "function") {
        cancelTapMove();
    }

    currentWorkId = work.id || null;
    workPlayerReturnDestinationId = currentDestinationId;
    isWorkPlayerOpen = true;

    title.innerText = work.title || "町内コンテンツ";
    frame.title = work.title || "町内コンテンツ";

    // itch.ioの埋め込みゲームでも、音・全画面・ゲームパッド利用を許可する。
    frame.setAttribute("allow", "autoplay; fullscreen; gamepad");
    frame.setAttribute("allowfullscreen", "");
    frame.allowFullscreen = true;

    if (closeButton) {
        closeButton.innerText = getWorkPlayerReturnLabel(work);
    }

    setWorkPlayerLoading(true, "作品を準備しています…");
    frame.src = source;

    playerLayer.classList.add("visible");
    playerLayer.setAttribute("aria-hidden", "false");

    clearDpadInput();
    updateControlVisibility();
};

window.closeWorkPlayer = function() {
    if (!isWorkPlayerOpen) return;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");

    setWorkPlayerLoading(false);

    if (frame) {
        // iframe を空ページへ戻して、作品側のアニメーション・音・入力を確実に止める。
        frame.src = "about:blank";
    }

    var closeButton = document.getElementById("btn-close-work");
    if (closeButton) {
        closeButton.innerText = "レジャーセンターへ戻る";
    }

    if (playerLayer) {
        playerLayer.classList.remove("visible");
        playerLayer.setAttribute("aria-hidden", "true");
    }

    isWorkPlayerOpen = false;
    currentWorkId = null;

    if (workPlayerReturnDestinationId && DESTINATIONS[workPlayerReturnDestinationId]) {
        currentDestinationId = workPlayerReturnDestinationId;
        destinationViewMode = "menu";
        currentDestinationMessage = "";
        currentDestinationMessageTitle = "";
        renderDestination();
    }

    workPlayerReturnDestinationId = null;
    clearDpadInput();
    updateControlVisibility();
};

window.launchWork = function(work) {
    if (!work) {
        showDestinationMessage("作品", "作品データが見つかりませんでした。");
        return;
    }

    if (work.status !== "open") {
        showDestinationMessage(
            work.title,
            work.emptyText || "この作品は、まだ準備中です。"
        );
        return;
    }

    var launch = work.launch || (work.url ? "external" : "embedded");

    if (launch === "embedded" || launch === "itch_embed") {
        openWorkPlayer(work);
        return;
    }

    if (launch === "external" && work.url) {
        window.open(work.url, "_blank");
        return;
    }

    showDestinationMessage(
        work.title,
        work.emptyText || "この作品は、まだ準備中です。"
    );
};

window.handleDestinationItem = function(destId, index) {
    var dest = DESTINATIONS[destId];
    if (!dest) return;
    var item = dest.items[index];
    if (!item) return;

    if (item.kind === 'message') {
        showDestinationMessage(item.label, item.text);
        return;
    }

    if (item.workId) {
        launchWork(getWorkById(item.workId));
        return;
    }

    if (item.kind === 'external') {
        if (item.url && item.url !== "") {
            window.open(item.url, '_blank');
        } else {
            showDestinationMessage(item.label, item.emptyText || "まだ準備中です。");
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
        var px = player.x;
        var py = player.y;

        drawPlayerSprite(px, py);

        if (debugMode || isEditMode) {
            var hitbox = getPlayerHitbox(px, py);
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 1;
            ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
        }
    }
    ctx.restore();
}
