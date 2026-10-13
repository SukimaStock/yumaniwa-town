# 観光協会0.5 — Production候補記録

状態：PR候補。Productionへのマージ・配信はユーザーの次の承認後。

- Production base: `3965de1abf5b5b48bd4c9bccca9c8f117a874fd7`
- Staging完成版: `0f1e49312a06fcbbdb5a278cdd9dcefc11e55ba1`（0.5）
- Sitemap契約準備: Staging PR #360、merge `0a25ab8385d6273955331d705899926ec5b5876b`。6チェック成功。
- 公開予定URL: https://sukimastock.github.io/yumaniwa-town/works/yumaniwa-tourist-desk/

## 移送範囲

完成済みの8 runtime/dataファイル、vendor/3d配下のモジュール12個・原典モデル8個・8件のcollection索引、依存のSHA256一覧。Lab全体、300モデル、Stagingの実験・開発文書・他作品は移送しない。

app / renderer / sceneのLab importとcollection baseを作品内部vendorへ変更。それ以外のJS、CSS、layout、pinch、noticesはStagingと完全一致。HTMLはrobotsをindex,followへ変更し、正式URLの自己canonicalを追加しただけ。既存のSSE Engine v0.3.0と駅前地図はStagingと同一なので追加・上書きしない。

data/standalone-pages.jsonは今回承認された独立ページ1件だけを明示する。既存作品のWORKSやlifecycle台帳、町内施設に登録しない。generator / validator / snapshot検査に最小限の対応を移送し、sitemap.xmlはgeneratorで1URLだけ追加。既存10作品のw/en/w紹介ページは無変更。既存PUMPOKO auditのsitemap期待値に明示した独立ページを含めるだけの調整と、専用production候補auditを追加する。検査を省略しない。

専用OGP画像は未作成。存在しない画像を指定しない。Search Console、Bing設定、登録リクエスト、町トップのナビ・canonical・既存画像は変更しない。将来の建物は今回追加せず、上記URLを固定する。

## 検証

- Staging作品31テスト、sitemap/validator/lifecycle57テスト、Change OS139テスト成功。
- Production専用5テスト＋実app入力fixture1テスト、既存作品／町内直リンク27テスト、開発者入口／editor35テスト成功。
- Production Release Validator: FAIL 0 / HQ_REQUIRED 0（外部・実機確認はUNVERIFIED）。Generatorの既存10作品とsitemapの完全一致チェック成功。
- 22依存のSHA256（vendorの原典20ファイル、既存SSEと地図2ファイル）一致。collection索引は8件だけで原典エントリを保持。再帰的な静的module graph17件を全確認し、8モデルの実loadDesk読込9リクエストをテスト。
- 390×844 / 844×390 / 768×1024 / 1366×900の初期／途中／操作後／最大、16フレームをMesa/EGLで描画。実シェーダーcompile/link、GL error 0。16画像すべてStagingと完全一致。
- HTMLの施設3件、地図、通知2件、通常リンク、100svh領域を検査。既存の電話／スタンプ／ランプ／マッチ箱の最大ズーム時の選択、ピンチでの角度・距離変化と元の姿勢復帰、入力分離を確認。
- 実iPhone/iPadとPCブラウザでの描画、スクロール、触感、音は未検証。Productionの実配信確認はまだ行えない（未マージ）。CI成功を実機確認やRelease Completeと扱わない。

## 差分保護と次の操作

町トップindex/main/style、既存Engine、既存作品runtime、町の台帳・画像・Search Console/Bingファイルはbaseと一致。変更は新作フォルダ、専用テストとaudit、明示された独立ページmanifest、sitemap、生成・検査の最小変更だけ。

ユーザーがProduction PRを承認した後に、headが検証済みSHAから変わっていないこととActions成功を確認してマージする。その後同merge SHAのPages成功、正式URLのHTML/依存/リンク/SEO/地図/sitemapを照合する。今回のPRではマージしない。

復旧：このPRのmergeを通常のrevertで戻す。既存の作品や町のコードを上書きして戻さない。Stagingの0.5は保持する。
