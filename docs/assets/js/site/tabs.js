(function () {
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(
      list.querySelectorAll('[role="tab"]'),
    );
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    }
    list.addEventListener("click", function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab) select(tab);
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var step = e.key === "ArrowRight" ? 1 : tabs.length - 1;
      var next =
        tabs[(tabs.indexOf(document.activeElement) + step) % tabs.length];
      select(next);
      next.focus();
      e.preventDefault();
    });
  });
})();
