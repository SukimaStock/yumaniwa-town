# 日々の追記テンプレート

## note

```javascript
// [ADD_AFTER: [NOTES:ADD_NEWEST_HERE]]
{
    id: "20260704-example",
    title: "記事タイトル",
    url: "https://note.com/hamamah/n/xxxxxxxx",
    publishedAt: "2026-07-04",
    featured: false
},
// [END_PATCH]
```

## 作品

```javascript
// [ADD_AFTER: [WORKS:ADD_NEWEST_HERE]]
{
    id: "new-work-id",
    title: "新しい作品",
    venue: "leisure_center",
    kind: "work",
    status: "preparing",
    url: "",
    emptyText: "この筐体は現在調整中です。"
},
// [END_PATCH]
```

## 更新履歴

```javascript
// [ADD_AFTER: [UPDATES:ADD_NEWEST_HERE]]
{
    date: "2026-07-04",
    title: "更新タイトル",
    body: "町に追加したことを短く書きます。",
    tags: ["system"]
},
// [END_PATCH]
```


## 触れるらくがきを公開する

```javascript
// [ADD_AFTER: [WORKS:ADD_NEWEST_HERE]]
{
    id: "new-rakugaki",
    title: "新しい触れるらくがき",
    venue: "leisure_center",
    kind: "work",
    status: "open",
    launch: "embedded",
    entry: "./works/new-rakugaki/index.html",
    emptyText: "この筐体は現在調整中です。"
},
// [END_PATCH]
```

作品フォルダは `works/_template/` を複製して作ります。

## 外部ゲームを追加する

```javascript
// [ADD_AFTER: [WORKS:ADD_NEWEST_HERE]]
{
    id: "new-game",
    title: "新しいゲーム",
    venue: "tomogushi_alley",
    kind: "game",
    status: "open",
    launch: "external",
    url: "https://example.com",
    emptyText: "勝負台は準備中です。"
},
// [END_PATCH]
```
