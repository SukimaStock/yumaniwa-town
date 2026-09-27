# 湯間庭町 リリース運用

湯間庭町では、staging と本番環境の差分が一方向に流れるよう、以下を基本ルールとする。

## 基本フロー

1. 変更・新機能・作品追加は、まず `yumaniwa-town-staging` に反映する。
2. staging で実機確認・表示確認・導線確認を行う。
3. 問題がなければ、確認済みの変更を `yumaniwa-town`（本番）へ反映する。
4. 本番反映後、staging と本番の意図した差分だけが残っていることを確認する。

原則として、**staging → 本番** の順序を崩さない。

## 本番を直接修正した場合

障害や公開中の不具合など、緊急対応として本番を先に修正することは許容する。

ただし、その場合は対応完了後に必ず同じ修正を staging に戻す。

本番だけに修正を残したまま、次の staging 作業を進めない。

## Search / Share v2

作品Search / Shareの正本は `data/work-search-meta.js`、生成器は `tools/generate-work-search-pages.cjs` とする。
日本語は `/w/<id>/`、英語は `/en/w/<id>/`。両方を自己canonicalとし、`ja / en / x-default` のhreflangで相互接続する。

`w/<id>/index.html`、`en/w/<id>/index.html`、`sitemap.xml` は生成物として直接編集しない。
production反映時は、公開してよい全作品IDを `--published` に明示し、`--env production` で生成後に `--check` を通す。stagingのopen集合をproductionへ自動採用しない。

検索流入のために作品にないジャンル・評価語・意味を足さない。固有作品名をSEO都合で勝手に英訳・改名せず、必要な別名はmetadataの `alternateNames` で管理する。 `terms` はmeta keywordsには出力しない。

## 本番反映前の確認

本番へ反映する前に、少なくとも以下を確認する。

- staging で対象機能が正常に動くこと
- staging にだけ残す実験コードやデバッグコードが混ざっていないこと
- 本番側にだけ存在する修正がないこと
- 本番側にだけ修正がある場合は、先に staging へ取り込んでから反映すること
- 作品追加時は、町内導線・直リンク・Manifest・更新履歴・必要な会話や計測も合わせて確認すること

## 差分がずれた場合

staging と本番の双方に独自変更がある場合、どちらか一方で丸ごと上書きしない。

変更内容を確認し、

1. 本番にしかない有効な修正を staging に戻す
2. staging で統合状態を確認する
3. 統合済み staging を基準に本番へ反映する

の順で解消する。

---

**基本原則: staging を次の本番状態の正本として保つ。**
