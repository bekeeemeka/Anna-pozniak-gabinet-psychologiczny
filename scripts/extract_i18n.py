#!/usr/bin/env python3
"""Read-only: walk each page with the same selector logic the JS runtime will use,
and dump PL source HTML to a manifest keyed by <page_slug>.<0001-based index>.
The HTML files themselves are never modified - js/i18n.js re-derives the same
element order at runtime via document.querySelectorAll, so keys line up exactly.
"""
import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent

PAGES = [
    "index.html", "blog.html", "ksiazka.html", "kontakt.html",
    "konsultacje-psychologiczne-rzeszow.html", "psycholog-online.html",
    "odbudowa-wartosci-rzeszow.html", "pomoc-po-rozstaniu-rzeszow.html",
    "wsparcie-w-kryzysie-rzeszow.html", "404.html",
]

# Keep this list byte-for-byte identical (order and selectors) to SELECTORS in js/i18n.js
SELECTORS = [
    "header.naglowek span.marka-opis",
    "header.naglowek nav.nawigacja a",
    "header.naglowek a.przycisk-naglowka",
    "main .nadtytul",
    "main h1", "main h2", "main h3", "main h4",
    "main p",
    "main blockquote",
    "main li > span:not(.numer)",
    "main a.przycisk", "main a.link-tekstowy", "main a.link-strzalka",
    "main span.kwota", "main span.opis-ceny",
    "main .karta-ksiazki-tresc h3",
    "main figcaption",
    "footer.stopka p",
    "footer.stopka span.marka-opis",
    "#asystent-panel p.asystent-tytul",
    "#asystent-panel p.asystent-podtytul",
    "#asystent-panel p.asystent-zastrzezenie",
    ".asystent-szybkie button",
]

ATTR_TARGETS = [
    ("header.naglowek button.przycisk-menu", "aria-label"),
    ("#asystent-przycisk", "aria-label"),
    ("#asystent-zamknij", "aria-label"),
    ("#asystent-wyslij", "aria-label"),
    ("#asystent-input", "placeholder"),
]

KSIAZKA_EXCLUDE_IDS = {
    "wystarczajaco-dobry-mezczyzna", "the-good-enough-man",
    "nie-jestes-trudna", "you-are-not-difficult",
}


def in_excluded_book_section(el):
    node = el
    while node is not None and getattr(node, "name", None):
        if node.name == "section" and node.get("id") in KSIAZKA_EXCLUDE_IDS:
            return True
        if node.name == "article" and "ksiazka-fragment" in (node.get("class") or []):
            return True
        node = node.parent
    return False


def process(path: Path, manifest: dict):
    slug = path.stem.replace("-", "_")
    if slug == "404":
        slug = "p404"
    html = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    counter = 0
    page_manifest = {}
    seen_ids = set()

    matched = []
    for sel in SELECTORS:
        for el in soup.select(sel):
            matched.append(el)

    for el in matched:
        if id(el) in seen_ids:
            continue
        if path.name == "ksiazka.html" and in_excluded_book_section(el):
            continue
        inner = el.decode_contents().strip()
        if not inner:
            continue
        counter += 1
        key = f"{slug}.{counter:04d}"
        page_manifest[key] = inner
        seen_ids.add(id(el))

    for sel, attr in ATTR_TARGETS:
        for el in soup.select(sel):
            val = el.get(attr)
            if not val or not val.strip():
                continue
            counter += 1
            key = f"{slug}.{counter:04d}"
            page_manifest[key] = val.strip()

    manifest[path.name] = page_manifest
    print(f"{path.name}: {len(page_manifest)} strings")


def main():
    manifest = {}
    for p in PAGES:
        process(ROOT / p, manifest)
    out_path = ROOT / "scripts" / "i18n_manifest_pl.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(v) for v in manifest.values())
    print(f"\nTotal strings: {total}")
    print(f"Manifest written to {out_path}")


if __name__ == "__main__":
    main()
