(() => {
  const CALENDLY_URL = "https://calendly.com/anna-pozniak-hkuv";

  const powitanie =
    "Cześć! Jestem asystentem AI tej strony - nie jestem terapeutą, ale chętnie Cię wysłucham. Co Cię do mnie sprowadza?";

  const kontener = document.getElementById("asystent-czatu");
  if (!kontener) return;

  const przycisk = document.getElementById("asystent-przycisk");
  const panel = document.getElementById("asystent-panel");
  const zamknij = document.getElementById("asystent-zamknij");
  const wiadomosciEl = document.getElementById("asystent-wiadomosci");
  const formularz = document.getElementById("asystent-formularz");
  const input = document.getElementById("asystent-input");
  const wyslijBtn = document.getElementById("asystent-wyslij");
  const przyciskUmow = kontener.querySelector("[data-book]");

  let historia = [];
  let wysylanie = false;
  let otwartyRaz = false;

  function otworzCalendly() {
    if (window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
      window.Calendly.initPopupWidget({ url: CALENDLY_URL });
    } else {
      window.open(CALENDLY_URL, "_blank", "noopener");
    }
  }

  function dodajWiadomosc(tresc, rola) {
    const dymek = document.createElement("div");
    dymek.className =
      "wiadomosc " + (rola === "user" ? "wiadomosc-uzytkownik" : "wiadomosc-asystent");
    dymek.textContent = tresc;
    wiadomosciEl.appendChild(dymek);
    wiadomosciEl.scrollTop = wiadomosciEl.scrollHeight;
  }

  function dodajBlad(tresc) {
    const dymek = document.createElement("div");
    dymek.className = "wiadomosc wiadomosc-blad";
    dymek.textContent = tresc;
    wiadomosciEl.appendChild(dymek);
    wiadomosciEl.scrollTop = wiadomosciEl.scrollHeight;
  }

  function pokazPisanie() {
    const wskaznik = document.createElement("div");
    wskaznik.className = "asystent-pisze";
    wskaznik.id = "asystent-pisze";
    wskaznik.innerHTML = "<span></span><span></span><span></span>";
    wiadomosciEl.appendChild(wskaznik);
    wiadomosciEl.scrollTop = wiadomosciEl.scrollHeight;
  }

  function ukryjPisanie() {
    const wskaznik = document.getElementById("asystent-pisze");
    if (wskaznik) wskaznik.remove();
  }

  async function wyslijWiadomosc(tresc) {
    dodajWiadomosc(tresc, "user");
    historia.push({ role: "user", content: tresc });

    wysylanie = true;
    wyslijBtn.disabled = true;
    pokazPisanie();

    try {
      const odpowiedz = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: historia }),
      });

      const dane = await odpowiedz.json();
      ukryjPisanie();

      if (!odpowiedz.ok) {
        dodajBlad(dane.error || "Coś poszło nie tak. Spróbuj ponownie.");
        return;
      }

      dodajWiadomosc(dane.reply, "assistant");
      historia.push({ role: "assistant", content: dane.reply });
    } catch (err) {
      ukryjPisanie();
      dodajBlad("Nie udało się połączyć z asystentem. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      wysylanie = false;
      wyslijBtn.disabled = false;
    }
  }

  przycisk.addEventListener("click", () => {
    const otwarty = panel.hasAttribute("hidden");
    if (otwarty) {
      panel.removeAttribute("hidden");
      przycisk.setAttribute("aria-expanded", "true");
      if (!otwartyRaz) {
        otwartyRaz = true;
        dodajWiadomosc(powitanie, "assistant");
      }
      input.focus();
    } else {
      panel.setAttribute("hidden", "");
      przycisk.setAttribute("aria-expanded", "false");
    }
  });

  zamknij.addEventListener("click", () => {
    panel.setAttribute("hidden", "");
    przycisk.setAttribute("aria-expanded", "false");
  });

  if (przyciskUmow) {
    przyciskUmow.addEventListener("click", otworzCalendly);
  }

  formularz.addEventListener("submit", (e) => {
    e.preventDefault();
    const tresc = input.value.trim();
    if (!tresc || wysylanie) return;
    input.value = "";
    input.style.height = "auto";
    wyslijWiadomosc(tresc);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formularz.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
  });
})();
