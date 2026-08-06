#!/usr/bin/env python3
"""湯間庭町の作品共有ページを生成する。

使い方:
    python3 tools/create-share-pages.py

設定:
    tools/share-pages.json に作品情報を追加する。
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS_DIR = ROOT / "tools"
TEMPLATE_PATH = TOOLS_DIR / "share-page-template.html"
CONFIG_PATH = TOOLS_DIR / "share-pages.json"


def render(template: str, values: dict[str, str]) -> str:
    result = template
    for key, value in values.items():
        result = result.replace("{{" + key + "}}", value)

    if "{{" in result or "}}" in result:
        raise ValueError("未置換のテンプレート変数があります。")

    return result


def main() -> None:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    site_base = config["site_base"].rstrip("/")

    for page in config["pages"]:
        slug = page["slug"].strip("/")
        canonical_url = f"{site_base}/{slug}/"

        values = {
            "PAGE_TITLE": page["page_title"],
            "APP_TITLE": page["app_title"],
            "DESCRIPTION": page["description"],
            "THEME_COLOR": page.get("theme_color", "#0a0a0a"),
            "CANONICAL_URL": canonical_url,
            "ENTRY_URL": page["entry_url"],
            "OG_IMAGE_URL": f"{site_base}/{page['og_image'].lstrip('/')}",
            "OG_IMAGE_ALT": page["og_image_alt"],
            "ICON_180_PATH": f"../{page['icon_180'].lstrip('/')}",
            "ICON_32_PATH": f"../{page['icon_32'].lstrip('/')}",
        }

        output_dir = ROOT / slug
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "index.html"
        output_path.write_text(render(template, values), encoding="utf-8")
        print(f"generated: {output_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
