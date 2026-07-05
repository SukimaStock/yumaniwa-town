# Rakugaki Engine の版管理と座標契約

`rakugaki-engine.v1.js` は、最初に町へ置いた触れるらくがき向けの固定版です。

- 軽微な不具合修正：v1に反映してよい。
- 座標系、入力、描画タイミングなど互換性に影響する変更：`rakugaki-engine.v2.js` を新設する。
- 古い作品は古い版を参照したままにする。

この方針により、エンジンを育てても、すでに町に置いた作品が急に壊れません。

## 座標契約（全作品共通）

作品の `setup()` / `draw()` / `touched(touch)` は、**すべて Codea と同じ座標**です。

```text
左下     = (0, 0)
左上     = (0, HEIGHT)
右下     = (WIDTH, 0)
右上     = (WIDTH, HEIGHT)
Yの正方向 = 上
```

`touch.x` / `touch.y` も同じ座標です。落下は `y` を減らす方向、上へ動かすときは `y` を増やす方向に書きます。

## ブラウザCanvasを直接使わない

ブラウザ標準Canvasは左上原点・Y下向きです。作品側で `HEIGHT - y` や `ctx.drawImage(...)` の上下反転を手書きすると、今回のような逆転事故が起きやすくなります。

オフスクリーンの描画層、消しゴム層、マスク、指で塗る層には、必ず `CodeaLite.createCodeaLayer()` を使います。

```javascript
var paintLayer = CodeaLite.createCodeaLayer(WIDTH, HEIGHT, 0.6);

paintLayer.withCodeaContext(function(ctx) {
  // この中も左下原点・Y上向き。
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
});

paintLayer.eraseSoftEllipse(touch.x, touch.y, 20, 20, 0.8);
paintLayer.drawToScreen(0, 0, WIDTH, HEIGHT, { smoothing: true });
```

`createTopLeftLayer()` も同じ機能の互換別名として残していますが、新規作品では意味が明確な `createCodeaLayer()` を使います。

## 移植直後の必須確認

新しい作品を町へ置く前に、作品の `sketch.js` で次を一度だけ有効にします。

```javascript
var COORDINATE_CHECK = true;
```

`draw()` の最後に、次があることを確認してください。

```javascript
if (COORDINATE_CHECK) {
  CodeaLite.drawCoordinateGuide({
    label: "Codea座標確認：下 = y 0 / 上 = y HEIGHT"
  });
}
```

確認することは3つです。

1. 左下の印が `(0, 0)`、左上の印が `(0, HEIGHT)` に出る。
2. 画面上側をタップすると、黄色いタッチマーカーも上側に出る。
3. 画面下側をタップすると、黄色いタッチマーカーも下側に出る。

確認後は必ず `false` に戻して公開します。

## v1で使える補助API

- `CHANGED`（タッチ移動時。`MOVING` と同じ値）
- `pushStyle()` / `popStyle()`
- `blendMode(NORMAL)` / `blendMode(ADDITIVE)`
- `noise(x, y, z)` / `noiseSeed(seed)`
- `CodeaLite.createCodeaLayer(width, height, pixelScale)`
- `CodeaLite.drawCoordinateGuide(options)`

Luaの `class()` や `vec2` の演算子オーバーロードはエンジンに入れません。作品側で普通のJavaScript class / object を使ってください。
