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
- `status: "preparing"` → 準備中メッセージを表示
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
