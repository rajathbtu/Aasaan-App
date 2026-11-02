(() => {
  const cards = [...document.querySelectorAll(".role-card")];
  const confirm = document.getElementById("confirmButton");
  let selectedRole = "expert";

  function selectRole(role) {
    selectedRole = role;
    cards.forEach(card => {
      const active = card.dataset.role === role;
      card.classList.toggle("selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
  }

  cards.forEach(card => card.addEventListener("click", () => selectRole(card.dataset.role)));

  confirm.addEventListener("click", () => {
    // Demo only. In the app, connect this to the existing role-selection flow.
    window.alert(`Selected role: ${selectedRole === "expert" ? "Service Expert" : "Consumer"}\nConnect this action to the existing onboarding/navigation flow.`);
  });

  document.querySelector(".back-button").addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.alert("Connect this control to the app's existing back navigation.");
  });
})();