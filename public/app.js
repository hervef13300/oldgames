const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
const cards = [...document.querySelectorAll("[data-search]")];
document.querySelector("#search").addEventListener("input", (e) => {
  const q = normalize(e.target.value.trim());
  let shown = 0;
  for (const card of cards) {
    card.hidden = !normalize(card.dataset.search).includes(q);
    if (!card.hidden) shown++;
  }
  document.querySelector("#empty").hidden = shown > 0;
});
for (const button of document.querySelectorAll("[data-favorite]")) {
  const key = "oldgames:favorite:" + button.dataset.favorite,
    name = button.closest("article").querySelector("h3").textContent;
  let saved = false;
  try {
    saved = localStorage.getItem(key) === "yes";
  } catch {}
  const paint = () => {
    button.textContent = saved ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute(
      "aria-label",
      (saved ? "Retirer " : "Ajouter ") +
        name +
        (saved ? " des favoris" : " aux favoris"),
    );
  };
  button.addEventListener("click", () => {
    saved = !saved;
    paint();
    try {
      localStorage.setItem(key, saved ? "yes" : "no");
      document.querySelector("#favorite-status").textContent =
        name + (saved ? " ajouté aux favoris." : " retiré des favoris.");
    } catch {
      document.querySelector("#favorite-status").textContent =
        "Stockage indisponible ; ce choix est temporaire.";
    }
  });
  paint();
}
