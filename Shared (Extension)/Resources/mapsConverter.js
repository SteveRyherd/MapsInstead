/*
 * mapsConverter.js
 *
 * Pure URL conversion: Google Maps URL in, Apple Maps URL out.
 * No DOM, no browser APIs, no side effects. Loaded by the content script,
 * the background page and the Node test suite (tests/mapsConverter.test.js).
 *
 * Public API (exposed as `DetourMaps` in the browser, module.exports in Node):
 *
 *   classify(url)            -> "maps" | "short" | "skip" | null
 *   isGoogleMapsURL(url)     -> boolean  (true for "maps" and "short")
 *   isShortLink(url)         -> boolean
 *   convert(url, options)    -> { url, kind, ... } | null
 *   parse(url)               -> intermediate description (useful for tests)
 *   buildAppleMapsURL(parts) -> string
 *
 * `convert` returns null when the URL is not a Google Maps link at all. When it
 * is a Google Maps link but nothing useful can be extracted, it still returns
 * an Apple Maps URL (kind "fallback") so the user is never left on a page that
 * tries to open the Google Maps app or the App Store.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DetourMaps = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var APPLE_MAPS_BASE = "https://maps.apple.com/";

  // google.com, google.co.uk, google.com.au, google.de, google.cat ...
  var GOOGLE_HOST_RE = /(^|\.)google\.(com|[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/i;

  // Paths under /maps that have no Apple Maps equivalent. Leave them alone so
  // the regular Google web page loads.
  var SKIP_PATH_RE = /^\/maps\/(embed|d\/|contrib|reviews|timeline|about|vt|api|_\/|local\/)/i;

  var COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

  // Origins Google uses to mean "wherever the user is right now".
  var CURRENT_LOCATION_RE = /^(your|my|current)\s+(location|position)$/i;

  // Link text that carries no information about the destination.
  var GENERIC_TEXT_RE = /^(directions|get directions|map|maps|view map|view on map|view larger map|open in maps|open|website|call|share|save|more|route|navigate|go|see map|show map|show on map|view)$/i;

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      try {
        return unescape(value);
      } catch (e2) {
        return value;
      }
    }
  }

  function cleanText(value) {
    if (value == null) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  // Google path segments use "+" for spaces and percent-encoding for everything else.
  function decodeSegment(segment) {
    var text = cleanText(safeDecode(String(segment).replace(/\+/g, " ")));
    return text === "''" ? "" : text; // Google writes an empty stop as ''
  }

  function parseCoords(text) {
    if (!text) return null;
    var m = COORD_RE.exec(text);
    if (!m) return null;
    var lat = parseFloat(m[1]);
    var lng = parseFloat(m[2]);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: lat, lng: lng };
  }

  function formatCoords(c) {
    return c.lat + "," + c.lng;
  }

  function isCurrentLocation(text) {
    return !text || CURRENT_LOCATION_RE.test(text);
  }

  function isGenericText(text) {
    return !text || GENERIC_TEXT_RE.test(text);
  }

  // Google travel modes -> Apple dirflg (d = driving, w = walking, r = transit, c = cycling)
  function toDirflg(mode) {
    if (mode == null) return null;
    var m = String(mode).toLowerCase().trim();
    switch (m) {
      case "driving": case "drive": case "car": case "d": case "0": return "d";
      case "bicycling": case "bicycle": case "cycling": case "bike": case "b": case "c": case "1": return "c";
      case "walking": case "walk": case "w": case "2": return "w";
      case "transit": case "public transit": case "r": case "3": return "r";
      default: return null;
    }
  }

  function parseURL(urlString) {
    try {
      return new URL(String(urlString));
    } catch (e) {
      return null;
    }
  }

  function isGoogleHost(host) {
    return GOOGLE_HOST_RE.test(host);
  }

  function isShortHost(url) {
    var host = url.hostname.toLowerCase();
    var path = url.pathname;
    if (host === "maps.app.goo.gl") return true;
    if (host === "goo.gl" && /^\/maps\b/i.test(path)) return true;
    if (host === "g.page" && !/^\/r\//i.test(path)) return true;
    return false;
  }

  // "@LAT,LNG,15z" or "@LAT,LNG,1234m" path segment (viewport centre, not the pin).
  function parseViewportSegment(segment) {
    if (!segment || segment.charAt(0) !== "@") return null;
    var parts = segment.slice(1).split(",");
    var coords = parseCoords(parts[0] + "," + parts[1]);
    if (!coords) return null;
    var zoom = null;
    for (var i = 2; i < parts.length; i++) {
      var z = /^(\d+(?:\.\d+)?)z$/.exec(parts[i]);
      if (z) zoom = Math.round(parseFloat(z[1]));
    }
    return { coords: coords, zoom: zoom };
  }

  // The "data=" blob encodes the real pin as !3dLAT!4dLNG and travel mode as !3eN.
  function parseDataBlob(pathname) {
    var result = { pinCoords: null, waypointCoords: [], mode: null };
    var dataIndex = pathname.indexOf("data=");
    if (dataIndex === -1) return result;
    var blob = pathname.slice(dataIndex);
    var re3d4d = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g;
    var m;
    while ((m = re3d4d.exec(blob))) {
      var c = parseCoords(m[1] + "," + m[2]);
      if (c) result.pinCoords = c; // last match wins
    }
    var re1d2d = /!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/g;
    while ((m = re1d2d.exec(blob))) {
      var w = parseCoords(m[2] + "," + m[1]); // !1d is longitude, !2d is latitude
      if (w) result.waypointCoords.push(w);
    }
    var mode = /!3e(\d)/.exec(blob);
    if (mode) result.mode = toDirflg(mode[1]);
    return result;
  }

  // Split "/maps/dir/A/B/@.../data=..." into meaningful text segments.
  function pathSegmentsAfter(pathname, prefix) {
    var rest = pathname.slice(prefix.length);
    var raw = rest.split("/");
    var segments = [];
    var viewport = null;
    for (var i = 0; i < raw.length; i++) {
      var s = raw[i];
      if (s.charAt(0) === "@") { viewport = parseViewportSegment(s); break; }
      if (/^(data=|am=|dirflg=)/i.test(s)) break;
      segments.push(decodeSegment(s));
    }
    // Drop trailing empties but keep a leading empty (it means "current location").
    while (segments.length > 1 && segments[segments.length - 1] === "") segments.pop();
    return { segments: segments, viewport: viewport };
  }

  // "Name@lat,lng", "loc:lat,lng", "lat,lng (Name)" and plain coordinates.
  function parseQueryValue(value) {
    var text = cleanText(value);
    if (!text) return null;
    var m;
    if ((m = /^loc:\s*(.+)$/i.exec(text))) text = m[1];
    var coords = parseCoords(text);
    if (coords) return { coords: coords, text: "" };
    if ((m = /^(.*?)@\s*(-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?)\s*$/.exec(text))) {
      var c1 = parseCoords(m[2]);
      if (c1) return { coords: c1, text: cleanText(m[1]) };
    }
    if ((m = /^(-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?)\s*\((.+)\)\s*$/.exec(text))) {
      var c2 = parseCoords(m[1]);
      if (c2) return { coords: c2, text: cleanText(m[2]) };
    }
    if (/^place_id:/i.test(text)) return null;
    return { coords: null, text: text };
  }

  // ---------------------------------------------------------------------------
  // Unwrapping: redirect wrappers, consent pages, app schemes
  // ---------------------------------------------------------------------------

  // Returns a normalised https URL object for anything we know how to read,
  // or null when the input is not a Google Maps link.
  function unwrap(urlString, depth) {
    depth = depth || 0;
    if (depth > 3) return null;
    var raw = cleanText(urlString);
    if (!raw) return null;

    // comgooglemaps://?daddr=...&saddr=...&directionsmode=walking
    var scheme = /^(comgooglemaps(?:-x-callback)?):\/\/(.*)$/i.exec(raw);
    if (scheme) {
      var tail = scheme[2];
      if (tail.charAt(0) === "?") tail = "/maps" + tail;
      else if (tail.charAt(0) !== "/") tail = "/maps?" + tail;
      return parseURL("https://www.google.com" + tail);
    }

    // geo:LAT,LNG?q=... (Android style, occasionally shared)
    var geo = /^geo:([^?]*)(\?.*)?$/i.exec(raw);
    if (geo) {
      var geoURL = parseURL("https://www.google.com/maps/" + (geo[2] || ""));
      if (!geoURL) return null;
      var geoCoords = parseCoords(geo[1]);
      if (geoCoords && !geoURL.searchParams.has("ll")) {
        geoURL.searchParams.set("ll", formatCoords(geoCoords));
      }
      return geoURL;
    }

    if (/^\/\//.test(raw)) raw = "https:" + raw;
    if (/^\//.test(raw)) raw = "https://www.google.com" + raw; // relative links on google.com
    var url = parseURL(raw);
    if (!url) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    var host = url.hostname.toLowerCase();

    // google.com/url?q=<real link>  (search result redirect wrapper)
    if (isGoogleHost(host) && /^\/url\/?$/.test(url.pathname)) {
      var target = url.searchParams.get("q") || url.searchParams.get("url");
      return target ? unwrap(target, depth + 1) : null;
    }

    // consent.google.com/m?continue=<real link>  (EU cookie consent interstitial)
    if (/^consent\.google\./.test(host)) {
      var cont = url.searchParams.get("continue");
      return cont ? unwrap(cont, depth + 1) : null;
    }

    return url;
  }

  // ---------------------------------------------------------------------------
  // Classification
  // ---------------------------------------------------------------------------

  function classify(urlString) {
    var url = unwrap(urlString);
    if (!url) return null;
    var host = url.hostname.toLowerCase();
    if (isShortHost(url)) return "short";
    if (!isGoogleHost(host)) return null;
    var path = url.pathname;
    var isMapsHost = /^maps\./.test(host);
    var isMapsPath = /^\/maps(\/|$|\?)/i.test(path);
    if (!isMapsHost && !isMapsPath) return null;
    if (SKIP_PATH_RE.test(path)) return "skip";
    return "maps";
  }

  function isGoogleMapsURL(urlString) {
    var c = classify(urlString);
    return c === "maps" || c === "short";
  }

  function isShortLink(urlString) {
    return classify(urlString) === "short";
  }

  // ---------------------------------------------------------------------------
  // Parsing into an intermediate description
  // ---------------------------------------------------------------------------
  //
  // {
  //   kind: "directions" | "place" | "search" | "coords" | "fallback",
  //   query, queryCoords, pinExact, viewport: {coords, zoom},
  //   origin, destination, originCoords, destinationCoords, dirflg,
  //   zoom
  // }

  function parse(urlString) {
    var url = unwrap(urlString);
    if (!url) return null;
    var cls = classify(url.href);
    if (cls !== "maps") return null;

    var path = url.pathname;
    var qs = url.searchParams;
    var data = parseDataBlob(path);
    var result = { kind: "fallback", viewport: null, zoom: null };

    var m;
    // Viewport "@lat,lng,zoom" anywhere in the path (bare map views, places, searches).
    var atIndex = path.indexOf("/@");
    if (atIndex !== -1) {
      var seg = path.slice(atIndex + 1).split("/")[0];
      result.viewport = parseViewportSegment(seg);
    }

    var zoomParam = parseInt(qs.get("z") || qs.get("zoom") || "", 10);
    if (!isNaN(zoomParam)) result.zoom = zoomParam;
    else if (result.viewport && result.viewport.zoom != null) result.zoom = result.viewport.zoom;

    // ---- Directions -------------------------------------------------------
    var dirPathMatch = /^\/maps\/dir(\/|$)/i.exec(path);
    var hasDirParams = qs.has("daddr") || qs.has("destination") || qs.has("saddr") || qs.has("origin");

    if (dirPathMatch || hasDirParams) {
      result.kind = "directions";
      var origin = "", destination = "";

      if (dirPathMatch && dirPathMatch[1] === "/") {
        var segs = pathSegmentsAfter(path, "/maps/dir/").segments;
        if (segs.length === 1) {
          destination = segs[0];
        } else if (segs.length >= 2) {
          origin = segs[0];
          destination = segs[segs.length - 1]; // intermediate stops are dropped
        }
      }

      // Query parameters win over the path when both are present (api=1 style).
      var qDest = qs.get("destination") || qs.get("daddr");
      var qOrigin = qs.get("origin") || qs.get("saddr");
      if (qDest) destination = cleanText(qDest);
      if (qOrigin) origin = cleanText(qOrigin);

      var originParsed = parseQueryValue(origin) || { coords: null, text: "" };
      var destParsed = parseQueryValue(destination) || { coords: null, text: "" };

      result.origin = isCurrentLocation(originParsed.text) && !originParsed.coords ? "" : originParsed.text;
      result.originCoords = originParsed.coords;
      result.destination = destParsed.text;
      result.destinationCoords = destParsed.coords;

      if (!result.destinationCoords) {
        // The data blob carries the exact pin for each stop; the last one is the destination.
        if (data.waypointCoords.length) result.destinationCoords = data.waypointCoords[data.waypointCoords.length - 1];
        else if (data.pinCoords) result.destinationCoords = data.pinCoords;
      }

      result.dirflg = toDirflg(qs.get("travelmode")) || toDirflg(qs.get("dirflg")) ||
        toDirflg(qs.get("directionsmode")) || data.mode || null;

      if (!result.destination && !result.destinationCoords) {
        // A directions link with no destination at all: fall through to a search
        // on whatever else the URL carries, otherwise open Maps so the user can type.
        result.kind = "fallback";
      } else {
        return result;
      }
    }

    // ---- Place ------------------------------------------------------------
    if ((m = /^\/maps\/place\/([^/]*)/i.exec(path))) {
      var placeName = decodeSegment(m[1]);
      var placeParsed = parseQueryValue(placeName);
      // "/maps/place/?q=place_id:..." or "/maps/place/?q=Name"
      if (!placeName && qs.get("q")) placeParsed = parseQueryValue(qs.get("q"));
      if (placeParsed) {
        result.kind = placeParsed.coords && !placeParsed.text ? "coords" : "place";
        result.query = placeParsed.text;
        result.queryCoords = placeParsed.coords || data.pinCoords;
        result.pinExact = !!(placeParsed.coords || data.pinCoords);
        if (!result.queryCoords && result.viewport) result.queryCoords = result.viewport.coords;
        return result;
      }
    }

    // ---- Search -----------------------------------------------------------
    if ((m = /^\/maps\/search\/([^/]*)/i.exec(path))) {
      var searchText = decodeSegment(m[1]);
      var searchParsed = parseQueryValue(searchText) || parseQueryValue(qs.get("query")) || parseQueryValue(qs.get("q"));
      if (searchParsed) {
        result.kind = searchParsed.coords && !searchParsed.text ? "coords" : "search";
        result.query = searchParsed.text;
        result.queryCoords = searchParsed.coords;
        result.pinExact = !!searchParsed.coords;
        if (!result.queryCoords && result.viewport) result.queryCoords = result.viewport.coords;
        return result;
      }
    }

    // ---- Query parameters on any maps URL ----------------------------------
    var qParsed = parseQueryValue(qs.get("q")) || parseQueryValue(qs.get("query")) || parseQueryValue(qs.get("near"));
    var llParsed = parseCoords(qs.get("ll")) || parseCoords(qs.get("sll")) || parseCoords(qs.get("center"));

    if (qParsed) {
      result.kind = qParsed.coords && !qParsed.text ? "coords" : "search";
      result.query = qParsed.text;
      result.queryCoords = qParsed.coords || llParsed || data.pinCoords || (result.viewport && result.viewport.coords) || null;
      result.pinExact = !!(qParsed.coords || llParsed);
      return result;
    }

    if (llParsed || data.pinCoords) {
      result.kind = "coords";
      result.queryCoords = llParsed || data.pinCoords;
      result.pinExact = true;
      return result;
    }

    if (result.viewport) {
      result.kind = "coords";
      result.queryCoords = result.viewport.coords;
      result.pinExact = false;
      return result;
    }

    return result; // fallback
  }

  // ---------------------------------------------------------------------------
  // Building the Apple Maps URL
  // ---------------------------------------------------------------------------

  // Keep commas readable in coordinates; spaces become "+", which Apple accepts.
  function encodeParam(value) {
    return encodeURIComponent(String(value)).replace(/%2C/gi, ",").replace(/%20/g, "+");
  }

  function buildAppleMapsURL(params) {
    var pairs = [];
    var order = ["q", "ll", "sll", "z", "saddr", "daddr", "dirflg", "near"];
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      var value = params[key];
      if (value === undefined || value === null || value === "") continue;
      pairs.push(key + "=" + encodeParam(value));
    }
    return pairs.length ? APPLE_MAPS_BASE + "?" + pairs.join("&") : APPLE_MAPS_BASE;
  }

  function describeLocation(text, coords) {
    if (text && coords) return text; // Apple geocodes the text; see "ll"/"near" below
    if (text) return text;
    if (coords) return formatCoords(coords);
    return "";
  }

  // options.fallbackText: link text or nearby heading to use when the URL itself is empty.
  function convert(urlString, options) {
    options = options || {};
    var cls = classify(urlString);
    if (cls !== "maps") return null; // "short" must be resolved first; "skip" is left alone

    var parsed = parse(urlString);
    var fallbackText = isGenericText(cleanText(options.fallbackText)) ? "" : cleanText(options.fallbackText);
    var params = {};
    var kind = parsed ? parsed.kind : "fallback";

    if (kind === "directions") {
      var daddr = parsed.destination || (parsed.destinationCoords ? formatCoords(parsed.destinationCoords) : "");
      var saddr = parsed.origin || (parsed.originCoords ? formatCoords(parsed.originCoords) : "");
      params.daddr = daddr;
      if (saddr) params.saddr = saddr;
      if (parsed.dirflg) params.dirflg = parsed.dirflg;
      // When the destination is a name and we know the exact pin, bias the lookup to it.
      if (parsed.destination && parsed.destinationCoords) params.sll = formatCoords(parsed.destinationCoords);
    } else if (kind === "place") {
      params.q = parsed.query;
      if (parsed.queryCoords) {
        if (parsed.pinExact) params.ll = formatCoords(parsed.queryCoords);
        else params.sll = formatCoords(parsed.queryCoords);
      }
    } else if (kind === "search") {
      params.q = parsed.query;
      if (parsed.queryCoords) params.sll = formatCoords(parsed.queryCoords);
      if (parsed.zoom != null) params.z = parsed.zoom;
    } else if (kind === "coords") {
      var c = formatCoords(parsed.queryCoords);
      params.ll = c;
      params.q = c; // drops a pin instead of just centring the map
      if (parsed.zoom != null) params.z = parsed.zoom;
    } else {
      kind = "fallback";
      if (fallbackText) params.q = fallbackText;
    }

    return {
      url: buildAppleMapsURL(params),
      kind: kind,
      params: params,
      source: urlString
    };
  }

  return {
    classify: classify,
    isGoogleMapsURL: isGoogleMapsURL,
    isShortLink: isShortLink,
    unwrap: function (u) { var x = unwrap(u); return x ? x.href : null; },
    parse: parse,
    convert: convert,
    buildAppleMapsURL: buildAppleMapsURL,
    toDirflg: toDirflg,
    APPLE_MAPS_BASE: APPLE_MAPS_BASE,
    _internal: {
      safeDecode: safeDecode,
      decodeSegment: decodeSegment,
      parseCoords: parseCoords,
      parseDataBlob: parseDataBlob,
      parseViewportSegment: parseViewportSegment,
      parseQueryValue: parseQueryValue,
      pathSegmentsAfter: pathSegmentsAfter,
      isGoogleHost: isGoogleHost,
      isShortHost: isShortHost,
      isGenericText: isGenericText,
      isCurrentLocation: isCurrentLocation,
      describeLocation: describeLocation
    }
  };
});
