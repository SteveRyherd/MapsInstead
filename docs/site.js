// Small helpers for the docs site: show real images when they exist, placeholders when they do not,
// and remember the chosen platform tab.
(function () {
  "use strict";

  // Screenshot slots: <div class="shot" data-src="..."><img><span class="placeholder">...</span></div>
  document.querySelectorAll(".shot[data-src]").forEach(function (slot) {
    var img = slot.querySelector("img");
    img.addEventListener("error", function () { slot.classList.add("missing"); });
    img.addEventListener("load", function () { slot.classList.remove("missing"); });
    img.src = slot.getAttribute("data-src");
  });

  // Hero: prefer the video, fall back to the image, then to the placeholder note.
  var video = document.getElementById("hero-video");
  var image = document.getElementById("hero-image");
  var note = document.getElementById("hero-placeholder");
  if (video && image && note) {
    var probe = new Image();
    probe.onload = function () { image.hidden = false; note.hidden = true; };
    probe.src = image.getAttribute("src");
    video.addEventListener("loadeddata", function () { video.hidden = false; image.hidden = true; note.hidden = true; });
    video.addEventListener("error", function () {}, true);
    video.load();
  }

  // Platform tabs on the setup page.
  var tabs = document.querySelectorAll(".platform-tabs button");
  if (tabs.length) {
    function select(name) {
      tabs.forEach(function (b) { b.setAttribute("aria-selected", b.dataset.platform === name ? "true" : "false"); });
      document.querySelectorAll("[data-platform-panel]").forEach(function (p) { p.hidden = p.dataset.platformPanel !== name; });
      try { localStorage.setItem("mapsinstead-platform", name); } catch (e) {}
    }
    tabs.forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.platform); }); });
    var initial = "ios";
    try { initial = localStorage.getItem("mapsinstead-platform") || initial; } catch (e) {}
    if (/Macintosh/.test(navigator.userAgent) && !("ontouchend" in document)) initial = localStorage.getItem("mapsinstead-platform") || "mac";
    select(initial);
  }
})();
