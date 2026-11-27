(function () {
  // Card links point at a question; open it instead of landing on a closed row.
  function open() {
    var id = decodeURIComponent(location.hash.slice(1));
    var heading = id && document.getElementById(id);
    var trigger =
      heading &&
      heading.querySelector('.mt-accordion-trigger[aria-expanded="false"]');
    if (trigger) trigger.click();
  }
  addEventListener("load", open);
  addEventListener("hashchange", open);
})();
