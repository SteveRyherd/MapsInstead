/*
 * content.js (runs at document_start on Google and Google short-link domains, top frame only)
 *
 * Two jobs:
 *   1. If this page itself is a Google Maps URL (the user tapped a shared link, a
 *      search-result button navigated here, or a short link redirected here), send
 *      the user to Apple Maps before Google's "open in app" interstitial can run.
 *   2. On every other Google page (search results above all), intercept clicks on
 *      Google Maps links in the capture phase, so the redirect happens before
 *      Google's own click handlers, and works for links inserted after page load.
 *
 * mapsConverter.js is loaded before this file and exposes `DetourMaps`.
 */
(function () {
  "use strict";

  var browserAPI = typeof browser !== "undefined" ? browser : chrome;
  var enabled = true; // optimistic until storage answers; storage answers in a few ms
  var MESSAGE_TIMEOUT_MS = 1500;

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  function loadEnabled() {
    return browserAPI.storage.local.get({ enabled: true }).then(function (s) {
      enabled = s.enabled !== false;
      return enabled;
    }).catch(function () { return enabled; });
  }

  if (browserAPI.storage && browserAPI.storage.onChanged) {
    browserAPI.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local" || !changes.enabled) return;
      enabled = changes.enabled.newValue !== false;
      if (!enabled) restoreRewrittenAnchors();
    });
  }

  function sendMessage(message) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, MESSAGE_TIMEOUT_MS);
      try {
        Promise.resolve(browserAPI.runtime.sendMessage(message)).then(function (response) {
          if (!done) { done = true; clearTimeout(timer); resolve(response || null); }
        }, function () {
          if (!done) { done = true; clearTimeout(timer); resolve(null); }
        });
      } catch (e) {
        if (!done) { done = true; clearTimeout(timer); resolve(null); }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  function navigate(appleURL, openInNewTab) {
    if (openInNewTab) {
      var w = window.open(appleURL, "_blank", "noopener");
      if (w) return;
    }
    window.location.assign(appleURL);
  }

  // Text near a link that might name the place: aria-label, title, link text, or a heading in the card.
  function contextText(element) {
    if (!element) return "";
    var candidates = [element.getAttribute("aria-label"), element.getAttribute("title"), element.textContent];
    var node = element;
    for (var depth = 0; node && depth < 5; depth++) {
      var heading = node.querySelector ? node.querySelector('[role="heading"], h1, h2, h3') : null;
      if (heading) candidates.push(heading.textContent);
      node = node.parentElement;
    }
    for (var i = 0; i < candidates.length; i++) {
      var text = (candidates[i] || "").replace(/\s+/g, " ").trim();
      if (text && text.length <= 120 && !DetourMaps._internal.isGenericText(text)) return text;
    }
    return "";
  }

  // ---------------------------------------------------------------------------
  // Job 1: this page is a Google Maps URL
  // ---------------------------------------------------------------------------

  function handlePageLoad() {
    var here = window.location.href;
    var cls = DetourMaps.classify(here);
    if (cls !== "maps" && cls !== "short") return;

    loadEnabled().then(function (on) {
      if (!on) return;
      if (cls === "short") {
        // Normally the background page already redirected the tab via webNavigation.
        // If not (for example the event was missed), ask it to resolve now.
        return sendMessage({ type: "resolveShortLink", url: here }).then(function (response) {
          if (response && response.url) { window.stop(); window.location.replace(response.url); return; }
          whenDOMReady(redirectFromInterstitial);
        });
      }
      return sendMessage({ type: "pageLoad", url: here, fallbackText: document.title }).then(function (response) {
        if (response && response.handled && response.url) {
          window.stop();
          window.location.replace(response.url);
        } else if (response === null) {
          // Background did not answer in time: convert locally so the user is never stuck.
          var local = DetourMaps.convert(here);
          if (local) { window.stop(); window.location.replace(local.url); }
        }
      });
    });
  }

  function whenDOMReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  // Google's short-link "open in app" page still contains the real Maps link somewhere:
  // a meta refresh, a canonical link, an anchor, or a URL inside inline JSON.
  function redirectFromInterstitial() {
    var candidates = [];
    var meta = document.querySelector('meta[http-equiv="refresh" i]');
    if (meta) {
      var m = /url=(.+)$/i.exec(meta.getAttribute("content") || "");
      if (m) candidates.push(m[1].replace(/^['"]|['"]$/g, ""));
    }
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) candidates.push(canonical.href);
    var anchors = document.querySelectorAll('a[href*="google."]');
    for (var i = 0; i < anchors.length; i++) candidates.push(anchors[i].href);
    var html = document.documentElement ? document.documentElement.innerHTML : "";
    var re = /https?:\\?\/\\?\/(?:www\.)?google\.[a-z.]+\\?\/maps[^"'<>\s\\]*/gi;
    var found;
    while ((found = re.exec(html)) && candidates.length < 50) {
      candidates.push(found[0].replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&"));
    }
    for (var j = 0; j < candidates.length; j++) {
      var result = DetourMaps.convert(candidates[j]);
      if (result && result.kind !== "fallback") {
        sendMessage({ type: "redirected" });
        window.location.replace(result.url);
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Job 2: intercept clicks on Google Maps links anywhere on Google pages
  // ---------------------------------------------------------------------------

  function linkTargetFromEvent(event) {
    var node = event.target;
    if (node && node.nodeType === 3) node = node.parentElement; // text node
    if (!node || !node.closest) return null;

    var anchor = node.closest("a[href]");
    if (anchor) {
      var href = anchor.getAttribute("href") || "";
      if (href && href !== "#" && !/^javascript:/i.test(href)) {
        return { url: anchor.href || href, element: anchor };
      }
    }
    // Google's "Directions" buttons are sometimes plain elements with data-url.
    var dataHolder = node.closest("[data-url], [data-href]");
    if (dataHolder) {
      var dataURL = dataHolder.getAttribute("data-url") || dataHolder.getAttribute("data-href");
      if (dataURL) return { url: dataURL, element: dataHolder };
    }
    return null;
  }

  function onClickCapture(event, forceNewTab) {
    if (!enabled) return;
    if (event.type === "click" && event.button !== 0) return; // right clicks: leave alone
    var target = linkTargetFromEvent(event);
    if (!target) return;

    // An href this script already rewrote: let the click proceed, just count it.
    if (target.element.dataset && target.element.dataset.detourRewritten) {
      sendMessage({ type: "redirected" });
      return;
    }

    var cls = DetourMaps.classify(target.url);
    if (cls !== "maps" && cls !== "short") return;

    var fallbackText = contextText(target.element);
    var newTab = !!forceNewTab || event.metaKey || event.ctrlKey || event.shiftKey ||
      (target.element.getAttribute && target.element.getAttribute("target") === "_blank");

    event.preventDefault();
    event.stopImmediatePropagation();

    if (cls === "maps") {
      var result = DetourMaps.convert(target.url, { fallbackText: fallbackText });
      if (!result) return;
      sendMessage({ type: "redirected" });
      navigate(result.url, newTab);
      return;
    }

    // Short link: resolve in the background, then go. If that fails, follow the original link.
    sendMessage({ type: "resolveShortLink", url: target.url, fallbackText: fallbackText }).then(function (response) {
      navigate(response && response.url ? response.url : target.url, newTab);
    });
  }

  // Some Google surfaces navigate on pointerup/touchend via their own handlers before "click".
  // Catching "click" in the capture phase on document is earliest for real links; also
  // watch "auxclick" so middle-clicks on Maps links open Apple Maps in a new tab.
  document.addEventListener("click", onClickCapture, true);
  document.addEventListener("auxclick", function (event) {
    if (event.button === 1) onClickCapture(event, true);
  }, true);

  // Keep rewriting href targets that Google adds after load (local cards, carousels) so
  // long-press / "Open in New Tab" context menus also land on Apple Maps. Clicks are
  // already covered by the capture listener above; this is a belt-and-braces layer.
  function rewriteAnchor(anchor) {
    if (!enabled || anchor.dataset.detourRewritten) return;
    var href = anchor.getAttribute("href");
    if (!href || DetourMaps.classify(href) !== "maps") return;
    var result = DetourMaps.convert(href, { fallbackText: contextText(anchor) });
    if (!result) return;
    anchor.dataset.detourRewritten = "1";
    anchor.dataset.detourOriginal = href;
    anchor.setAttribute("href", result.url);
    anchor.removeAttribute("ping");
  }

  function restoreRewrittenAnchors() {
    var anchors = document.querySelectorAll("a[data-detour-rewritten]");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (a.dataset.detourOriginal) a.setAttribute("href", a.dataset.detourOriginal);
      delete a.dataset.detourRewritten;
      delete a.dataset.detourOriginal;
    }
  }

  function scanAnchors(root) {
    if (!root || !root.querySelectorAll) return;
    var anchors = root.querySelectorAll('a[href*="/maps"], a[href^="comgooglemaps"], a[href^="geo:"]');
    for (var i = 0; i < anchors.length; i++) rewriteAnchor(anchors[i]);
  }

  function startObserver() {
    if (!document.documentElement) return;
    var pending = false;
    var observer = new MutationObserver(function (mutations) {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType !== 1) continue;
            if (n.tagName === "A") rewriteAnchor(n); else scanAnchors(n);
          }
        }
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { scanAnchors(document); }, { once: true });
    } else {
      scanAnchors(document);
    }
  }

  // Only rewrite hrefs on ordinary Google pages. On a Maps page we are leaving anyway,
  // and rewriting Google Maps' own in-app links would break its UI if the user disabled us.
  var isMapsPage = DetourMaps.classify(window.location.href) === "maps";

  handlePageLoad();
  if (!isMapsPage) {
    loadEnabled().then(startObserver);
  }
})();
