(function () {
  var button = document.getElementById("theme-btn");
  if (!button) return;
  button.addEventListener("click", function () {
    var root = document.documentElement;
    var current = root.getAttribute("data-theme");
    var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (current) dark = current === "dark";
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("mt-theme", next);
    } catch (e) {}
  });
})();
