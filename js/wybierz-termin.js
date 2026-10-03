(() => {
  const STRIPE_URL = "https://buy.stripe.com/9B63cw9ch995bhR0ghak001";

  const przyciskiGodzin = document.querySelectorAll(".godzina-przycisk");
  const przyciskDalej = document.getElementById("przycisk-dalej");
  if (!przyciskiGodzin.length || !przyciskDalej) return;

  przyciskiGodzin.forEach((przycisk) => {
    przycisk.addEventListener("click", () => {
      przyciskiGodzin.forEach((p) => p.classList.remove("wybrana"));
      przycisk.classList.add("wybrana");
      przyciskDalej.disabled = false;
    });
  });

  przyciskDalej.addEventListener("click", () => {
    if (przyciskDalej.disabled) return;
    window.location.href = STRIPE_URL;
  });
})();
