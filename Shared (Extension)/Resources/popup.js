/*
 * popup.js: the toolbar popup. On/off toggle, redirect counter, and a shortcut to
 * open the current tab in Apple Maps if it is a Google Maps page.
 * All state is browser.storage.local on this device only.
 */
(function () {
  "use strict";

  var browserAPI = typeof browser !== "undefined" ? browser : chrome;

  // Public URLs for the footer. Keep in sync with Config/Branding.xcconfig.
  var PRIVACY_URL = "https://mapsinstead.com/privacy.html";
  var SUPPORT_URL = "https://mapsinstead.com/support.html";

  var enabledInput = document.getElementById("enabled");
  var statusText = document.getElementById("status");
  var countText = document.getElementById("count");
  var resetButton = document.getElementById("reset");
  var openCurrent = document.getElementById("open-current");

  function t(key, fallback) {
    try {
      var msg = browserAPI.i18n.getMessage(key);
      return msg || fallback;
    } catch (e) { return fallback; }
  }

  // Localise every element carrying data-i18n.
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-i18n"), el.textContent);
  });
  document.title = t("extension_name", document.title);
  document.getElementById("privacy-link").href = PRIVACY_URL;
  document.getElementById("support-link").href = SUPPORT_URL;

  function render(settings) {
    var on = settings.enabled !== false;
    enabledInput.checked = on;
    statusText.textContent = on ? t("popup_status_on", "On.") : t("popup_status_off", "Paused.");
    countText.textContent = String(settings.redirectCount || 0);
  }

  function load() {
    return browserAPI.storage.local.get({ enabled: true, redirectCount: 0 }).then(render);
  }

  enabledInput.addEventListener("change", function () {
    browserAPI.storage.local.set({ enabled: enabledInput.checked }).then(load);
  });

  resetButton.addEventListener("click", function () {
    browserAPI.storage.local.set({ redirectCount: 0 }).then(load);
  });

  browserAPI.storage.onChanged.addListener(function (changes, area) {
    if (area === "local") load();
  });

  // Offer a manual escape hatch when the current tab is a Google Maps page.
  function checkCurrentTab() {
    if (!browserAPI.tabs || !browserAPI.tabs.query) return;
    browserAPI.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab || !tab.url) return;
      var cls = DetourMaps.classify(tab.url);
      if (cls !== "maps" && cls !== "short") return;
      openCurrent.classList.remove("hidden");
      openCurrent.onclick = function () {
        openCurrent.disabled = true;
        if (cls === "short") {
          browserAPI.runtime.sendMessage({ type: "resolveShortLink", url: tab.url }).then(function (response) {
            if (response && response.url) browserAPI.tabs.update(tab.id, { url: response.url });
            window.close();
          });
          return;
        }
        var result = DetourMaps.convert(tab.url, { fallbackText: tab.title });
        if (result) {
          browserAPI.runtime.sendMessage({ type: "redirected" });
          browserAPI.tabs.update(tab.id, { url: result.url });
        }
        window.close();
      };
    }).catch(function () {});
  }

  load().then(checkCurrentTab);
})();
