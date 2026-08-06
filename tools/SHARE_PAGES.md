# 作品共有ページ

Xのサムネイルとスマートフォンのホーム画面アイコンを、作品ごとに設定するための仕組みです。

## 新しい作品の追加

1. `assets/ogp/` に1200×630pxの共有画像を置く
2. `assets/icons/` に180×180pxと32×32pxのアイコンを置く
3. `tools/share-pages.json` の `pages` に作品情報を追加する
4. 次を実行する

```bash
python3 tools/create-share-pages.py
```

`<slug>/index.html` が生成されます。

## URLの使い分け

- 町内・既存リンク: `/?work=dotweather`
- X、note、ホーム画面追加: `/dotweather/`

生成されたページは既存作品を全画面iframeで読み込むため、作品本体を複製しません。
