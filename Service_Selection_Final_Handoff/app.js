(() => {
  const cards = [...document.querySelectorAll(".service-card")];
  const tabs = [...document.querySelectorAll(".category-tab")];
  const search = document.getElementById("serviceSearch");
  const clearSearch = document.getElementById("clearSearch");
  const chips = document.getElementById("selectedChips");
  const count = document.getElementById("selectedCount");
  const confirm = document.getElementById("confirmButton");
  const noResults = document.getElementById("noResults");
  const content = document.getElementById("serviceContent");
  let activeCategory = "all";

  const selected = new Set(["ac", "chimney", "geyser"]);

  function updateSelection() {
    cards.forEach(card => card.classList.toggle("selected", selected.has(card.dataset.id)));
    chips.innerHTML = "";
    cards.filter(card => selected.has(card.dataset.id)).forEach(card => {
      const chip = document.createElement("span");
      chip.className = "selected-chip";
      chip.dataset.chip = card.dataset.id;
      chip.append(document.createTextNode(card.dataset.name));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${card.dataset.name}`);
      const icon = document.createElement("img");
      icon.src = "assets/icons/close.svg";
      icon.alt = "";
      remove.append(icon);
      remove.addEventListener("click", () => {
        selected.delete(card.dataset.id);
        updateSelection();
      });
      chip.append(remove);
      chips.append(chip);
    });
    count.textContent = selected.size;
    confirm.disabled = selected.size === 0;
  }

  function applyVisibility() {
    const term = search.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(".service-section").forEach(section => {
      const sectionName = section.dataset.section;
      const sectionMatch = activeCategory === "all" || activeCategory === sectionName;
      const heading = section.querySelector(".section-heading");
      let cardShown = 0;
      section.querySelectorAll(".service-card").forEach(card => {
        const match = sectionMatch && card.dataset.name.toLowerCase().includes(term);
        card.style.display = match ? "flex" : "none";
        if (match) cardShown++;
      });
      const hasSearch = term.length > 0;
      section.style.display = (sectionMatch && cardShown > 0) ? "block" : "none";
      if (hasSearch && cardShown > 0) {
        section.querySelector(".service-grid").style.display = "grid";
        heading.setAttribute("aria-expanded", "true");
        heading.querySelector(".section-chevron").src = "assets/icons/chevron-up.svg";
      }
      shown += cardShown;
    });
    noResults.hidden = shown !== 0;
    clearSearch.hidden = !term;
  }

  tabs.forEach(tab => tab.addEventListener("click", () => {
    activeCategory = tab.dataset.category;
    tabs.forEach(item => item.classList.toggle("active", item === tab));
    applyVisibility();
    content.scrollTo({top: 0, behavior: "smooth"});
  }));

  search.addEventListener("input", applyVisibility);
  clearSearch.addEventListener("click", () => {
    search.value = "";
    applyVisibility();
    search.focus();
  });

  document.querySelectorAll(".section-heading").forEach(heading => {
    heading.addEventListener("click", () => {
      const section = heading.closest(".service-section");
      const grid = section.querySelector(".service-grid");
      const expanded = heading.getAttribute("aria-expanded") === "true";
      heading.setAttribute("aria-expanded", String(!expanded));
      grid.classList.toggle("collapsed-content", expanded);
      heading.querySelector(".section-chevron").src = expanded
        ? "assets/icons/chevron-down.svg"
        : "assets/icons/chevron-up.svg";
    });
  });

  cards.forEach(card => card.addEventListener("click", () => {
    const id = card.dataset.id;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    updateSelection();
  }));

  document.getElementById("clearAll").addEventListener("click", () => {
    selected.clear();
    updateSelection();
  });

  confirm.addEventListener("click", () => {
    const names = cards.filter(card => selected.has(card.dataset.id)).map(card => card.dataset.name);
    window.alert(`Selected services:\\n${names.join("\\n")}\\n\\nConnect this action to the app's existing save/confirm flow.`);
  });

  document.querySelector(".back-button").addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.alert("Connect this control to the app's existing back navigation.");
  });

  updateSelection();
  applyVisibility();
})();