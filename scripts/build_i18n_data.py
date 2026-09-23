#!/usr/bin/env python3
"""Regenerate js/i18n-data.js from scripts/translations.py.

Run this after adding new pages/content and new add(...) entries in
translations.py. It never touches the HTML files - js/i18n.js re-derives
element order at runtime using the same SELECTORS list, so keys line up
automatically as long as extract_i18n.SELECTORS and js/i18n.js's SELECTORS
stay identical.

Usage: python3 scripts/build_i18n_data.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from extract_i18n import PAGES, process  # noqa: E402
from translations import TRANSLATIONS  # noqa: E402

PAGE_SLUG = {
    "index.html": "index", "blog.html": "blog", "ksiazka.html": "ksiazka",
    "kontakt.html": "kontakt",
    "konsultacje-psychologiczne-rzeszow.html": "konsultacje_psychologiczne_rzeszow",
    "psycholog-online.html": "psycholog_online",
    "odbudowa-wartosci-rzeszow.html": "odbudowa_wartosci_rzeszow",
    "pomoc-po-rozstaniu-rzeszow.html": "pomoc_po_rozstaniu_rzeszow",
    "wsparcie-w-kryzysie-rzeszow.html": "wsparcie_w_kryzysie_rzeszow",
    "404.html": "p404",
}


def main():
    manifest = {}
    for p in PAGES:
        process(ROOT / p, manifest)

    missing = []
    out = {}
    for page, entries in manifest.items():
        slug = PAGE_SLUG[page]
        page_data = {}
        for key, pl in entries.items():
            t = TRANSLATIONS.get(pl)
            if not t:
                missing.append((page, key, pl[:60]))
                continue
            page_data[key] = {"en": t["en"], "uk": t["uk"], "de": t["de"]}
        out[slug] = page_data

    if missing:
        print(f"WARNING: {len(missing)} strings have no translation yet (left untranslated -> will fall back to Polish):")
        for m in missing:
            print(" ", m)

    js = "window.I18N_DATA = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "js" / "i18n-data.js").write_text(js, encoding="utf-8")
    total = sum(len(v) for v in out.values())
    print(f"Wrote js/i18n-data.js ({total} keys across {len(out)} pages)")


if __name__ == "__main__":
    main()
