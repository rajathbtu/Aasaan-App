(() => {
  const cards = [...document.querySelectorAll(".language-card")];
  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(item => {
        const active = item === card;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
        const control = item.querySelector(".selection");
        control.classList.toggle("selected-check", active);
        control.innerHTML = active
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>'
          : "";
      });
    });
  });

  document.querySelector(".continue-button").addEventListener("click", () => {
    const selected = document.querySelector(".language-card.selected");
    const language = selected?.dataset.language || "en";
    // Replace this preview event with the app's existing navigation/persistence handler.
    window.dispatchEvent(new CustomEvent("aasaanly:language-selected", { detail: { language } }));
    alert(`Selected language: ${selected?.querySelector("strong")?.textContent || "English"}`);
  });
})();
