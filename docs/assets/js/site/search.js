(function () {
  var button = document.getElementById("search-btn");
  if (!button) return;
  function open() {
    var filter = document.getElementById("cat-filter");
    if (filter) {
      filter.focus();
      return;
    }
    location.href = button.getAttribute("data-search") + "#search";
  }
  button.addEventListener("click", open);
  document.addEventListener("keydown", function (e) {
    var active = document.activeElement;
    if (e.key !== "/" || (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)))
      return;
    e.preventDefault();
    open();
  });
})();
