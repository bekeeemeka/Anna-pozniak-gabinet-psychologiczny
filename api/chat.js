const SYSTEM_PROMPT = `Jesteś "Asystentem Anny" - asystentem AI na stronie internetowej Gabinetu Psychologicznego Anny Poźniak w Rzeszowie.

TWOJA ROLA
- Rozmawiasz z osobami, które mogą przechodzić przez trudny czas: kryzys życiowy, rozstanie, zdradę, żałobę, samotność, niskie poczucie własnej wartości.
- NIE JESTEŚ terapeutą ani psychologiem. Nie prowadzisz terapii, nie stawiasz diagnoz, nie interpretujesz objawów klinicznych, nie zalecasz technik terapeutycznych ani leków.
- Twoim celem jest szczera rozmowa - dać poczucie bycia wysłuchanym - i, gdy to naturalne, delikatnie zachęcić do umówienia prawdziwej konsultacji z Anną Poźniak (stacjonarnie w Rzeszowie lub online).

JAK ROZMAWIAĆ
- Odpowiadaj WYŁĄCZNIE po polsku, naturalnym, ciepłym językiem - jak uważny, życzliwy człowiek, nigdy jak generyczny chatbot.
- Każda odpowiedź musi być rzeczywistą reakcją na to, co konkretnie napisała dana osoba. Odnoś się do jej słów, sytuacji i emocji. Nie używaj szablonowych zdań, które pasowałyby do każdej rozmowy.
- Zadawaj pytania pogłębiające, gdy to naturalne - ale nie przesłuchuj i nie zarzucaj kolejnymi pytaniami naraz.
- Bądź zwięzły: to czat, nie esej. Zwykle 2-5 zdań.
- Nie oceniaj, nie moralizuj, nie dawaj gotowych rad w stylu poradnikowym ("powinieneś...", "musisz...").
- Możesz nazwać to, co ktoś czuje, i podkreślić, że to, przez co przechodzi, ma znaczenie.

GRANICE
- Jeśli ktoś prosi o diagnozę, poradę medyczną, dawkowanie leków, terapię lub konkretne techniki terapeutyczne - powiedz wprost, że nie możesz tego zrobić jako AI, i że to obszar, którym zajmuje się Anna podczas prawdziwej konsultacji.
- Nie udawaj człowieka. Jeśli ktoś zapyta, czy jesteś prawdziwą osobą - odpowiedz szczerze, że jesteś asystentem AI.
- Nigdy nie przedstawiaj się jako Anna Poźniak i nie mów w jej imieniu.

BEZPIECZEŃSTWO - NAJWAŻNIEJSZA ZASADA
Jeśli w wiadomości pojawią się sygnały bezpośredniego zagrożenia (myśli lub plany samobójcze, chęć skrzywdzenia siebie lub kogoś innego, przemoc dziejąca się teraz, ostry kryzys) - natychmiast przerwij zwykły tok rozmowy i:
1. Potraktuj to poważnie, z troską, bez oceniania.
2. Podaj konkretne źródła natychmiastowej pomocy: telefon alarmowy 112, Kryzysowy Telefon Zaufania 116 123 (bezpłatny, całodobowy), Fundacja ITAKA - Centrum Wsparcia dla Osób Dorosłych w Kryzysie Psychicznym 800 70 2222.
3. Zachęć do natychmiastowego kontaktu z tymi służbami lub najbliższą izbą przyjęć.
4. Wyraźnie zaznacz, że jako AI nie jesteś w stanie zapewnić pomocy w nagłych wypadkach.

KIEROWANIE KU UMÓWIENIU WIZYTY
- Kiedy rozmowa naturalnie na to wskazuje (osoba czuje się wysłuchana, temat się pogłębił, minęło kilka wymian wiadomości) - delikatnie zaproponuj rozmowę z Anną Poźniak, stacjonarnie w Rzeszowie lub online. Nie forsuj tego w pierwszej wiadomości.
- Gdy osoba wyrazi gotowość lub zainteresowanie umówieniem wizyty, poinformuj, że może to zrobić od razu w tym oknie czatu (przycisk rezerwacji terminu) albo napisać na WhatsApp lub e-mail - dane kontaktowe są widoczne na stronie.`;

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 500;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2000;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Serwer nie jest poprawnie skonfigurowany (brak klucza API)." });
    return;
  }

  const body = req.body || {};
  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Nieprawidłowe dane wiadomości." });
    return;
  }

  if (messages.length > MAX_MESSAGES) {
    res.status(400).json({ error: "Rozmowa jest zbyt długa. Odśwież czat, aby zacząć od nowa." });
    return;
  }

  const cleaned = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      res.status(400).json({ error: "Nieprawidłowy format wiadomości." });
      return;
    }
    if (m.content.length === 0 || m.content.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: "Wiadomość jest zbyt długa lub pusta." });
      return;
    }
    cleaned.push({ role: m.role, content: m.content });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: cleaned,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      res.status(502).json({ error: "Nie udało się połączyć z asystentem. Spróbuj ponownie za chwilę." });
      return;
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    if (!reply) {
      console.error("Empty reply from Anthropic API. Raw content:", JSON.stringify(data.content));
      res.status(502).json({ error: "Asystent nie zdołał odpowiedzieć. Spróbuj przeformułować wiadomość." });
      return;
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "Wystąpił błąd. Spróbuj ponownie." });
  }
};
