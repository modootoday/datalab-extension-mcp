(function () {
  var input = document.getElementById("cat-filter");
  var grid = document.getElementById("cat-grid");
  if (!input || !grid) return;
  var empty = document.getElementById("cat-empty");
  function apply() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    grid.querySelectorAll("[data-text]").forEach(function (card) {
      var on = !q || card.getAttribute("data-text").indexOf(q) !== -1;
      card.hidden = !on;
      if (on) shown++;
    });
    empty.hidden = shown !== 0;
  }
  input.addEventListener("input", apply);
  if (location.hash === "#search") input.focus();
})();
