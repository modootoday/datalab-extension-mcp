(function () {
  function textOf(button) {
    var url = button.getAttribute("data-copy-url");
    if (url) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      });
    }
    return Promise.resolve(
      document.getElementById(button.getAttribute("data-copy")).textContent,
    );
  }
  function done(button, label) {
    var idle = button.getAttribute("data-label") || button.textContent;
    button.setAttribute("data-label", idle);
    button.setAttribute("data-done", "");
    button.textContent = label;
    setTimeout(function () {
      button.removeAttribute("data-done");
      button.textContent = idle;
    }, 1600);
  }
  function select(button) {
    var source = document.getElementById(
      button.getAttribute("data-copy") || "",
    );
    if (!source) return;
    var range = document.createRange();
    range.selectNodeContents(source);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    button.textContent = "선택했어요";
  }
  document.addEventListener("click", function (e) {
    var button = e.target.closest("[data-copy], [data-copy-url]");
    if (!button) return;
    textOf(button)
      .then(function (text) {
        return navigator.clipboard.writeText(text);
      })
      .then(
        function () {
          done(button, "복사했어요");
        },
        function () {
          select(button);
        },
      );
  });
})();
