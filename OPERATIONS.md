# 湯間庭町 安全運用ルール

GitHub の `main` を唯一の正本とする。
Working Copy / Pythonista / YumaniwaDesk / GPT は、すべてこの正本へ合流するための作業経路として扱う。

## 毎回の基本手順

### 作業前
1. Working Copy で `yumaniwa-town` を開く。
2. Status を確認し、未コミット変更がないことを確認する。
3. Pull する。
4. `HEAD / main / origin/main` が同じコミットを指すことを確認する。
5. YumaniwaDesk の「同期確認済み」を押してから編集を始める。

### 作業後
1. Working Copy で変更ファイルと差分を確認する。
2. 意図していないファイルが1つでもあれば Commit しない。
3. 内容が分かる Commit メッセージを付ける。
4. Push する。
5. `HEAD / main / origin/main` が再び一致したことを確認する。
6. 公開画面で実際の動作を確認する。

## 変更経路の使い分け

### Working Copy から直接更新してよいもの
日常的な町のデータ更新で、YumaniwaDeskや開発モードの安全確認を通したもの。

- `data/notes.js`
- `data/works.js`
- `data/updates.js`
- `data/station-plaza.js`
- `data/town-maps.js`
- `tools/YumaniwaDesk.py`

必ず差分を目視してから Commit / Push する。

### branch → PR を必須とするもの
本体挙動・公開条件・安全装置に関わる変更。

- `main.js`
- `index.html`
- `developer-access.js`
- `town-editor-upgrade.js`
- `engine/`
- `.github/workflows/`
- 本番/stagingの公開条件に関わる変更

GPTによる変更は、原則すべて branch → 差分確認 → PR → merge とする。GPTから `main` へ直接書き込まない。

## 本番で守る条件

- `index.html` に `noindex` を入れない。
- `main.js` の既定値は `DEV_MODE_ENABLED = false` のままにする。
- 本番の開発機能は `?dev=1` を明示した場合だけ有効にする。
- 通常アクセスでは開発UIを表示しない。
- `developer-access.js` を `main.js` より後に読み込む。

## stagingで守る条件

- staging は検索避けの `noindex,nofollow` を維持する。
- staging の開発機能は通常アクセスでも利用できる状態を維持する。
- staging → production の移行時に、staging固有設定をそのまま本番へ上書きしない。

## 町の開発モード

1. `?dev=1` で開く。
2. 見た目・当たり判定・パーツ・役割を編集する。
3. 「書き出す」→コードをコピーする。
4. YumaniwaDesk の「町」でプレビューする。
5. 対象シーン、追加/削除ID、件数変化、警告を確認する。
6. 反映後、Working Copy のGit差分をもう一度確認する。

YumaniwaDeskが安全確認で拒否した書き出しは、手作業で強行反映しない。

## やってはいけないこと

- 古いローカルフォルダをWorking Copyへ上書きしない。
- `main` に対する force push をしない。
- コンフリクト時に「とりあえず上書き」をしない。
- 意図しない複数ファイルをまとめてCommitしない。
- 差分を見ずにPushしない。
- DeskのバックアップをGitリポジトリ内へ戻さない。

## 事故時の戻し方

### Commit前
- YumaniwaDeskの「安全」→直前の更新を取り消す。
- またはWorking Copyで変更内容を確認してRevertする。

### Commit後・Push前
- Git履歴は残っているので、まず差分を確認する。
- 必要なら新しい修正Commitを作る。履歴を書き換えない。

### Push後
- force pushで履歴を消さず、問題のCommitを打ち消す新しいCommitを作る。
- 大規模事故では `backup/pre-staging-20260813` を復旧基準の一つとして保持する。

## Commitメッセージ例

- `Town: adjust Tomogushi Alley layout`
- `Works: add new game entry`
- `Desk: add safety checks`
- `Fix: hide development controls in production`

`update` のように内容が分からない名前は、できるだけ避ける。
