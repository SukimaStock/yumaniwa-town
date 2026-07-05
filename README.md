# 湯間庭町：日々更新できる土台

## そのまま入れるもの

- `index.html`
- `style.css`
- `main.js`（町の本体。通常の更新では触りません）
- `data/station-plaza.js`（背景・当たり判定・入口・エリア名）
- `data/notes.js`（note記事）
- `data/works.js`（ゲーム・触れるらくがき）
- `data/updates.js`（町の更新履歴）
- `data/places.js`（施設の説明・固定メニュー・自動組み立て）

`assets/yumaniwa_station_mock_clean.png` は今回のアップロードには含まれていません。既存のものを残してください。

## 日々の更新先

### noteを公開した
`data/notes.js` の `// [NOTES:ADD_NEWEST_HERE]` の直後に、記事を1件追加します。

### 新しいゲームやらくがきを置く
`data/works.js` の `// [WORKS:ADD_NEWEST_HERE]` の直後に1件追加します。

- `venue: "leisure_center"` → 湯窓レジャーセンター
- `venue: "tomogushi_alley"` → 灯串横丁
- `status: "open"` → URLを開く
- `status: "preparing"` → 制作メモとして保持し、町の選択肢には出さない
- `status: "hidden"` → 町には置かない

### 町を更新した
`data/updates.js` の `// [UPDATES:ADD_NEWEST_HERE]` の直後に1件追加します。
観光案内所の「更新履歴」に自動で反映されます。

## 開発モード

`main.js` の先頭近くにある次の1行だけで切り替えます。

```js
var DEV_MODE_ENABLED = false;
```

`true` にすると、開発ボタンと `G` / `D` ショートカットが戻ります。

## パッチャーで追記する場合

上の3つの `ADD_NEWEST_HERE` マーカーを使えば、長い配列を置換せずに追記できます。


## 触れるらくがきの共通プレイヤー

レジャーセンターの作品は、町の上に開く共通プレイヤーで表示します。作品そのものは iframe 内で独立して動くため、Rakugaki Engine の `setup()` / `draw()` / `touched()` やタッチ入力が町の本体と干渉しません。

- `engine/rakugaki-engine.v1.js`：触れるらくがき用の固定エンジン版
- `works/_template/`：新作を移植するための雛形
- `works/<作品ID>/`：作品ごとに独立したフォルダ
- `data/works.js`：町のどこに置くか、準備中か公開中か、どの作品ページを開くかを管理

### 作品を公開する

`data/works.js` の対象作品を、次の形にします。

```js
{
    id: "rainy-window",
    title: "雨の日の窓",
    venue: "leisure_center",
    kind: "work",
    status: "open",
    launch: "embedded",
    entry: "./works/rainy-window/index.html",
    emptyText: "この筐体は現在調整中です。"
}
```

公開中の外部ゲームは、従来どおり `launch: "external"` と `url` を使います。


## レジャーセンター：最初の実働筐体

`works/rainy-window/` に、Web移植版の **雨の日の窓** を設置しました。

- `data/works.js` の `rainy-window` は現在 `status: "open"` です。
- 町からはレジャーセンターを開き、「雨の日の窓」を選ぶと共通プレイヤー内で起動します。
- 作品を閉じると、レジャーセンターの一覧に戻ります。
- 作品固有の調整は `works/rainy-window/sketch.js` 冒頭の `CONFIG` にまとめています。

### Rakugaki Engine v1 の小さな追加

Web移植で繰り返し使いやすいよう、`engine/rakugaki-engine.v1.js` に以下を追加しました。

- `CHANGED`（`MOVING` の互換名）
- `pushStyle()` / `popStyle()`
- `blendMode(NORMAL / ADDITIVE)`
- `noise()` / `noiseSeed()`

Luaのクラスやベクター演算子まで再現するのではなく、作品側では通常のJavaScriptを使う方針です。

## 触れるらくがきの座標ルール

Rakugaki Engineの作品座標は全てCodea式です。左下が `(0, 0)`、Yは上向きです。ブラウザCanvasを使う作品は `engine/README.md` の `createCodeaLayer()` を使い、作品側にY反転処理を書かないでください。


## 作品プレイヤーの読み込み表示

iframe で作品を開く際は、町側が `作品を準備しています…` を表示します。
`iframe` の load 完了後に自動で消え、上部の「レジャーセンターへ戻る」は読み込み中でも使えます。

