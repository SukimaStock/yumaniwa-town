# 触れるらくがき：作品テンプレート

この `_template` フォルダを丸ごと複製して、作品IDのフォルダ名に変更します。

```text
works/rainy-window/
  index.html
  style.css
  work-meta.js
  sketch.js
  assets/
```

- `sketch.js`：Codea風の `setup()` / `draw()` / `touched(touch)` を書く本体。
- `assets/`：作品だけが使う画像・音素材。
- `work-meta.js`：作品内のメモ。公開設定は町側の `data/works.js` を編集します。

新しい作品を町に置くときは、`data/works.js` へ `launch: "embedded"` と `entry: "./works/<作品ID>/index.html"` を登録します。
