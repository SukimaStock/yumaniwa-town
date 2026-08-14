# coding: utf-8
"""
Yumaniwa Desk v0.6
Pythonista 用:湯間庭町の「中身」だけを安全に更新する小さな管理室。

Working Copy 運用の想定配置:
  yumaniwa-town/              ← GitHub から clone した正規ローカルコピー
    tools/
      YumaniwaDesk.py         ← このファイルをここへ置く(直下でも可)
    data/notes.js
    data/works.js
    data/updates.js
    works/_template/

日々の追加と、別室での過去記録編集を安全に扱います。
main.js / engine / station-plaza.js / 作品の sketch.js は扱いません。
設定・バックアップ・Undo情報はリポジトリ外の Pythonista Documents に保存します。

v0.6:
- Working Copy の clone 内から起動すると、親フォルダをたどって湯間庭町を自動認識
- 設定・バックアップ・Undo情報を Git 管理外の Pythonista Documents/YumaniwaDesk-data へ分離
- File Provider 上で atomic replace が使えない場合の安全な書き込みフォールバックを追加
- 「ファイルを選んで接続」方式をやめ、Working Copy 内からの自動検出を標準運用に変更

v0.5.1:
- 施設メニュー専用の短い表示名(menuTitle)を正式対応

v0.5:
- itch.io埋め込み(itch_embed)を作品台帳で正式対応
- 現在の works.js の表示設定を追加・編集画面で安全に保持
- 数値フィールド(playerWidth / playerHeight)を読み取り・保存
- 既存作品編集時に未編集の追加フィールドをできるだけ保持
- 公開中 itch.io 作品の embedUrl を安全確認

v0.4.2:
- 編集室(全画面表示)の上部にセーフゾーンを追加
- iPhoneの時刻・通信・バッテリー表示と、独自ヘッダーが重ならないよう修正

v0.4.1:
- Pythonista ui.Button の非公開 title_label へのアクセスを廃止
- 過去記録の一覧を安定した1行ボタン表示へ修正

v0.4:
- 追加画面と過去記録の編集室を分離
- note記事・作品・更新履歴の既存データを編集可能に
- 過去の記録は専用入口と保存前確認を必須化
- 削除機能は持たせず、必要なら作品は非表示へ変更

v0.2:
- ui.View の基底初期化を追加
- __file__ が無いPythonista起動でも作業フォルダへフォールバック
- did_load に依存せず、layout時に初期画面を構築
- 起動エラーの詳細をコンソールとアラートへ表示
- タブ切替時のページ削除を Pythonista の remove_subview() へ修正
"""

from __future__ import print_function

import datetime
import hashlib
import json
import os
import re
import shutil
import tempfile
import uuid
import traceback

try:
    import ui
    import dialogs
    import console
except ImportError:
    raise RuntimeError("このアプリは Pythonista で実行してください。")


APP_NAME = "Yumaniwa Desk"

# Pythonistaでは起動方法によって __file__ が無い場合があります。
# note.py / rakugaki_cabinet.py と同じく、安全に作業フォルダへフォールバックします。
try:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    APP_DIR = os.getcwd()

# Working Copy のリポジトリを汚さないため、Desk 自身の管理データは
# Pythonista の Documents 側へ分離します。
PYTHONISTA_DOCUMENTS = os.path.abspath(os.path.expanduser("~/Documents"))
DESK_DATA_DIR = os.path.join(PYTHONISTA_DOCUMENTS, "YumaniwaDesk-data")
SETTINGS_PATH = os.path.join(DESK_DATA_DIR, "settings.json")
BACKUP_ROOT_DIR = os.path.join(DESK_DATA_DIR, "backups")
STATE_ROOT_DIR = os.path.join(DESK_DATA_DIR, "state")
LAST_TRANSACTION_NAME = "last_transaction.json"
MAX_BACKUPS = 40

COLORS = {
    "bg": "#11161B",
    "panel": "#192129",
    "panel_alt": "#202A33",
    "line": "#31404B",
    "text": "#F1F1E8",
    "muted": "#AAB7BD",
    "accent": "#D5A45D",
    "accent_dark": "#7B5A2F",
    "green": "#6FAE8C",
    "red": "#D97872",
    "blue": "#84AAC4",
    "input": "#0F151A",
}

REQUIRED_DATA = {
    "notes": ("data/notes.js", "NOTE_ARTICLES", "[NOTES:ADD_NEWEST_HERE]"),
    "works": ("data/works.js", "WORKS", "[WORKS:ADD_NEWEST_HERE]"),
    "updates": ("data/updates.js", "TOWN_UPDATES", "[UPDATES:ADD_NEWEST_HERE]"),
}


# -----------------------------------------------------------------------------
# 基本ユーティリティ
# -----------------------------------------------------------------------------

def today_iso():
    return datetime.date.today().isoformat()


def compact_date(value):
    return re.sub(r"[^0-9]", "", value or "")


def safe_read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def atomic_write(path, text):
    """
    可能なら同一フォルダ内の一時ファイルから atomic replace します。
    Working Copy など File Provider 上で replace が拒否される場合だけ、
    事前バックアップ済みであることを前提に直接書き込みへフォールバックします。
    """
    folder = os.path.dirname(path)
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(prefix=".yumaniwa-", suffix=".tmp", dir=folder)
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        try:
            shutil.copymode(path, tmp_path)
        except Exception:
            pass
        os.replace(tmp_path, path)
        tmp_path = None
        return
    except Exception:
        # iOS の外部 File Provider では POSIX rename/replace が使えないことがある。
        # Git + Desk の外部バックアップがあるため、最後の手段として直接上書きする。
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def safe_json_dump(data, path):
    folder = os.path.dirname(path)
    if not os.path.isdir(folder):
        os.makedirs(folder)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def js_string(value):
    return json.dumps(str(value), ensure_ascii=False)


def js_list(values):
    return "[" + ", ".join(js_string(v) for v in values) + "]"


def path_is_inside(child_path, parent_path):
    try:
        return os.path.commonpath([os.path.abspath(child_path), os.path.abspath(parent_path)]) == os.path.abspath(parent_path)
    except ValueError:
        return False


def relative_safe_path(value):
    if not value:
        return ""
    value = value.replace("\\", "/").strip()
    while value.startswith("./"):
        value = value[2:]
    if value.startswith("/") or value.startswith("../") or "/../" in value:
        return None
    return value


def project_looks_valid(root):
    if not root or not os.path.isdir(root):
        return False
    required = [
        "index.html",
        "data/notes.js",
        "data/works.js",
        "data/updates.js",
        "works",
    ]
    return all(os.path.exists(os.path.join(root, rel)) for rel in required)


def find_project_root(start_path):
    current = os.path.abspath(start_path)
    if os.path.isfile(current):
        current = os.path.dirname(current)
    for _ in range(9):
        if project_looks_valid(current):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return None


def ensure_desk_data_dir():
    for path in (DESK_DATA_DIR, BACKUP_ROOT_DIR, STATE_ROOT_DIR):
        if not os.path.isdir(path):
            os.makedirs(path)


def project_storage_key(root):
    root = os.path.abspath(root or "")
    base = os.path.basename(root.rstrip("/")) or "yumaniwa-town"
    safe_base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-") or "project"
    digest = hashlib.sha1(root.encode("utf-8")).hexdigest()[:8]
    return safe_base + "-" + digest


def project_backup_root(root):
    ensure_desk_data_dir()
    return os.path.join(BACKUP_ROOT_DIR, project_storage_key(root))


def project_state_dir(root):
    ensure_desk_data_dir()
    return os.path.join(STATE_ROOT_DIR, project_storage_key(root))


def last_transaction_path(root):
    return os.path.join(project_state_dir(root), LAST_TRANSACTION_NAME)


def backup_abs_from_transaction(root, transaction):
    value = (transaction or {}).get("backup_dir", "")
    if not value:
        return ""
    if os.path.isabs(value):
        return value
    # v0.5以前のトランザクションとの互換用。
    return os.path.join(root, value)


def read_settings():
    ensure_desk_data_dir()
    return load_json(SETTINGS_PATH, {}) or {}


def save_settings(data):
    ensure_desk_data_dir()
    safe_json_dump(data, SETTINGS_PATH)


def default_project_root():
    direct = find_project_root(APP_DIR)
    if direct:
        return direct
    settings = read_settings()
    stored = settings.get("project_root", "")
    if project_looks_valid(stored):
        return stored
    return ""


# -----------------------------------------------------------------------------
# JavaScriptデータの「読むだけ」パーサ
# 外部ライブラリなしで、現在の data/*.js の単純な配列を確認する用途。
# 書き換えは必ずマーカー直後への追記だけで行う。
# -----------------------------------------------------------------------------

def find_matching(text, start_index, open_char, close_char):
    depth = 0
    i = start_index
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue

        if ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_array_body(text, var_name):
    match = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*\[", text)
    if not match:
        return ""
    open_index = text.find("[", match.start())
    close_index = find_matching(text, open_index, "[", "]")
    if close_index < 0:
        return ""
    return text[open_index + 1:close_index]


def extract_object_blocks(array_body):
    blocks = []
    i = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < len(array_body):
        ch = array_body[i]
        nxt = array_body[i + 1] if i + 1 < len(array_body) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue

        if ch == "{":
            end = find_matching(array_body, i, "{", "}")
            if end < 0:
                break
            blocks.append(array_body[i:end + 1])
            i = end + 1
            continue
        i += 1
    return blocks



def extract_array_bounds(text, var_name):
    match = re.search(r"\bvar\s+" + re.escape(var_name) + r"\s*=\s*\[", text)
    if not match:
        return None
    open_index = text.find("[", match.start())
    close_index = find_matching(text, open_index, "[", "]")
    if close_index < 0:
        return None
    return open_index + 1, close_index


def extract_object_spans(text, start, end):
    spans = []
    i = start
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    while i < end:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < end else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '\"', "`"):
            quote = ch
            i += 1
            continue
        if ch == "{":
            close = find_matching(text, i, "{", "}")
            if close < 0 or close > end:
                break
            spans.append((i, close + 1))
            i = close + 1
            continue
        i += 1
    return spans


def replace_object_by_id(path, var_name, object_id, new_entry_text):
    text = safe_read(path)
    bounds = extract_array_bounds(text, var_name)
    if not bounds:
        raise ValueError("配列を見つけられません: " + var_name)
    for start, end in extract_object_spans(text, bounds[0], bounds[1]):
        fields = parse_object_fields(text[start:end])
        if fields.get("id") == object_id:
            atomic_write(path, text[:start] + new_entry_text.rstrip() + text[end:])
            return
    raise ValueError("編集対象の作品IDを見つけられません: " + object_id)


def replace_object_by_index(path, var_name, record_index, new_entry_text):
    """IDを持たない更新履歴を、配列内の読み取り順で安全に置換する。"""
    try:
        record_index = int(record_index)
    except Exception:
        raise ValueError("更新履歴の編集位置を特定できません。")

    text = safe_read(path)
    bounds = extract_array_bounds(text, var_name)
    if not bounds:
        raise ValueError("配列を見つけられません: " + var_name)
    spans = extract_object_spans(text, bounds[0], bounds[1])
    if record_index < 0 or record_index >= len(spans):
        raise ValueError("更新履歴の編集対象を見つけられません。")
    start, end = spans[record_index]
    atomic_write(path, text[:start] + new_entry_text.rstrip() + text[end:])


def parse_js_string(raw):
    try:
        return json.loads('"' + raw + '"')
    except Exception:
        return raw.replace(r'\"', '"').replace(r"\\", "\\")


def parse_object_fields(block):
    """data/*.js の単純なオブジェクトを、編集画面用に読み取る。"""
    result = {}
    for key, raw in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\"((?:\\.|[^\"])*)\"", block):
        result[key] = parse_js_string(raw)
    for key, raw in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(true|false)\b", block):
        result[key] = raw == "true"

    # works.js の表示サイズなど、単純な数値も安全に読む。
    # 文字列やコードは実行せず、数値リテラルだけを対象にする。
    for key, raw in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(-?\d+(?:\.\d+)?)\b", block):
        if key in result:
            continue
        try:
            result[key] = float(raw) if "." in raw else int(raw)
        except ValueError:
            pass

    # 更新履歴の tags は文字列配列だけを扱う。ここではコードを実行しない。
    tag_match = re.search(r"\btags\s*:\s*\[([^\]]*)\]", block, re.S)
    if tag_match:
        result["tags"] = [
            parse_js_string(raw)
            for raw in re.findall(r'\"((?:\\.|[^\"])*)\"', tag_match.group(1))
        ]
    return result

def load_data_records(root, key):
    rel_path, var_name, _marker = REQUIRED_DATA[key]
    path = os.path.join(root, rel_path)
    text = safe_read(path)
    body = extract_array_body(text, var_name)
    records = []
    for index, block in enumerate(extract_object_blocks(body)):
        record = parse_object_fields(block)
        # 更新履歴にはIDがないため、配列内の順番だけを編集対象の識別に使う。
        # 保存時には対象ファイルを丸ごとバックアップするため、失敗時は戻せる。
        record["_record_index"] = index
        if key == "notes":
            record["_date_key"] = "publishedAt" if "publishedAt" in record else "publish_date"
        records.append(record)
    return records


def basic_js_balance(text):
    stack = []
    pairs = {"}": "{", "]": "[", ")": "("}
    quote = None
    escaped = False
    line_comment = False
    block_comment = False

    for i, ch in enumerate(text):
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            continue
        if ch in "{[(":
            stack.append(ch)
        elif ch in "}])":
            if not stack or stack[-1] != pairs[ch]:
                return False, "括弧の対応が崩れている可能性があります。"
            stack.pop()
    if quote:
        return False, "閉じていない文字列があります。"
    if stack:
        return False, "閉じていない括弧があります。"
    return True, "OK"


# -----------------------------------------------------------------------------
# 更新・バックアップ・検証
# -----------------------------------------------------------------------------

def ensure_marker(path, marker):
    text = safe_read(path)
    if text.count(marker) != 1:
        raise ValueError("更新用マーカーが見つからない、または複数あります: " + marker)


def insert_after_marker(path, marker, entry_text):
    text = safe_read(path)
    count = text.count(marker)
    if count != 1:
        raise ValueError("更新用マーカーが見つからない、または複数あります: " + marker)
    index = text.index(marker) + len(marker)
    insertion = "\n" + entry_text.rstrip() + ",\n"
    atomic_write(path, text[:index] + insertion + text[index:])


def backup_dir_for(root, label):
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    safe_label = re.sub(r"[^A-Za-z0-9_-]+", "-", label).strip("-") or "update"
    return os.path.join(project_backup_root(root), timestamp + "-" + safe_label)


def create_transaction(root, label, target_rel_paths):
    destination = backup_dir_for(root, label)
    os.makedirs(destination)
    files = []
    for rel in target_rel_paths:
        source = os.path.join(root, rel)
        if not os.path.isfile(source):
            raise FileNotFoundError("バックアップ対象がありません: " + rel)
        target = os.path.join(destination, rel)
        folder = os.path.dirname(target)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        try:
            shutil.copy2(source, target)
        except Exception:
            shutil.copyfile(source, target)
        files.append(rel)
    return {
        "version": 2,
        "created_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "label": label,
        "project_root": os.path.abspath(root),
        "backup_dir": destination,
        "files": files,
        "created_paths": [],
        "undone": False,
    }


def finish_transaction(root, transaction):
    backup_abs = backup_abs_from_transaction(root, transaction)
    safe_json_dump(transaction, os.path.join(backup_abs, "manifest.json"))
    state_dir = project_state_dir(root)
    if not os.path.isdir(state_dir):
        os.makedirs(state_dir)
    safe_json_dump(transaction, last_transaction_path(root))
    prune_backups(root)


def prune_backups(root):
    base = project_backup_root(root)
    if not os.path.isdir(base):
        return
    names = [name for name in os.listdir(base) if os.path.isdir(os.path.join(base, name))]
    names.sort(reverse=True)
    for old in names[MAX_BACKUPS:]:
        shutil.rmtree(os.path.join(base, old), ignore_errors=True)


def last_transaction(root):
    return load_json(last_transaction_path(root), None)


def undo_last_transaction(root):
    tx = last_transaction(root)
    if not tx:
        raise ValueError("戻せる更新がありません。")
    if tx.get("undone"):
        raise ValueError("直前の更新はすでに戻されています。")

    backup_abs = backup_abs_from_transaction(root, tx)
    if not os.path.isdir(backup_abs):
        raise ValueError("バックアップが見つかりません。")

    for rel in tx.get("files", []):
        source = os.path.join(backup_abs, rel)
        target = os.path.join(root, rel)
        if not os.path.isfile(source):
            raise ValueError("バックアップ内のファイルが見つかりません: " + rel)
        folder = os.path.dirname(target)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        try:
            shutil.copy2(source, target)
        except Exception:
            shutil.copyfile(source, target)

    # テンプレートから作っただけの新規フォルダだけを削除する。
    for rel in tx.get("created_paths", []):
        normalized = relative_safe_path(rel)
        if not normalized:
            continue
        target = os.path.join(root, normalized)
        if path_is_inside(target, root) and os.path.isdir(target):
            shutil.rmtree(target, ignore_errors=True)

    tx["undone"] = True
    tx["undone_at"] = datetime.datetime.now().isoformat(timespec="seconds")
    safe_json_dump(tx, os.path.join(backup_abs, "manifest.json"))
    safe_json_dump(tx, last_transaction_path(root))


def validate_project(root):
    report = {"errors": [], "warnings": [], "ok": []}
    if not project_looks_valid(root):
        report["errors"].append("湯間庭町のプロジェクトとして認識できません。index.html / data / works を確認してください。")
        return report

    for key, (rel, var_name, marker) in REQUIRED_DATA.items():
        path = os.path.join(root, rel)
        if not os.path.isfile(path):
            report["errors"].append(rel + " がありません。")
            continue
        text = safe_read(path)
        if text.count(marker) != 1:
            report["errors"].append(rel + " の更新用マーカーが1つではありません: " + marker)
        ok, message = basic_js_balance(text)
        if not ok:
            report["errors"].append(rel + ":" + message)
        else:
            report["ok"].append(rel + ":基本構文を確認")

    try:
        notes = load_data_records(root, "notes")
    except Exception as exc:
        notes = []
        report["errors"].append("notes.js の読み取りに失敗: " + str(exc))
    try:
        works = load_data_records(root, "works")
    except Exception as exc:
        works = []
        report["errors"].append("works.js の読み取りに失敗: " + str(exc))

    note_urls = {}
    note_ids = {}
    for article in notes:
        note_id = article.get("id", "")
        url = article.get("url", "")
        if note_id:
            if note_id in note_ids:
                report["errors"].append("note のIDが重複しています: " + note_id)
            note_ids[note_id] = True
        if url:
            if url in note_urls:
                report["warnings"].append("同じnote URLが複数あります: " + url)
            note_urls[url] = True
            if not url.startswith("https://"):
                report["warnings"].append("note URLが https:// ではありません: " + url)

    work_ids = {}
    for work in works:
        work_id = work.get("id", "")
        if work_id:
            if work_id in work_ids:
                report["errors"].append("作品IDが重複しています: " + work_id)
            work_ids[work_id] = True

        status = work.get("status", "")
        launch = work.get("launch", "")
        title = work.get("title", "作品")
        if status != "open":
            continue
        if launch == "embedded":
            entry = relative_safe_path(work.get("entry", ""))
            if not entry:
                report["errors"].append("公開中の埋め込み作品に entry がありません: " + title)
            else:
                target = os.path.join(root, entry)
                if not os.path.isfile(target):
                    report["errors"].append("公開中の作品の entry が見つかりません: " + entry)
        elif launch == "itch_embed":
            embed_url = work.get("embedUrl", "")
            normal_url = work.get("url", "")
            if not embed_url.startswith("https://itch.io/"):
                report["errors"].append("公開中のitch.io作品に有効な embedUrl がありません: " + title)
            if normal_url and not normal_url.startswith("https://"):
                report["errors"].append("itch.io作品の通常URLが https:// ではありません: " + title)
        elif launch == "external":
            url = work.get("url", "")
            if not url.startswith("https://"):
                report["errors"].append("公開中の外部作品に https URL がありません: " + title)
        else:
            report["errors"].append("公開中の作品に対応した launch 指定がありません: " + title)

    template_dir = os.path.join(root, "works", "_template")
    if not os.path.isdir(template_dir):
        report["warnings"].append("works/_template が見つかりません。新規作品フォルダの自動作成は使えません。")
    else:
        report["ok"].append("works/_template:新規作品の雛形を確認")

    engine_path = os.path.join(root, "engine", "rakugaki-engine.v1.js")
    if not os.path.isfile(engine_path):
        report["warnings"].append("engine/rakugaki-engine.v1.js が見つかりません。触れるらくがきの雛形を確認してください。")

    report["stats"] = {
        "notes": len(notes),
        "works": len(works),
        "open_works": len([w for w in works if w.get("status") == "open"]),
    }
    return report

# -----------------------------------------------------------------------------
# データ1件分のJavaScript文字列
# -----------------------------------------------------------------------------

def note_entry(article):
    # 既存データの publish_date と、新しい publishedAt のどちらも維持できる。
    date_key = article.get("_date_key", "publishedAt")
    if date_key not in ("publishedAt", "publish_date"):
        date_key = "publishedAt"
    date_value = article.get("publishedAt") or article.get("publish_date") or ""
    lines = [
        "    {",
        "        id: " + js_string(article["id"]) + ",",
        "        title: " + js_string(article["title"]) + ",",
        "        url: " + js_string(article["url"]) + ",",
        "        " + date_key + ": " + js_string(date_value) + ",",
        "        featured: " + ("true" if article.get("featured") else "false"),
        "    }",
    ]
    return "\n".join(lines)


WORK_KNOWN_FIELDS = [
    "id", "title", "venue", "kind", "status", "launch",
    "entry", "embedUrl", "url",
    "frameTitle", "returnLabel", "frameMode",
    "playerLayout", "playerWidth", "playerHeight",
    "menuTitle", "menuCategory", "menuDescription", "description", "emptyText",
]


def js_simple_value(value):
    """works.js の追加フィールドを安全に往復させるための単純値シリアライザ。"""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, str):
        return js_string(value)
    if isinstance(value, (list, tuple)) and all(isinstance(item, str) for item in value):
        return js_list(value)
    return None


def default_work_return_label(venue):
    if venue == "tomogushi_alley":
        return "灯串横丁"
    if venue == "leisure_center":
        return "湯窓レジャーセンター"
    return ""


def default_work_frame_mode(venue):
    return "soft" if venue == "leisure_center" else "standard"


def default_work_menu_category(kind):
    return "ゲーム" if kind == "game" else "触れるらくがき"


def work_entry(work):
    """現在の works.js スキーマを保ちながら1作品をJavaScriptへ戻す。"""
    pairs = []

    def add_string(key, value, required=False):
        value = "" if value is None else str(value)
        if required or value != "":
            pairs.append((key, js_string(value)))

    def add_number(key, value):
        if value in (None, ""):
            return
        try:
            number = float(value)
            if number.is_integer():
                value_text = str(int(number))
            else:
                value_text = str(number)
            pairs.append((key, value_text))
        except (TypeError, ValueError):
            return

    add_string("id", work.get("id", ""), True)
    add_string("title", work.get("title", ""), True)
    add_string("venue", work.get("venue", ""), True)
    add_string("kind", work.get("kind", "work"), True)
    add_string("status", work.get("status", "preparing"), True)
    launch = work.get("launch", "embedded")
    add_string("launch", launch, True)

    if launch == "embedded":
        add_string("entry", work.get("entry", ""), True)
    elif launch == "itch_embed":
        add_string("embedUrl", work.get("embedUrl", ""), True)
        add_string("url", work.get("url", ""))
    elif launch == "external":
        add_string("url", work.get("url", ""), True)

    for key in ("frameTitle", "returnLabel", "frameMode", "playerLayout"):
        add_string(key, work.get(key, ""))
    add_number("playerWidth", work.get("playerWidth"))
    add_number("playerHeight", work.get("playerHeight"))
    for key in ("menuTitle", "menuCategory", "menuDescription", "description"):
        add_string(key, work.get(key, ""))
    add_string("emptyText", work.get("emptyText") or "この作品は準備中です。", True)

    # Deskがまだ知らない将来の単純フィールドも、可能な範囲で残す。
    known = set(WORK_KNOWN_FIELDS)
    for key, value in work.items():
        if key in known or key.startswith("_"):
            continue
        encoded = js_simple_value(value)
        if encoded is not None:
            pairs.append((key, encoded))

    lines = ["    {"]
    for index, (key, value_text) in enumerate(pairs):
        comma = "," if index < len(pairs) - 1 else ""
        lines.append("        {0}: {1}{2}".format(key, value_text, comma))
    lines.append("    }")
    return "\n".join(lines)

def update_entry(update):
    lines = [
        "    {",
        "        date: " + js_string(update["date"]) + ",",
        "        title: " + js_string(update["title"]) + ",",
        "        body: " + js_string(update["body"]) + ",",
        "        tags: " + js_list(update.get("tags", [])),
        "    }",
    ]
    return "\n".join(lines)


# -----------------------------------------------------------------------------
# UI ヘルパー
# -----------------------------------------------------------------------------

def hud(message, icon="success", duration=1.5):
    try:
        dialogs.hud_alert(message, icon=icon, duration=duration)
    except Exception:
        print(message)


def alert(title, message, button1="OK", button2=None):
    try:
        return dialogs.alert(title, message, button1=button1, button2=button2, hide_cancel_button=button2 is None)
    except Exception:
        print(title + ": " + message)
        return 1


def confirm(title, message, ok_label="保存する"):
    return alert(title, message, button1=ok_label, button2="キャンセル") == 1


def make_label(text="", font_size=15, color=None, lines=1, alignment=ui.ALIGN_LEFT):
    label = ui.Label()
    label.text = text
    label.font = ("<system>", font_size)
    label.text_color = color or COLORS["text"]
    label.number_of_lines = lines
    label.alignment = alignment
    return label


def make_button(title, color_key="accent", action=None):
    button = ui.Button()
    button.title = title
    button.font = ("<system-bold>", 15)
    button.tint_color = COLORS["bg"] if color_key == "accent" else COLORS["text"]
    button.background_color = COLORS.get(color_key, COLORS["accent"])
    button.corner_radius = 9
    button.action = action
    return button


def make_text_field(placeholder="", text="", secure=False):
    field = ui.TextField()
    field.placeholder = placeholder
    field.text = text
    field.font = ("<system>", 16)
    field.text_color = COLORS["text"]
    field.background_color = COLORS["input"]
    field.border_width = 1
    field.border_color = COLORS["line"]
    field.corner_radius = 8
    field.secure = secure
    field.clear_button_mode = "while_editing"
    return field


def make_text_view(text=""):
    view = ui.TextView()
    view.text = text
    view.font = ("<system>", 16)
    view.text_color = COLORS["text"]
    view.background_color = COLORS["input"]
    view.border_width = 1
    view.border_color = COLORS["line"]
    view.corner_radius = 8
    return view


def make_segmented(items, selected=0):
    segment = ui.SegmentedControl()
    segment.segments = items
    segment.selected_index = selected
    segment.tint_color = COLORS["accent"]
    return segment


def make_switch(value=False):
    switch = ui.Switch()
    switch.value = value
    switch.tint_color = COLORS["accent"]
    return switch


def editor_safe_top(view):
    """
    hide_title_bar=True の全画面編集室用の上部余白。

    Pythonista の ui.View は表示方法やiOSの世代により safe_area_insets が
    取れないことがあるため、取得できる場合はその値を使い、取れない場合も
    iPhoneのステータスバーを避けられる54ptを最低保証にします。
    """
    inset_top = 0
    try:
        insets = getattr(view, "safe_area_insets", None)
        if insets is not None:
            if hasattr(insets, "top"):
                inset_top = float(insets.top or 0)
            elif isinstance(insets, (tuple, list)) and len(insets) > 0:
                inset_top = float(insets[0] or 0)
    except Exception:
        inset_top = 0

    # 実機で時刻表示と独自ヘッダーが重ならないよう、少しだけ余裕を取る。
    return max(54, int(round(inset_top + 8)))


class PageBuilder(object):
    def __init__(self, parent, width):
        self.parent = parent
        self.width = width
        self.y = 16
        self.margin = 18
        self.content_width = max(280, width - self.margin * 2)

    def add(self, view, height, gap=10):
        view.frame = (self.margin, self.y, self.content_width, height)
        self.parent.add_subview(view)
        self.y += height + gap
        return view

    def title(self, text, subtext=None):
        self.add(make_label(text, 23, COLORS["text"], lines=1), 30, gap=2)
        if subtext:
            self.add(make_label(subtext, 13, COLORS["muted"], lines=0), 38, gap=14)

    def section(self, text):
        self.add(make_label(text, 14, COLORS["accent"], lines=1), 22, gap=5)

    def label(self, text, lines=1, color=None, size=14, gap=5):
        return self.add(make_label(text, size, color or COLORS["muted"], lines=lines), 20 if lines == 1 else 42, gap=gap)

    def field(self, label_text, placeholder="", text="", height=40):
        self.label(label_text, size=14, gap=4)
        field = make_text_field(placeholder, text)
        self.add(field, height, gap=12)
        return field

    def text_view(self, label_text, placeholder="", text="", height=96):
        self.label(label_text, size=14, gap=4)
        view = make_text_view(text)
        view.placeholder = placeholder
        self.add(view, height, gap=12)
        return view

    def segmented(self, label_text, options, selected=0):
        self.label(label_text, size=14, gap=4)
        control = make_segmented(options, selected)
        self.add(control, 34, gap=12)
        return control

    def switch(self, label_text, value=False):
        row = ui.View()
        row.background_color = COLORS["panel_alt"]
        row.corner_radius = 8
        label = make_label(label_text, 14, COLORS["text"], lines=2)
        toggle = make_switch(value)
        row.add_subview(label)
        row.add_subview(toggle)
        label.frame = (12, 8, self.content_width - 80, 38)
        toggle.frame = (self.content_width - 60, 9, 48, 30)
        self.add(row, 52, gap=12)
        return toggle

    def button(self, title, color_key, action, height=46):
        button = make_button(title, color_key, action)
        self.add(button, height, gap=12)
        return button

    def spacer(self, height=14):
        self.y += height

    def finish(self):
        self.parent.frame = (0, 0, self.width, self.y + 20)
        return self.y + 20


# -----------------------------------------------------------------------------
# アプリ本体
# -----------------------------------------------------------------------------

class ExistingWorkEditor(ui.View):
    """既存作品の台帳編集。IDは固定し、現在のworks.js設定を保ったまま更新する。"""
    def __init__(self, desk, work, on_saved=None):
        super(ExistingWorkEditor, self).__init__()
        self.desk = desk
        self.on_saved = on_saved
        self.original_id = work.get("id", "")
        self.original_work = dict(work)
        self.name = "作品の台帳を編集"
        self.background_color = COLORS["bg"]

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("作品の台帳を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.cancel_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.cancel_button)
        self.save_button = make_button("保存", "accent", self.save)
        self.header.add_subview(self.save_button)

        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(120, width - 190), 30)
        self.cancel_button.frame = (width - 166, 10, 70, 36)
        self.save_button.frame = (width - 88, 10, 72, 36)
        self.scroll.frame = (0, top + 58, width, max(1, height - top - 58))
        if not self._built and width > 0:
            self._built = True
            self.build_form(width)

    def build_form(self, width):
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, width)
        b.title(self.original_work.get("title") or self.original_id, "作品IDは固定です。現在の表示設定を保ちながら安全に更新します。")
        b.section("基本設定")
        b.label("作品ID: " + self.original_id, lines=0, color=COLORS["accent"], size=16, gap=12)
        self.title_field = b.field("作品名", text=self.original_work.get("title", ""))
        venue_index = 0 if self.original_work.get("venue") == "leisure_center" else 1
        kind_index = 0 if self.original_work.get("kind", "work") == "work" else 1
        status_index = {"preparing": 0, "open": 1, "hidden": 2}.get(self.original_work.get("status"), 0)
        launch_index = {"embedded": 0, "itch_embed": 1, "external": 2}.get(self.original_work.get("launch", "embedded"), 0)
        self.venue = b.segmented("設置場所", ["レジャー", "灯串横丁"], venue_index)
        self.kind = b.segmented("分類", ["触れるらくがき", "ゲーム"], kind_index)
        self.status = b.segmented("公開状態", ["準備中", "公開中", "非表示"], status_index)
        self.launch = b.segmented("開き方", ["町内", "itch.io", "外部URL"], launch_index)

        b.section("起動先")
        self.entry = b.field("entry(町内プレイヤー)", text=self.original_work.get("entry", ""))
        self.embed_url = b.field("embedUrl(itch.io埋め込み)", text=self.original_work.get("embedUrl", ""))
        self.url = b.field("通常URL / 外部URL", text=self.original_work.get("url", ""))

        b.section("町内フレーム")
        self.frame_title = b.field("frameTitle", text=self.original_work.get("frameTitle", ""))
        self.return_label = b.field("returnLabel", text=self.original_work.get("returnLabel", ""))
        self.frame_mode = b.field("frameMode", "standard / soft / phone-cola など", self.original_work.get("frameMode", ""))
        self.player_layout = b.field("playerLayout(任意)", text=self.original_work.get("playerLayout", ""))
        self.player_width = b.field("playerWidth(任意)", text=str(self.original_work.get("playerWidth", "") or ""))
        self.player_height = b.field("playerHeight(任意)", text=str(self.original_work.get("playerHeight", "") or ""))

        b.section("施設メニュー")
        self.menu_title = b.field("menuTitle(一覧用の短い名前・任意)", text=self.original_work.get("menuTitle", ""))
        self.menu_category = b.field("menuCategory", text=self.original_work.get("menuCategory", ""))
        self.menu_description = b.text_view("menuDescription", text=self.original_work.get("menuDescription", ""), height=74)
        self.description = b.text_view("description(任意)", text=self.original_work.get("description", ""), height=74)
        self.empty_text = b.text_view("準備中メッセージ", text=self.original_work.get("emptyText", "この作品は準備中です。"), height=74)

        b.section("保存の注意")
        b.label("保存するとこの1件だけを置き換えます。Deskが読み取った既存フィールドは維持し、works.js は保存直前にバックアップします。公開中のitch.io作品には embedUrl が必要です。", lines=0, color=COLORS["muted"], size=14, gap=16)
        total = b.finish()
        self.scroll.content_size = (width, max(total, self.scroll.height + 1))

    def close_editor(self, sender):
        self.close()

    def save(self, sender):
        venue = "leisure_center" if self.venue.selected_index == 0 else "tomogushi_alley"
        kind = "work" if self.kind.selected_index == 0 else "game"
        status = ["preparing", "open", "hidden"][max(0, self.status.selected_index)]
        launch = ["embedded", "itch_embed", "external"][max(0, self.launch.selected_index)]

        work = dict(self.original_work)
        work.update({
            "id": self.original_id,
            "title": self.title_field.text.strip(),
            "venue": venue,
            "kind": kind,
            "status": status,
            "launch": launch,
            "entry": self.entry.text.strip(),
            "embedUrl": self.embed_url.text.strip(),
            "url": self.url.text.strip(),
            "frameTitle": self.frame_title.text.strip(),
            "returnLabel": self.return_label.text.strip(),
            "frameMode": self.frame_mode.text.strip(),
            "playerLayout": self.player_layout.text.strip(),
            "menuTitle": self.menu_title.text.strip(),
            "menuCategory": self.menu_category.text.strip(),
            "menuDescription": self.menu_description.text.strip(),
            "description": self.description.text.strip(),
            "emptyText": self.empty_text.text.strip() or "この作品は準備中です。",
        })

        dimension_errors = []
        for key, field in (("playerWidth", self.player_width), ("playerHeight", self.player_height)):
            raw = field.text.strip()
            if not raw:
                work.pop(key, None)
                continue
            try:
                value = int(raw)
                if value <= 0:
                    raise ValueError()
                work[key] = value
            except ValueError:
                dimension_errors.append(key + " は正の整数で入力してください。")
        if dimension_errors:
            alert("入力を確認してください", "\n".join("・" + item for item in dimension_errors))
            return

        # 空欄なら町の標準値を補う。既存値がある場合はフォームに入っているため維持される。
        if not work.get("frameTitle"):
            work["frameTitle"] = work.get("title", "")
        if not work.get("returnLabel"):
            work["returnLabel"] = default_work_return_label(venue)
        if not work.get("frameMode"):
            work["frameMode"] = default_work_frame_mode(venue)
        if not work.get("menuCategory"):
            work["menuCategory"] = default_work_menu_category(kind)
        if not work.get("menuDescription"):
            work["menuDescription"] = work.get("description", "")

        if self.desk.save_existing_work(self.original_id, work):
            self.close()
            if self.on_saved:
                self.on_saved()
            else:
                self.desk.show_tab(2)

class ExistingNoteEditor(ui.View):
    """既存note記事の編集。追加画面とは別の、上書き専用画面。"""
    def __init__(self, desk, article, on_saved=None):
        super(ExistingNoteEditor, self).__init__()
        self.desk = desk
        self.original_article = dict(article)
        self.original_id = article.get("id", "")
        self.on_saved = on_saved
        self.name = "過去の記事を編集"
        self.background_color = COLORS["bg"]

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("過去の記事を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.close_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.close_button)
        self.save_button = make_button("保存", "accent", self.save)
        self.header.add_subview(self.save_button)
        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(120, width - 190), 30)
        self.close_button.frame = (width - 166, 10, 70, 36)
        self.save_button.frame = (width - 88, 10, 72, 36)
        self.scroll.frame = (0, top + 58, width, max(1, height - top - 58))
        if not self._built and width > 0:
            self._built = True
            self.build_form(width)

    def build_form(self, width):
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, width)
        b.title(self.original_article.get("title") or self.original_id, "ここは過去の記録を置き換える画面です。削除は行いません。")
        b.section("記事ID(固定)")
        b.label(self.original_id, lines=0, color=COLORS["accent"], size=16, gap=14)
        self.title_field = b.field("記事タイトル", text=self.original_article.get("title", ""))
        self.url_field = b.field("note URL", text=self.original_article.get("url", ""))
        original_date = self.original_article.get("publishedAt") or self.original_article.get("publish_date") or ""
        self.date_field = b.field("公開日", "YYYY-MM-DD", original_date)
        self.featured = b.switch("掲示板で優先表示する(featured)", bool(self.original_article.get("featured")))
        b.section("保存の注意")
        b.label("保存すると、この1件だけを置き換えます。notes.js は保存直前にバックアップされ、[安全]から直前の更新を取り消せます。", lines=0, color=COLORS["muted"], size=14, gap=16)
        total = b.finish()
        self.scroll.content_size = (width, max(total, self.scroll.height + 1))

    def close_editor(self, sender):
        self.close()

    def save(self, sender):
        article = {
            "id": self.original_id,
            "title": self.title_field.text.strip(),
            "url": self.url_field.text.strip(),
            "publishedAt": self.date_field.text.strip(),
            "featured": bool(self.featured.value),
            "_date_key": self.original_article.get("_date_key", "publishedAt"),
        }
        if self.desk.save_existing_note(self.original_id, article):
            self.close()
            if self.on_saved:
                self.on_saved()


class ExistingUpdateEditor(ui.View):
    """既存更新履歴の編集。IDがないため、読み取り順だけを内部で保持する。"""
    def __init__(self, desk, update, on_saved=None):
        super(ExistingUpdateEditor, self).__init__()
        self.desk = desk
        self.original_update = dict(update)
        self.record_index = update.get("_record_index", -1)
        self.on_saved = on_saved
        self.name = "過去の更新履歴を編集"
        self.background_color = COLORS["bg"]

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("過去の更新履歴を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.close_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.close_button)
        self.save_button = make_button("保存", "accent", self.save)
        self.header.add_subview(self.save_button)
        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(120, width - 190), 30)
        self.close_button.frame = (width - 166, 10, 70, 36)
        self.save_button.frame = (width - 88, 10, 72, 36)
        self.scroll.frame = (0, top + 58, width, max(1, height - top - 58))
        if not self._built and width > 0:
            self._built = True
            self.build_form(width)

    def build_form(self, width):
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, width)
        b.title(self.original_update.get("title") or "更新履歴", "ここは過去の記録を置き換える画面です。削除は行いません。")
        b.section("編集対象")
        b.label("更新履歴の並び順: {0}番目".format(int(self.record_index) + 1), lines=0, color=COLORS["accent"], size=15, gap=14)
        self.date_field = b.field("日付", "YYYY-MM-DD", self.original_update.get("date", ""))
        self.title_field = b.field("見出し", text=self.original_update.get("title", ""))
        self.body_field = b.text_view("本文", text=self.original_update.get("body", ""), height=112)
        self.tags_field = b.field("タグ(カンマ区切り)", text=", ".join(self.original_update.get("tags", [])))
        b.section("保存の注意")
        b.label("保存すると、この1件だけを置き換えます。updates.js は保存直前にバックアップされ、[安全]から直前の更新を取り消せます。", lines=0, color=COLORS["muted"], size=14, gap=16)
        total = b.finish()
        self.scroll.content_size = (width, max(total, self.scroll.height + 1))

    def close_editor(self, sender):
        self.close()

    def save(self, sender):
        update = {
            "_record_index": self.record_index,
            "date": self.date_field.text.strip(),
            "title": self.title_field.text.strip(),
            "body": self.body_field.text.strip(),
            "tags": [tag.strip() for tag in self.tags_field.text.split(",") if tag.strip()],
        }
        if self.desk.save_existing_update(update):
            self.close()
            if self.on_saved:
                self.on_saved()


class PastRecordsEditor(ui.View):
    """追加とは別入口の、過去データを選んで編集する専用室。"""
    MODES = ["記事", "作品", "履歴"]

    def __init__(self, desk):
        super(PastRecordsEditor, self).__init__()
        self.desk = desk
        self.name = "過去の記録を編集"
        self.background_color = COLORS["bg"]
        self.mode = 0
        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)
        self.title_label = make_label("過去の記録を編集", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.close_button = make_button("閉じる", "panel_alt", self.close_editor)
        self.header.add_subview(self.close_button)
        self.mode_control = make_segmented(self.MODES, 0)
        self.mode_control.action = self.mode_changed
        self.add_subview(self.mode_control)
        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)
        self._built = False

    def layout(self):
        width, height = self.width, self.height
        top = editor_safe_top(self)
        self.header.frame = (0, top, width, 58)
        self.title_label.frame = (16, 12, max(160, width - 110), 30)
        self.close_button.frame = (width - 88, 10, 72, 36)
        self.mode_control.frame = (14, top + 64, width - 28, 34)
        self.scroll.frame = (0, top + 104, width, max(1, height - top - 104))
        if not self._built and width > 0:
            self._built = True
            self.render_list()

    def close_editor(self, sender):
        self.close()

    def mode_changed(self, sender):
        self.mode = max(0, sender.selected_index)
        self.render_list()

    def clear_page(self):
        for child in list(self.scroll.subviews):
            self.scroll.remove_subview(child)
        self.scroll.content_offset = (0, 0)

    def render_list(self):
        if self.width <= 0:
            return
        self.clear_page()
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        b = PageBuilder(page, self.width)
        mode_name = self.MODES[self.mode]
        b.title("過去の{0}を選ぶ".format(mode_name), "ここは追加画面とは別の編集室です。保存するまで元のファイルは変わりません。")
        b.section("編集の安全ルール")
        b.label("・この画面では新規追加しません\n・保存前に対象ファイルを自動バックアップします\n・削除はありません。作品は必要なら「非表示」にします\n・直前の保存は[安全]から取り消せます", lines=0, color=COLORS["muted"], size=14, gap=16)
        if not project_looks_valid(self.desk.project_root):
            b.label("プロジェクト未選択です。先に管理室の[案内]から接続してください。", lines=0, color=COLORS["red"], size=15, gap=14)
            total = b.finish()
            self.scroll.content_size = (self.width, max(total, self.scroll.height + 1))
            return
        key = ["notes", "works", "updates"][self.mode]
        try:
            records = load_data_records(self.desk.project_root, key)
        except Exception as exc:
            b.label("読み取れませんでした: " + str(exc), lines=0, color=COLORS["red"], size=14, gap=14)
            total = b.finish()
            self.scroll.content_size = (self.width, max(total, self.scroll.height + 1))
            return

        b.section("編集したい記録を選ぶ")
        if not records:
            b.label("まだ記録がありません。追加は管理室の[記事][作品][履歴]から行います。", lines=0, color=COLORS["muted"], size=14, gap=14)
        for record in records:
            if key == "notes":
                title = record.get("title") or record.get("id") or "記事"
                date = record.get("publishedAt") or record.get("publish_date") or "日付なし"
                subtitle = date + (" ★" if record.get("featured") else "")
            elif key == "works":
                title = record.get("title") or record.get("id") or "作品"
                state = {"open": "公開中", "preparing": "準備中", "hidden": "非表示"}.get(record.get("status"), "未設定")
                subtitle = state + " " + ("レジャー" if record.get("venue") == "leisure_center" else "灯串横丁")
            else:
                title = record.get("title") or "更新履歴"
                subtitle = record.get("date") or "日付なし"
            # Pythonista の ui.Button は title_label を公開していません。
            # 1行タイトルとしてまとめ、内部UILabelへ直接触れない形にします。
            button_title = title
            if subtitle:
                button_title += "  ·  " + subtitle
            button = make_button(button_title, "panel_alt", self.open_record)
            button.font = ("<system>", 15)
            button.record = record
            button.record_kind = key
            b.add(button, 58, gap=8)
        total = b.finish()
        self.scroll.content_size = (self.width, max(total, self.scroll.height + 1))

    def open_record(self, sender):
        record = getattr(sender, "record", None)
        key = getattr(sender, "record_kind", "")
        if not record:
            alert("編集できません", "選んだ記録を読み取れませんでした。")
            return
        if key == "notes":
            editor = ExistingNoteEditor(self.desk, record, on_saved=self.render_list)
        elif key == "works":
            editor = ExistingWorkEditor(self.desk, record, on_saved=self.render_list)
        else:
            editor = ExistingUpdateEditor(self.desk, record, on_saved=self.render_list)
        editor.present("fullscreen", hide_title_bar=True)


class YumaniwaDesk(ui.View):
    TAB_TITLES = ["案内", "記事", "作品", "履歴", "安全"]

    def __init__(self):
        # Pythonistaの ui.View は必ず基底クラスを初期化します。
        super(YumaniwaDesk, self).__init__()
        ensure_desk_data_dir()
        self.name = APP_NAME
        self.background_color = COLORS["bg"]
        self.project_root = default_project_root()
        if project_looks_valid(self.project_root):
            settings = read_settings()
            settings["project_root"] = self.project_root
            save_settings(settings)
        self.current_tab = 0
        self._last_layout_width = 0
        self._initial_page_built = False

        self.header = ui.View()
        self.header.background_color = COLORS["panel"]
        self.add_subview(self.header)

        self.title_label = make_label("湯間庭町 管理室", 20, COLORS["text"], lines=1)
        self.header.add_subview(self.title_label)
        self.status_label = make_label("", 12, COLORS["muted"], lines=1, alignment=ui.ALIGN_RIGHT)
        self.header.add_subview(self.status_label)

        self.tabs = make_segmented(self.TAB_TITLES, 0)
        self.tabs.action = self.tab_changed
        self.add_subview(self.tabs)

        self.scroll = ui.ScrollView()
        self.scroll.background_color = COLORS["bg"]
        self.scroll.always_bounce_vertical = True
        self.add_subview(self.scroll)

        self.update_status()

    def layout(self):
        width, height = self.width, self.height
        self.header.frame = (0, 0, width, 58)
        self.title_label.frame = (18, 10, width * 0.54, 30)
        self.status_label.frame = (width * 0.52, 13, width * 0.44 - 16, 24)
        self.tabs.frame = (14, 62, width - 28, 34)
        self.scroll.frame = (0, 104, width, max(1, height - 104))
        # Pythonistaの手動生成Viewでは did_load が呼ばれない場合があるため、
        # 初期ページは最初の layout で一度だけ構築します。
        if not self._initial_page_built and width > 0:
            self._initial_page_built = True
            self.show_tab(0)
        elif self._last_layout_width and abs(self._last_layout_width - width) > 20:
            self.show_tab(self.current_tab)
        self._last_layout_width = width

    def update_status(self):
        if project_looks_valid(self.project_root):
            name = os.path.basename(self.project_root.rstrip("/")) or "湯間庭町"
            self.status_label.text = "接続中: " + name
            self.status_label.text_color = COLORS["green"]
        else:
            self.status_label.text = "プロジェクト未選択"
            self.status_label.text_color = COLORS["red"]

    def clear_page(self):
        # Pythonista の ui.View には remove_from_superview() はありません。
        # 親ビュー側の remove_subview(view) を使って、安全に現在のページを外します。
        for child in list(self.scroll.subviews):
            self.scroll.remove_subview(child)
        self.scroll.content_offset = (0, 0)

    def tab_changed(self, sender):
        self.show_tab(sender.selected_index)

    def show_tab(self, index):
        self.current_tab = index
        self.tabs.selected_index = index
        self.clear_page()
        width = self.width if self.width > 0 else 390
        page = ui.View()
        page.background_color = COLORS["bg"]
        self.scroll.add_subview(page)
        builder = PageBuilder(page, width)

        if index == 0:
            self.build_home(builder)
        elif index == 1:
            self.build_notes(builder)
        elif index == 2:
            self.build_works(builder)
        elif index == 3:
            self.build_updates(builder)
        else:
            self.build_safety(builder)

        total_height = builder.finish()
        self.scroll.content_size = (width, max(total_height, self.scroll.height + 1))
        self.update_status()

    def require_project(self):
        if project_looks_valid(self.project_root):
            return True
        alert("プロジェクトが未選択です", "Working Copy の yumaniwa-town 内(直下または tools/)にこのスクリプトを置いて起動し、[案内]の『Working Copyの町を再検出』を押してください。")
        self.show_tab(0)
        return False

    # -----------------------------------------------------------------
    # 案内
    # -----------------------------------------------------------------
    def build_home(self, b):
        b.title("湯間庭町 管理室", "Working Copy の町を直接編集します。GitHubへの反映は Working Copy で差分確認してから行います。")
        b.section("このアプリが扱うもの")
        b.label("・note記事の追加\n・作品台帳への登録\n・町の更新履歴の追加\n・更新前バックアップと直前の取り消し", lines=0, color=COLORS["text"], size=15, gap=14)
        b.section("プロジェクト")
        root_text = self.project_root or "まだ自動検出できていません"
        root_view = make_text_view(root_text)
        root_view.editable = False
        b.add(root_view, 72, gap=10)
        b.button("Working Copyの町を再検出", "blue", self.detect_project_from_script)
        b.button("このリポジトリを確認する", "panel_alt", self.check_current_project)
        b.section("Working Copy 運用")
        b.label("このスクリプトを Working Copy の yumaniwa-town 内(直下または tools/)に置いて起動します。保存すると Working Copy に変更として現れます。\n\n保存後は Working Copy で差分を確認 → Commit → Push。GPTがGitHub側を更新した後は、Deskを使う前に Working Copy で Pull します。", lines=0, color=COLORS["text"], size=15, gap=14)
        b.section("安全な使い方")
        b.label("日々の更新は[記事][作品][履歴]だけを使います。保存のたびに対象ファイルをリポジトリ外へバックアップします。\n\nmain.js / engine / station-plaza.js / works/*/sketch.js は、この管理室では扱いません。設定・バックアップ・Undo情報も Git の変更には出ません。", lines=0, color=COLORS["muted"], size=15, gap=14)
        b.section("過去の記録を直すとき")
        b.label("過去の記事・作品・更新履歴の編集は、追加画面とは別の編集室から行います。上書き保存の前には確認があり、削除機能はありません。", lines=0, color=COLORS["text"], size=15, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)
        b.section("管理データの保存先")
        b.label(DESK_DATA_DIR + "\n\nここには設定・バックアップ・Undo情報だけを保存します。湯間庭町リポジトリには作りません。", lines=0, color=COLORS["muted"], size=13)

    def detect_project_from_script(self, sender):
        root = find_project_root(APP_DIR)
        if not root:
            alert("湯間庭町を見つけられません", "この YumaniwaDesk.py を Working Copy の yumaniwa-town 直下、またはその中の tools/ フォルダへ置いてからもう一度実行してください。\n\nファイルピッカー経由の一時ファイルには接続しません。")
            return
        self.project_root = root
        settings = read_settings()
        settings["project_root"] = root
        save_settings(settings)
        hud("Working Copy の湯間庭町を検出しました", "success")
        self.show_tab(0)

    def check_current_project(self, sender):
        if not project_looks_valid(self.project_root):
            alert("接続できていません", "Working Copy の yumaniwa-town 内からこのスクリプトを起動し、『Working Copyの町を再検出』を押してください。")
            return
        report = validate_project(self.project_root)
        title = "町の確認"
        body = "記事 {notes}件 / 作品 {works}件 / 公開中 {open_works}件\n\n".format(**report.get("stats", {}))
        if report["errors"]:
            body += "エラー:\n・" + "\n・".join(report["errors"])
            alert(title, body)
        else:
            body += "問題は見つかりませんでした。"
            if report["warnings"]:
                body += "\n\n注意:\n・" + "\n・".join(report["warnings"])
            alert(title, body)

    # -----------------------------------------------------------------
    # 記事
    # -----------------------------------------------------------------
    def build_notes(self, b):
        b.title("新しい記事を貼る", "data/notes.js の先頭へ安全に1件追加します。IDは自動で作られます。")
        self.note_title = b.field("記事タイトル", "例:湯間庭町を少しずつ更新できる形にする")
        self.note_url = b.field("note URL", "https://note.com/hamamah/n/...")
        self.note_date = b.field("公開日", "YYYY-MM-DD", today_iso())
        self.note_featured = b.switch("掲示板で優先表示する(featured)", False)
        b.section("保存前に確認すること")
        b.label("・同じURLは追加できません\n・URLは https:// で始めてください\n・保存前に notes.js を自動バックアップします", lines=0, color=COLORS["muted"], size=14, gap=14)
        b.button("記事を追加する", "accent", self.add_note)

    def add_note(self, sender):
        if not self.require_project():
            return
        title = self.note_title.text.strip()
        url = self.note_url.text.strip()
        date = self.note_date.text.strip()
        featured = bool(self.note_featured.value)

        errors = []
        if not title:
            errors.append("記事タイトルを入力してください。")
        if not url.startswith("https://"):
            errors.append("note URL は https:// から始めてください。")
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("公開日は YYYY-MM-DD で入力してください。")
        notes = load_data_records(self.project_root, "notes")
        if any(article.get("url") == url for article in notes):
            errors.append("同じnote URLはすでに登録されています。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return

        note_id = "note-" + compact_date(date) + "-" + uuid.uuid4().hex[:8]
        article = {
            "id": note_id,
            "title": title,
            "url": url,
            "publishedAt": date,
            "featured": featured,
        }
        summary = "notes.js に1件追加します。\n\n" + title + "\n" + url
        if not confirm("記事を追加", summary):
            return

        try:
            rel, _var, marker = REQUIRED_DATA["notes"]
            tx = create_transaction(self.project_root, "add-note", [rel])
            insert_after_marker(os.path.join(self.project_root, rel), marker, note_entry(article))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("追加できませんでした", str(exc))
            return

        hud("新しい記事を貼りました", "success")
        self.show_tab(1)

    # -----------------------------------------------------------------
    # 作品
    # -----------------------------------------------------------------
    def build_works(self, b):
        b.title("新しい作品を置く", "data/works.js へ1件登録します。町内作品・itch.io・外部URLの3方式に対応します。")
        self.work_id = b.field("作品ID", "英小文字・数字・ハイフン 例:never-ending-loading")
        self.work_title = b.field("作品名", "例:Never Ending Loading")
        self.work_venue = b.segmented("設置場所", ["レジャー", "灯串横丁"], 0)
        self.work_kind = b.segmented("分類", ["触れるらくがき", "ゲーム"], 0)
        self.work_status = b.segmented("公開状態", ["準備中", "公開中", "非表示"], 0)
        self.work_launch = b.segmented("開き方", ["町内", "itch.io", "外部URL"], 0)

        b.section("起動先")
        self.work_entry = b.field("entry(町内プレイヤー)", "空欄なら ./works/<作品ID>/index.html")
        self.work_embed_url = b.field("embedUrl(itch.io埋め込み)", "https://itch.io/embed-upload/...")
        self.work_url = b.field("通常URL / 外部URL", "https://...")

        b.section("町内フレーム(空欄は自動設定)")
        self.work_frame_title = b.field("frameTitle", "空欄なら作品名")
        self.work_return_label = b.field("returnLabel", "空欄なら設置場所から自動設定")
        self.work_frame_mode = b.field("frameMode", "空欄ならレジャー=soft / 横丁=standard")
        self.work_player_layout = b.field("playerLayout(任意)", "例:phone")
        self.work_player_width = b.field("playerWidth(任意)", "例:360")
        self.work_player_height = b.field("playerHeight(任意)", "例:640")

        b.section("施設メニュー")
        self.work_menu_title = b.field("menuTitle(一覧用の短い名前・任意)", "空欄なら作品名を表示")
        self.work_menu_category = b.field("menuCategory", "空欄なら分類から自動設定")
        self.work_menu_description = b.text_view("menuDescription(任意)", "空欄なら短い説明を使用", height=74)
        self.work_description = b.text_view("短い説明(任意)", "作品そのものの短い説明", height=74)
        self.work_empty = b.text_view("準備中メッセージ", "公開前に使う町らしい一文", "この作品は準備中です。", height=74)
        self.work_make_folder = b.switch("町内プレイヤー用の作品フォルダを雛形から作る", True)

        b.section("保存前に確認すること")
        b.label("・作品IDは一度決めたら変えません\n・公開中の町内作品には index.html が必要です\n・公開中のitch.io作品には itch.io の embedUrl が必要です\n・公開中の外部作品には https URL が必要です\n・保存前に works.js を自動バックアップします", lines=0, color=COLORS["muted"], size=14, gap=14)
        b.button("作品を登録する", "accent", self.add_work)
        b.section("過去の作品を変えるとき")
        b.label("既存作品は別室で、現在の表示設定を保持したまま編集できます。作品IDは固定です。", lines=0, color=COLORS["muted"], size=14, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)

    def current_work_fields(self):
        venue = "leisure_center" if self.work_venue.selected_index == 0 else "tomogushi_alley"
        kind = "work" if self.work_kind.selected_index == 0 else "game"
        status = ["preparing", "open", "hidden"][max(0, self.work_status.selected_index)]
        launch = ["embedded", "itch_embed", "external"][max(0, self.work_launch.selected_index)]
        return venue, kind, status, launch

    def add_work(self, sender):
        if not self.require_project():
            return
        work_id = self.work_id.text.strip()
        title = self.work_title.text.strip()
        venue, kind, status, launch = self.current_work_fields()
        entry = self.work_entry.text.strip()
        embed_url = self.work_embed_url.text.strip()
        url = self.work_url.text.strip()
        description = self.work_description.text.strip()
        menu_description = self.work_menu_description.text.strip() or description
        empty_text = self.work_empty.text.strip() or "この作品は準備中です。"
        make_folder = bool(self.work_make_folder.value)

        if not entry:
            entry = "./works/" + work_id + "/index.html"
        if launch != "embedded":
            make_folder = False

        errors = []
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", work_id):
            errors.append("作品IDは英小文字・数字・ハイフンだけで入力してください。")
        if not title:
            errors.append("作品名を入力してください。")

        works = load_data_records(self.project_root, "works")
        if any(work.get("id") == work_id for work in works):
            errors.append("同じ作品IDがすでにあります: " + work_id)

        created_rel = "works/" + work_id
        if launch == "embedded":
            safe_entry = relative_safe_path(entry)
            if not safe_entry:
                errors.append("entry はプロジェクト内の相対パスにしてください。")
            elif status == "open":
                final_entry = os.path.join(self.project_root, safe_entry)
                if not os.path.isfile(final_entry) and not make_folder:
                    errors.append("公開中の町内作品には entry の index.html が必要です。雛形を作るか、既存のentryを指定してください。")
            if make_folder and os.path.exists(os.path.join(self.project_root, created_rel)):
                errors.append("作品フォルダがすでにあります: " + created_rel)
            if make_folder and not os.path.isdir(os.path.join(self.project_root, "works", "_template")):
                errors.append("works/_template がありません。雛形フォルダを作れません。")
        elif launch == "itch_embed":
            if status == "open" and not embed_url.startswith("https://itch.io/"):
                errors.append("公開中のitch.io作品には https://itch.io/ で始まる embedUrl が必要です。")
            if url and not url.startswith("https://"):
                errors.append("itch.io作品の通常URLは https:// から始めてください。")
        elif status == "open" and not url.startswith("https://"):
            errors.append("公開中の外部作品には https URL が必要です。")

        dimensions = {}
        for key, field in (("playerWidth", self.work_player_width), ("playerHeight", self.work_player_height)):
            raw = field.text.strip()
            if not raw:
                continue
            try:
                value = int(raw)
                if value <= 0:
                    raise ValueError()
                dimensions[key] = value
            except ValueError:
                errors.append(key + " は正の整数で入力してください。")

        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return

        work = {
            "id": work_id,
            "title": title,
            "venue": venue,
            "kind": kind,
            "status": status,
            "launch": launch,
            "entry": entry,
            "embedUrl": embed_url,
            "url": url,
            "frameTitle": self.work_frame_title.text.strip() or title,
            "returnLabel": self.work_return_label.text.strip() or default_work_return_label(venue),
            "frameMode": self.work_frame_mode.text.strip() or default_work_frame_mode(venue),
            "playerLayout": self.work_player_layout.text.strip(),
            "menuTitle": self.work_menu_title.text.strip(),
            "menuCategory": self.work_menu_category.text.strip() or default_work_menu_category(kind),
            "menuDescription": menu_description,
            "description": description,
            "emptyText": empty_text,
        }
        work.update(dimensions)

        status_text = {"preparing": "準備中", "open": "公開中", "hidden": "非表示"}[status]
        launch_text = {"embedded": "町内プレイヤー", "itch_embed": "itch.io埋め込み", "external": "外部URL"}[launch]
        summary = "works.js に作品を1件登録します。\n\n{0}\nID: {1}\n{2} / {3}".format(title, work_id, status_text, launch_text)
        if make_folder:
            summary += "\n\nworks/{0}/ を雛形から作ります。".format(work_id)
        if not confirm("作品を登録", summary):
            return

        rel, _var, marker = REQUIRED_DATA["works"]
        tx = None
        created = False
        try:
            tx = create_transaction(self.project_root, "add-work", [rel])
            if make_folder:
                self.create_work_from_template(work_id, title)
                tx["created_paths"].append(created_rel)
                created = True
            if status == "open" and launch == "embedded":
                safe_entry = relative_safe_path(entry)
                if not safe_entry or not os.path.isfile(os.path.join(self.project_root, safe_entry)):
                    raise ValueError("雛形作成後も entry の index.html を確認できません。")
            insert_after_marker(os.path.join(self.project_root, rel), marker, work_entry(work))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            if created:
                target = os.path.join(self.project_root, created_rel)
                if os.path.isdir(target):
                    shutil.rmtree(target, ignore_errors=True)
            alert("登録できませんでした", str(exc))
            return

        hud("新しい作品を置きました", "success")
        self.show_tab(2)

    def open_existing_work_editor(self, sender):
        if not self.require_project():
            return
        work = getattr(sender, "work_record", None)
        if not work or not work.get("id"):
            alert("編集できません", "作品情報を読み取れませんでした。")
            return
        editor = ExistingWorkEditor(self, work)
        editor.present("fullscreen", hide_title_bar=True)

    def save_existing_work(self, original_id, work):
        if not self.require_project():
            return False

        errors = []
        if not work.get("title"):
            errors.append("作品名を入力してください。")
        status = work.get("status")
        launch = work.get("launch")
        if status == "open" and launch == "embedded":
            entry = relative_safe_path(work.get("entry", ""))
            if not entry:
                errors.append("公開中の町内作品には entry が必要です。")
            elif not os.path.isfile(os.path.join(self.project_root, entry)):
                errors.append("entry の index.html が見つかりません: " + entry)
        elif status == "open" and launch == "itch_embed":
            if not work.get("embedUrl", "").startswith("https://itch.io/"):
                errors.append("公開中のitch.io作品には https://itch.io/ で始まる embedUrl が必要です。")
            if work.get("url") and not work.get("url", "").startswith("https://"):
                errors.append("itch.io作品の通常URLは https:// から始めてください。")
        elif status == "open" and launch == "external":
            if not work.get("url", "").startswith("https://"):
                errors.append("公開中の外部作品には https URL が必要です。")
        elif status == "open" and launch not in ("embedded", "itch_embed", "external"):
            errors.append("対応していない開き方です: " + str(launch))
        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return False

        summary = "works.js の登録内容を更新します。\n\n{0}\n状態: {1}".format(
            work.get("title"), {"open": "公開中", "preparing": "準備中", "hidden": "非表示"}.get(status, status))
        if not confirm("作品を更新", summary):
            return False

        tx = None
        try:
            rel, var_name, _marker = REQUIRED_DATA["works"]
            tx = create_transaction(self.project_root, "edit-work", [rel])
            replace_object_by_id(
                os.path.join(self.project_root, rel),
                var_name,
                original_id,
                work_entry(work),
            )

            # 保存直後に対象IDを読み直し、台帳から消えていないことを確認する。
            saved_records = load_data_records(self.project_root, "works")
            saved = next((item for item in saved_records if item.get("id") == original_id), None)
            if not saved:
                raise ValueError("保存後の works.js から対象作品を確認できませんでした。")
            if saved.get("launch") != work.get("launch"):
                raise ValueError("保存後の launch が一致しません。")
            if work.get("launch") == "itch_embed" and saved.get("embedUrl") != work.get("embedUrl"):
                raise ValueError("保存後の embedUrl が一致しません。")

            finish_transaction(self.project_root, tx)
        except Exception as exc:
            # 保存後検証で異常を見つけた場合は、その場で works.js を元へ戻す。
            if tx:
                backup_abs = backup_abs_from_transaction(self.project_root, tx)
                for rel_path in tx.get("files", []):
                    source = os.path.join(backup_abs, rel_path)
                    target = os.path.join(self.project_root, rel_path)
                    if os.path.isfile(source):
                        shutil.copy2(source, target)
            alert("更新できませんでした", str(exc))
            return False

        hud("作品の台帳を更新しました", "success")
        return True

    def open_past_records(self, sender=None):
        if not self.require_project():
            return
        message = "ここでは過去の note記事・作品・更新履歴を編集できます。\n\n追加画面とは分け、保存のたびに対象ファイルをバックアップします。削除はできません。"
        if not confirm("過去の記録を編集", message, "編集室を開く"):
            return
        editor = PastRecordsEditor(self)
        editor.present("fullscreen", hide_title_bar=True)

    def save_existing_note(self, original_id, article):
        if not self.require_project():
            return False
        title = article.get("title", "").strip()
        url = article.get("url", "").strip()
        date = (article.get("publishedAt") or article.get("publish_date") or "").strip()
        errors = []
        if not title:
            errors.append("記事タイトルを入力してください。")
        if not url.startswith("https://"):
            errors.append("note URL は https:// から始めてください。")
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("公開日は YYYY-MM-DD で入力してください。")
        notes = load_data_records(self.project_root, "notes")
        if any(item.get("url") == url and item.get("id") != original_id for item in notes):
            errors.append("同じnote URLはすでに別の記事として登録されています。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + item for item in errors))
            return False
        article["publishedAt"] = date
        summary = "notes.js の既存記事を置き換えます。\n\n" + title + "\n" + url
        if not confirm("過去の記事を更新", summary, "置き換える"):
            return False
        try:
            rel, var_name, _marker = REQUIRED_DATA["notes"]
            tx = create_transaction(self.project_root, "edit-note", [rel])
            replace_object_by_id(os.path.join(self.project_root, rel), var_name, original_id, note_entry(article))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("更新できませんでした", str(exc))
            return False
        hud("過去の記事を更新しました", "success")
        return True

    def save_existing_update(self, update):
        if not self.require_project():
            return False
        date = update.get("date", "").strip()
        title = update.get("title", "").strip()
        body = update.get("body", "").strip()
        errors = []
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("日付は YYYY-MM-DD で入力してください。")
        if not title:
            errors.append("見出しを入力してください。")
        if not body:
            errors.append("本文を入力してください。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + item for item in errors))
            return False
        summary = "updates.js の既存履歴を置き換えます。\n\n{0}\n{1}".format(title, body)
        if not confirm("過去の更新履歴を更新", summary, "置き換える"):
            return False
        try:
            rel, var_name, _marker = REQUIRED_DATA["updates"]
            tx = create_transaction(self.project_root, "edit-update", [rel])
            replace_object_by_index(os.path.join(self.project_root, rel), var_name, update.get("_record_index", -1), update_entry(update))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("更新できませんでした", str(exc))
            return False
        hud("過去の更新履歴を更新しました", "success")
        return True

    def create_work_from_template(self, work_id, title):
        source = os.path.join(self.project_root, "works", "_template")
        target = os.path.join(self.project_root, "works", work_id)
        if not os.path.isdir(source):
            raise FileNotFoundError("works/_template がありません。")
        if os.path.exists(target):
            raise FileExistsError("作品フォルダがすでにあります: " + target)
        shutil.copytree(source, target)

        meta_path = os.path.join(target, "work-meta.js")
        if os.path.isfile(meta_path):
            text = safe_read(meta_path)
            text = text.replace('id: "new-work-id"', 'id: ' + js_string(work_id))
            text = text.replace('title: "新しい触れるらくがき"', 'title: ' + js_string(title))
            atomic_write(meta_path, text)

        index_path = os.path.join(target, "index.html")
        if os.path.isfile(index_path):
            text = safe_read(index_path)
            text = text.replace("<title>新しい触れるらくがき</title>", "<title>" + title + "</title>")
            atomic_write(index_path, text)

    # -----------------------------------------------------------------
    # 更新履歴
    # -----------------------------------------------------------------
    def build_updates(self, b):
        b.title("更新履歴を書く", "data/updates.js の先頭へ1件追加します。観光案内所の更新履歴に自動で出ます。")
        self.update_date = b.field("日付", "YYYY-MM-DD", today_iso())
        self.update_title = b.field("見出し", "例:レジャーセンターに新しい筐体を設置")
        self.update_body = b.text_view("本文", "町に起きたことを短く書きます", height=110)
        self.update_tags = b.field("タグ(カンマ区切り)", "例:leisure-center, rakugaki, open")
        b.section("保存前に確認すること")
        b.label("・日付は YYYY-MM-DD\n・タグは任意。カンマで区切ると配列として保存\n・保存前に updates.js を自動バックアップします", lines=0, color=COLORS["muted"], size=14, gap=14)
        b.button("更新履歴を追加する", "accent", self.add_update)

    def add_update(self, sender):
        if not self.require_project():
            return
        date = self.update_date.text.strip()
        title = self.update_title.text.strip()
        body = self.update_body.text.strip()
        tags = [tag.strip() for tag in self.update_tags.text.split(",") if tag.strip()]

        errors = []
        try:
            datetime.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            errors.append("日付は YYYY-MM-DD で入力してください。")
        if not title:
            errors.append("見出しを入力してください。")
        if not body:
            errors.append("本文を入力してください。")
        if errors:
            alert("入力を確認してください", "\n".join("・" + e for e in errors))
            return

        update = {"date": date, "title": title, "body": body, "tags": tags}
        summary = "updates.js に1件追加します。\n\n{0}\n{1}".format(title, body)
        if not confirm("更新履歴を追加", summary):
            return

        try:
            rel, _var, marker = REQUIRED_DATA["updates"]
            tx = create_transaction(self.project_root, "add-update", [rel])
            insert_after_marker(os.path.join(self.project_root, rel), marker, update_entry(update))
            finish_transaction(self.project_root, tx)
        except Exception as exc:
            alert("追加できませんでした", str(exc))
            return

        hud("町の記録を書きました", "success")
        self.show_tab(3)

    # -----------------------------------------------------------------
    # 安全確認
    # -----------------------------------------------------------------
    def build_safety(self, b):
        b.title("町の状態を確認", "データの入口、重複、公開中作品のリンク先を確認します。")
        if not project_looks_valid(self.project_root):
            b.label("まず Working Copy の yumaniwa-town 内からこのスクリプトを起動し、[案内]で町を再検出してください。", lines=0, color=COLORS["red"], size=15, gap=14)
            return

        report = validate_project(self.project_root)
        stats = report.get("stats", {})
        b.section("現在の台帳")
        b.label("note記事: {notes}件\n作品: {works}件\n町に公開中の作品: {open_works}件".format(**stats), lines=0, color=COLORS["text"], size=16, gap=14)

        if report["errors"]:
            b.section("修正が必要")
            b.label("\n".join("・" + e for e in report["errors"]), lines=0, color=COLORS["red"], size=14, gap=14)
        else:
            b.section("確認結果")
            b.label("重大な問題は見つかりませんでした。", lines=0, color=COLORS["green"], size=15, gap=10)

        if report["warnings"]:
            b.section("注意")
            b.label("\n".join("・" + item for item in report["warnings"]), lines=0, color=COLORS["accent"], size=14, gap=14)

        b.button("もう一度確認する", "blue", self.refresh_safety)
        b.section("直前の更新")
        tx = last_transaction(self.project_root)
        if tx:
            state = "(戻し済み)" if tx.get("undone") else ""
            files = "、".join(tx.get("files", []))
            text = "{label} {state}\n{created_at}\n対象: {files}".format(
                label=tx.get("label", "update"), state=state,
                created_at=tx.get("created_at", ""), files=files)
            if tx.get("created_paths"):
                text += "\n作成: " + "、".join(tx.get("created_paths", []))
            b.label(text, lines=0, color=COLORS["text"], size=14, gap=10)
            if not tx.get("undone"):
                b.button("直前の更新を取り消す", "red", self.undo_last)
        else:
            b.label("まだこの管理室から保存した更新はありません。", lines=0, color=COLORS["muted"], size=14, gap=14)

        b.section("過去の記録を編集")
        b.label("追加画面とは分けてあります。既存の note記事・作品・更新履歴を直すときだけ、専用の編集室を開いてください。", lines=0, color=COLORS["muted"], size=14, gap=10)
        b.button("過去の記録を編集する(別室)", "panel_alt", self.open_past_records)
        b.section("バックアップ")
        b.label("保存ごとに、変更前のファイルを Git 管理外の Pythonista Documents/YumaniwaDesk-data/backups/ にコピーします。直前の1回はこの画面から取り消せます。古いバックアップは最大 {0} 件まで残します。\n\nWorking Copy には、実際に編集した町のファイルだけが変更として表示されます。".format(MAX_BACKUPS), lines=0, color=COLORS["muted"], size=14, gap=14)

    def refresh_safety(self, sender):
        self.show_tab(4)

    def undo_last(self, sender):
        if not self.require_project():
            return
        tx = last_transaction(self.project_root)
        if not tx or tx.get("undone"):
            alert("取り消せません", "戻せる直前の更新がありません。")
            return
        message = "次の更新を取り消します。\n\n{0}\n対象: {1}".format(tx.get("label", "update"), "、".join(tx.get("files", [])))
        if tx.get("created_paths"):
            message += "\n\n作成した作品フォルダも削除します:\n" + "、".join(tx.get("created_paths", []))
        if not confirm("直前の更新を取り消す", message, "取り消す"):
            return
        try:
            undo_last_transaction(self.project_root)
        except Exception as exc:
            alert("取り消せませんでした", str(exc))
            return
        hud("直前の更新を戻しました", "success")
        self.show_tab(4)


def main():
    try:
        desk = YumaniwaDesk()
        # 既存のnote.py / rakugaki_cabinet.pyと同じ、標準のfullscreen表示。
        desk.present("fullscreen")
    except Exception:
        details = traceback.format_exc()
        print(details)
        try:
            console.alert(APP_NAME + " の起動エラー", details)
        except Exception:
            pass
        raise


if __name__ == "__main__":
    main()
