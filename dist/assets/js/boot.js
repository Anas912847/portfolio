/* Exécuté avant le premier affichage : thème, et choix entre la scène 3D et le bureau. */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  var get = function (store, k) { try { return window[store].getItem(k); } catch (e) { return null; } };
  var theme = get("localStorage", "aa-theme") === "day" ? "day" : "night";
  d.setAttribute("data-theme", theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "day" ? "#E3E6E3" : "#0E1C22");
  // accueil : la scène 3D du bureau, sauf si on vise directement une fenêtre ou si on est déjà « dans le PC »
  if (d.getAttribute("data-page") === "home" && !location.hash && get("sessionStorage", "aa-inside") !== "1") {
    d.classList.add("is-stage");
  }
})();
