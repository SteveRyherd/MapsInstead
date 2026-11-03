/*
 * background.js (non-persistent background page, Manifest V3)
 *
 * Responsibilities:
 *   1. Keep the on/off setting and the redirect counter in browser.storage.local.
 *   2. Resolve short links (maps.app.goo.gl, goo.gl/maps, g.page) with fetch and
 *      convert the final URL. This is the only network request the extension makes.
 *   3. Act as the single decision point for page-load redirects so a tab is never
 *      redirected twice (webNavigation and the content script can both see a load).
 *
 * mapsConverter.js is loaded before this file and exposes `DetourMaps`.
 */
"use strict";

var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var DEFAULT_SETTINGS = { enabled: true, redirectCount: 0 };
var RECENT_TTL_MS = 4000;
var recentlyHandled = new Map(); // key "tabId|sourceURL" -> timestamp

function getSettings() {
  return browserAPI.storage.local.get(DEFAULT_SETTINGS).then(function (stored) {
    return Object.assign({}, DEFAULT_SETTINGS, stored || {});
  });
}

function isEnabled() {
  return getSettings().then(function (s) { return s.enabled !== false; });
}

function incrementCount() {
  return getSettings().then(function (s) {
    return browserAPI.storage.local.set({ redirectCount: (s.redirectCount || 0) + 1 });
  }).catch(function () {});
}

function pruneRecent() {
  var now = Date.now();
  recentlyHandled.forEach(function (time, key) {
    if (now - time > RECENT_TTL_MS) recentlyHandled.delete(key);
  });
}

function markHandled(tabId, sourceURL) {
  pruneRecent();
  recentlyHandled.set(tabId + "|" + sourceURL, Date.now());
}

function wasHandled(tabId, sourceURL) {
  pruneRecent();
  return recentlyHandled.has(tabId + "|" + sourceURL);
}

// Follow redirects and return the final URL. HEAD is cheaper; some hosts reject it, so fall back to GET.
function resolveShortLink(url) {
  function attempt(method) {
    return fetch(url, { method: method, redirect: "follow", credentials: "omit", cache: "no-store" })
      .then(function (response) {
        if (!response.url || response.url === url) throw new Error("no redirect");
        return response.url;
      });
  }
  return attempt("HEAD").catch(function () { return attempt("GET"); });
}

// Some short links answer mobile browsers with an "open in app" HTML page instead of a redirect.
// The real destination is still in there: a ?link= parameter, a meta refresh, or a URL in inline JSON.
function extractMapsURLFromHTML(html) {
  var re = /https?:\\?\/\\?\/(?:www\.)?google\.[a-z.]+\\?\/maps[^"'<>\s\\]*/gi;
  var m;
  while ((m = re.exec(html))) {
    var candidate = m[0].replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
    var result = DetourMaps.convert(candidate);
    if (result && result.kind !== "fallback") return candidate;
  }
  return null;
}

function mapsURLFromLinkParam(urlString) {
  try {
    var u = new URL(urlString);
    var link = u.searchParams.get("link") || u.searchParams.get("continue") || u.searchParams.get("url");
    return link && DetourMaps.classify(link) === "maps" ? link : null;
  } catch (e) { return null; }
}

// Resolve a short link and convert it. Resolves to an Apple Maps URL string or null.
function convertShortLink(url, fallbackText) {
  return resolveShortLink(url).catch(function () { return url; }).then(function (finalURL) {
    var direct = DetourMaps.classify(finalURL) === "maps" ? finalURL : mapsURLFromLinkParam(finalURL);
    if (direct) {
      var result = DetourMaps.convert(direct, { fallbackText: fallbackText });
      return result ? result.url : null;
    }
    // Still on a short-link host or an unknown page: read the body and look for the Maps URL.
    return fetch(finalURL, { method: "GET", redirect: "follow", credentials: "omit", cache: "no-store" })
      .then(function (response) { return response.text(); })
      .then(function (html) {
        var embedded = extractMapsURLFromHTML(html);
        if (!embedded) return null;
        var result = DetourMaps.convert(embedded, { fallbackText: fallbackText });
        return result ? result.url : null;
      });
  }).catch(function () { return null; });
}

// Fast path for short links typed, shared or tapped from other apps: redirect the tab
// before the page has even loaded. The content script still covers the final page.
if (browserAPI.webNavigation && browserAPI.webNavigation.onBeforeNavigate) {
  browserAPI.webNavigation.onBeforeNavigate.addListener(function (details) {
    if (details.frameId !== 0 || details.tabId < 0) return;
    var url = details.url;
    if (!DetourMaps.isShortLink(url)) return;
    isEnabled().then(function (enabled) {
      if (!enabled || wasHandled(details.tabId, url)) return;
      return convertShortLink(url).then(function (appleURL) {
        if (!appleURL || wasHandled(details.tabId, url)) return;
        markHandled(details.tabId, url);
        markHandled(details.tabId, appleURL);
        return browserAPI.tabs.update(details.tabId, { url: appleURL }).then(incrementCount);
      });
    }).catch(function () {});
  }, { url: [{ hostEquals: "maps.app.goo.gl" }, { hostEquals: "goo.gl" }, { hostEquals: "g.page" }] });
}

browserAPI.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || typeof message.type !== "string") return false;
  var tabId = sender && sender.tab ? sender.tab.id : -1;

  switch (message.type) {
    // Content script saw a Google Maps page load. Decide once per tab+URL.
    case "pageLoad": {
      isEnabled().then(function (enabled) {
        if (!enabled) return { handled: false };
        if (wasHandled(tabId, message.url)) return { handled: false, reason: "duplicate" };
        var result = DetourMaps.convert(message.url, { fallbackText: message.fallbackText });
        if (!result) return { handled: false };
        markHandled(tabId, message.url);
        incrementCount();
        return { handled: true, url: result.url, kind: result.kind };
      }).then(sendResponse, function () { sendResponse({ handled: false }); });
      return true;
    }

    // Content script intercepted a click on a short link and needs the final URL.
    case "resolveShortLink": {
      isEnabled().then(function (enabled) {
        if (!enabled) return { url: null };
        return convertShortLink(message.url, message.fallbackText).then(function (appleURL) {
          if (appleURL) { markHandled(tabId, message.url); incrementCount(); }
          return { url: appleURL };
        });
      }).then(sendResponse, function () { sendResponse({ url: null }); });
      return true;
    }

    // Content script redirected a click itself; just count it.
    case "redirected": {
      incrementCount().then(function () { sendResponse({ ok: true }); });
      return true;
    }

    case "getSettings": {
      getSettings().then(sendResponse, function () { sendResponse(DEFAULT_SETTINGS); });
      return true;
    }

    default:
      return false;
  }
});

// Make sure defaults exist so the popup never shows "undefined".
browserAPI.runtime.onInstalled.addListener(function () {
  getSettings().then(function (s) { return browserAPI.storage.local.set(s); }).catch(function () {});
});
