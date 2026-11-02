(() => {
  const radiusButtons = [...document.querySelectorAll("[data-radius]")];
  const address = document.getElementById("selectedAddress");
  const search = document.getElementById("locationSearch");
  const clear = document.getElementById("clearSearch");
  let selectedRadius = 20;

  radiusButtons.forEach(button => button.addEventListener("click", () => {
    selectedRadius = Number(button.dataset.radius);
    radiusButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  }));

  search.addEventListener("input", () => {
    clear.style.display = search.value ? "block" : "none";
  });
  clear.addEventListener("click", () => {
    search.value = "";
    clear.style.display = "none";
    search.focus();
  });

  document.getElementById("currentLocation").addEventListener("click", () => {
    // Demo only. Production: request location permission, obtain GPS coordinates,
    // reverse-geocode them, move the map and update the selected address.
    window.alert("Connect this action to the app's location permission and GPS flow.");
  });
  document.getElementById("changeLocation").addEventListener("click", () => search.focus());
  document.getElementById("recenter").addEventListener("click", () => {
    window.alert("Connect this control to recenter the production map on the selected coordinates.");
  });
  document.getElementById("layers").addEventListener("click", () => {
    window.alert("Connect this control to the map SDK's map-type/layer selector.");
  });
  document.querySelector(".back").addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.alert("Connect this control to the app's existing back navigation.");
  });
  document.getElementById("confirm").addEventListener("click", () => {
    // Demo only. Production: persist the chosen coordinates and radius using
    // the existing onboarding/service-area API contract.
    window.alert(`Confirm service area\nLocation: ${address.textContent}\nRadius: ${selectedRadius} km`);
  });
})();