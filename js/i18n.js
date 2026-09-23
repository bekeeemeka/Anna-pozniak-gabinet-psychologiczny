(() => {
  "use strict";

  const STORAGE_KEY = "site_lang";
  const LANGS = [
    { code: "pl", label: "PL" },
    { code: "en", label: "EN" },
    { code: "uk", label: "UA" },
    { code: "de", label: "DE" },
  ];

  const PAGE_SLUG_BY_FILE = {
    "": "index",
    "index.html": "index",
    "blog.html": "blog",
    "ksiazka.html": "ksiazka",
    "kontakt.html": "kontakt",
    "konsultacje-psychologiczne-rzeszow.html": "konsultacje_psychologiczne_rzeszow",
    "psycholog-online.html": "psycholog_online",
    "odbudowa-wartosci-rzeszow.html": "odbudowa_wartosci_rzeszow",
    "pomoc-po-rozstaniu-rzeszow.html": "pomoc_po_rozstaniu_rzeszow",
    "wsparcie-w-kryzysie-rzeszow.html": "wsparcie_w_kryzysie_rzeszow",
    "404.html": "p404",
  };

  // Keep in sync with scripts/extract_i18n.py SELECTORS (same order).
  const SELECTORS = [
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
  ];

  const ATTR_TARGETS = [
    ["header.naglowek button.przycisk-menu", "aria-label"],
    ["#asystent-przycisk", "aria-label"],
    ["#asystent-zamknij", "aria-label"],
    ["#asystent-wyslij", "aria-label"],
    ["#asystent-input", "placeholder"],
  ];

  const KSIAZKA_EXCLUDE_IDS = new Set([
    "wystarczajaco-dobry-mezczyzna", "the-good-enough-man",
    "nie-jestes-trudna", "you-are-not-difficult",
  ]);

  function inExcludedBookSection(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      if (node.tagName === "SECTION" && KSIAZKA_EXCLUDE_IDS.has(node.id)) return true;
      if (node.tagName === "ARTICLE" && node.classList.contains("ksiazka-fragment")) return true;
      node = node.parentElement;
    }
    return false;
  }

  function currentSlug() {
    const file = location.pathname.split("/").pop();
    return PAGE_SLUG_BY_FILE[file] || null;
  }

  function collectTranslatableElements(isKsiazka) {
    const seen = new Set();
    const ordered = [];
    for (const sel of SELECTORS) {
      let matches;
      try {
        matches = document.querySelectorAll(sel);
      } catch (e) {
        continue;
      }
      matches.forEach((el) => {
        if (seen.has(el)) return;
        if (isKsiazka && inExcludedBookSection(el)) return;
        const inner = el.innerHTML.trim();
        if (!inner) return;
        seen.add(el);
        ordered.push(el);
      });
    }
    return ordered;
  }

  function collectAttrTargets() {
    const ordered = [];
    for (const [sel, attr] of ATTR_TARGETS) {
      document.querySelectorAll(sel).forEach((el) => {
        const val = el.getAttribute(attr);
        if (val && val.trim()) ordered.push([el, attr]);
      });
    }
    return ordered;
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
.lang-switcher{position:relative;display:inline-flex;align-items:center;margin-left:.75rem}
.lang-switcher select{appearance:none;-webkit-appearance:none;background:transparent;border:1px solid currentColor;border-radius:999px;padding:.35em 1.6em .35em .9em;font:inherit;font-size:.85rem;letter-spacing:.03em;cursor:pointer;color:inherit}
.lang-switcher::after{content:"";position:absolute;right:.7em;top:50%;width:.45em;height:.45em;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-65%) rotate(45deg);pointer-events:none;opacity:.7}
.lang-switcher select:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media (max-width:640px){.lang-switcher{margin-left:.4rem}.lang-switcher select{padding:.3em 1.4em .3em .7em;font-size:.8rem}}
`;
    document.head.appendChild(style);
  }

  function buildSwitcher(onChange, initial) {
    const wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Zmień język / Change language");
    LANGS.forEach(({ code, label }) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = label;
      if (code === initial) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => onChange(select.value));
    wrap.appendChild(select);
    return wrap;
  }

  function mountSwitcher(onChange, initial) {
    const header = document.querySelector("header.naglowek");
    if (!header) return;
    const switcher = buildSwitcher(onChange, initial);
    const cta = header.querySelector("a.przycisk-naglowka");
    if (cta) {
      header.insertBefore(switcher, cta);
    } else {
      header.appendChild(switcher);
    }
  }

  function init() {
    const slug = currentSlug();
    const data = (window.I18N_DATA && slug && window.I18N_DATA[slug]) || {};
    const isKsiazka = slug === "ksiazka";

    const elements = collectTranslatableElements(isKsiazka);
    const attrTargets = collectAttrTargets();

    // cache originals (Polish) so we can always restore losslessly
    const originals = elements.map((el) => el.innerHTML);
    const attrOriginals = attrTargets.map(([el, attr]) => el.getAttribute(attr));

    function apply(lang) {
      let dataIndex = 0;
      elements.forEach((el, i) => {
        dataIndex += 1;
        const key = slug + "." + String(dataIndex).padStart(4, "0");
        if (lang === "pl") {
          el.innerHTML = originals[i];
          return;
        }
        const entry = data[key];
        if (entry && entry[lang]) {
          el.innerHTML = entry[lang];
        } else {
          el.innerHTML = originals[i];
        }
      });

      let attrIndex = dataIndex;
      attrTargets.forEach(([el, attr], i) => {
        attrIndex += 1;
        const key = slug + "." + String(attrIndex).padStart(4, "0");
        if (lang === "pl") {
          el.setAttribute(attr, attrOriginals[i]);
          return;
        }
        const entry = data[key];
        if (entry && entry[lang]) {
          el.setAttribute(attr, entry[lang]);
        } else {
          el.setAttribute(attr, attrOriginals[i]);
        }
      });

      document.documentElement.setAttribute("data-site-lang", lang);
    }

    let saved = "pl";
    try {
      saved = localStorage.getItem(STORAGE_KEY) || "pl";
    } catch (e) {
      /* ignore */
    }
    if (!LANGS.some((l) => l.code === saved)) saved = "pl";

    injectStyles();
    mountSwitcher((lang) => {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        /* ignore */
      }
      apply(lang);
    }, saved);

    if (saved !== "pl") apply(saved);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
