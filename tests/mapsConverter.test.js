/*
 * Run with:  node tests/mapsConverter.test.js
 * Plain Node asserts, no dependencies. Every URL below is a real-world format.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const resources = path.join(__dirname, "..", "Shared (Extension)", "Resources");
const Maps = require(path.join(resources, "mapsConverter.js"));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (err) { failures.push({ name, err }); }
}

// Decode an Apple Maps URL into a plain object for readable assertions.
function appleParams(url) {
  assert.ok(url.startsWith("https://maps.apple.com/"), "not an Apple Maps URL: " + url);
  const out = {};
  const q = url.split("?")[1] || "";
  for (const pair of q.split("&").filter(Boolean)) {
    const [k, v] = pair.split("=");
    out[k] = decodeURIComponent(v.replace(/\+/g, " "));
  }
  return out;
}
function conv(url, options) {
  const result = Maps.convert(url, options);
  assert.ok(result, "expected a conversion for " + url);
  return { kind: result.kind, p: appleParams(result.url), url: result.url };
}

// ---------------------------------------------------------------------------
// Directions (the competitive requirement, so tested most heavily)
// ---------------------------------------------------------------------------

test("dir: Directions button from search results, empty origin = current location", () => {
  const r = conv("https://www.google.com/maps/dir//Apple+Park,+Cupertino,+CA/");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.daddr, "Apple Park, Cupertino, CA");
  assert.equal(r.p.saddr, undefined);
});

test("dir: origin and destination with viewport and driving mode in data blob", () => {
  const r = conv("https://www.google.com/maps/dir/San+Francisco,+CA/Los+Angeles,+CA/@35.5,-120.6,7z/data=!3m1!4b1!4m13!4m12!1m5!1m1!1s0x80859a6d00690021:0x4a501367f076adff!2m2!1d-122.4194155!2d37.7749295!1m5!1m1!1s0x80c2c75ddc27da13:0xe22fdf6f254608f4!2m2!1d-118.2436849!2d34.0522342!3e0");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.saddr, "San Francisco, CA");
  assert.equal(r.p.daddr, "Los Angeles, CA");
  assert.equal(r.p.dirflg, "d");
});

test("dir: walking mode (!3e2) is kept", () => {
  const r = conv("https://www.google.com/maps/dir//Golden+Gate+Bridge/@37.8,-122.47,15z/data=!4m2!4m1!3e2");
  assert.equal(r.p.dirflg, "w");
  assert.equal(r.p.daddr, "Golden Gate Bridge");
});

test("dir: transit mode (!3e3) is kept", () => {
  const r = conv("https://www.google.com/maps/dir/Union+Square,+San+Francisco/Ferry+Building,+San+Francisco/data=!4m2!4m1!3e3");
  assert.equal(r.p.dirflg, "r");
  assert.equal(r.p.saddr, "Union Square, San Francisco");
  assert.equal(r.p.daddr, "Ferry Building, San Francisco");
});

test("dir: cycling mode (!3e1) maps to Apple dirflg=c", () => {
  const r = conv("https://www.google.com/maps/dir//Ocean+Beach/data=!4m2!4m1!3e1");
  assert.equal(r.p.dirflg, "c");
});

test("dir: api=1 destination + origin + travelmode", () => {
  const r = conv("https://www.google.com/maps/dir/?api=1&origin=Space+Needle,+Seattle&destination=Pike+Place+Market&travelmode=walking");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.saddr, "Space Needle, Seattle");
  assert.equal(r.p.daddr, "Pike Place Market");
  assert.equal(r.p.dirflg, "w");
});

test("dir: api=1 destination only, transit", () => {
  const r = conv("https://www.google.com/maps/dir/?api=1&destination=Grand+Central+Terminal&travelmode=transit");
  assert.equal(r.p.daddr, "Grand Central Terminal");
  assert.equal(r.p.saddr, undefined);
  assert.equal(r.p.dirflg, "r");
});

test("dir: api=1 with waypoints keeps origin and final destination", () => {
  const r = conv("https://www.google.com/maps/dir/?api=1&origin=Boston&destination=New+York&waypoints=Providence|Hartford&travelmode=driving");
  assert.equal(r.p.saddr, "Boston");
  assert.equal(r.p.daddr, "New York");
  assert.equal(r.p.dirflg, "d");
});

test("dir: api=1 coordinates as destination", () => {
  const r = conv("https://www.google.com/maps/dir/?api=1&destination=47.5951518,-122.3316393");
  assert.equal(r.p.daddr, "47.5951518,-122.3316393");
});

test("dir: multi-stop path keeps first and last", () => {
  const r = conv("https://www.google.com/maps/dir/Denver,+CO/Boulder,+CO/Fort+Collins,+CO/");
  assert.equal(r.p.saddr, "Denver, CO");
  assert.equal(r.p.daddr, "Fort Collins, CO");
});

test("dir: coordinate pairs in path", () => {
  const r = conv("https://www.google.com/maps/dir/40.7484405,-73.9856644/40.6892494,-74.0445004/");
  assert.equal(r.p.saddr, "40.7484405,-73.9856644");
  assert.equal(r.p.daddr, "40.6892494,-74.0445004");
});

test("dir: old-style maps?saddr=&daddr=&dirflg=w", () => {
  const r = conv("https://maps.google.com/maps?saddr=Current+Location&daddr=Fenway+Park&dirflg=w");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.saddr, undefined, "Current Location origin is dropped");
  assert.equal(r.p.daddr, "Fenway Park");
  assert.equal(r.p.dirflg, "w");
});

test("dir: old-style dirflg=r transit and dirflg=b bicycling", () => {
  assert.equal(conv("https://maps.google.com/?daddr=Wrigley+Field&dirflg=r").p.dirflg, "r");
  assert.equal(conv("https://maps.google.com/?daddr=Wrigley+Field&dirflg=b").p.dirflg, "c");
});

test("dir: 'Your location' origin is treated as current location", () => {
  const r = conv("https://www.google.com/maps/dir/Your+location/Central+Park/");
  assert.equal(r.p.saddr, undefined);
  assert.equal(r.p.daddr, "Central Park");
});

test("dir: single segment is the destination", () => {
  const r = conv("https://www.google.com/maps/dir/Yosemite+National+Park");
  assert.equal(r.p.daddr, "Yosemite National Park");
});

test("dir: destination with exact pin gets sll bias", () => {
  const r = conv("https://www.google.com/maps/dir//Blue+Bottle+Coffee,+66+Mint+St,+San+Francisco/data=!4m8!4m7!1m0!1m5!1m1!1s0x8085808a5bb19d6d:0xa0b6b9c2d3b0b4d3!2m2!1d-122.4050!2d37.7822");
  assert.equal(r.p.daddr, "Blue Bottle Coffee, 66 Mint St, San Francisco");
  assert.equal(r.p.sll, "37.7822,-122.405");
});

test("dir: empty destination name but waypoint coordinates in data blob", () => {
  const r = conv("https://www.google.com/maps/dir//''/data=!4m5!4m4!1m0!1m2!1m1!1s0x0:0x0!2m2!1d-122.405!2d37.7822");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.daddr, "37.7822,-122.405");
});

test("dir: destination with percent-encoded comma, ampersand and plus", () => {
  const r = conv("https://www.google.com/maps/dir//Barnes+%26+Noble,+555+5th+Ave%2C+New+York/");
  assert.equal(r.p.daddr, "Barnes & Noble, 555 5th Ave, New York");
});

test("dir: regional domain google.co.uk", () => {
  const r = conv("https://www.google.co.uk/maps/dir//Buckingham+Palace,+London/@51.5,-0.14,15z/data=!4m2!4m1!3e3");
  assert.equal(r.p.daddr, "Buckingham Palace, London");
  assert.equal(r.p.dirflg, "r");
});

test("dir: comgooglemaps:// scheme with daddr and directionsmode", () => {
  const r = conv("comgooglemaps://?saddr=Hyde+Park&daddr=Tower+Bridge&directionsmode=walking");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.saddr, "Hyde Park");
  assert.equal(r.p.daddr, "Tower Bridge");
  assert.equal(r.p.dirflg, "w");
});

test("dir: unicode destination", () => {
  const r = conv("https://www.google.com/maps/dir//%E6%9D%B1%E4%BA%AC%E3%82%BF%E3%83%AF%E3%83%BC/");
  assert.equal(r.p.daddr, "東京タワー");
});

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

test("place: name with exact pin from data blob, not the viewport", () => {
  const r = conv("https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2922926,17z/data=!3m1!4b1!4m6!3m5!1s0x47e66e2964e34e2d:0x8ddca9ee380ef7e0!8m2!3d48.8583701!4d2.2944813!16zL20vMDJqODE");
  assert.equal(r.kind, "place");
  assert.equal(r.p.q, "Eiffel Tower");
  assert.equal(r.p.ll, "48.8583701,2.2944813");
});

test("place: name with viewport only uses a nearby search", () => {
  const r = conv("https://www.google.com/maps/place/Pike+Place+Market/@47.6097,-122.3422,17z");
  assert.equal(r.p.q, "Pike Place Market");
  assert.equal(r.p.sll, "47.6097,-122.3422");
  assert.equal(r.p.ll, undefined);
});

test("place: name only, no coordinates", () => {
  const r = conv("https://www.google.com/maps/place/Statue+of+Liberty/data=!4m2!3m1!1s0x89c25090129c363d:0x40c6a5770d25022b");
  assert.equal(r.p.q, "Statue of Liberty");
  assert.equal(r.p.ll, undefined);
});

test("place: coordinates as the place (dropped pin)", () => {
  const r = conv("https://www.google.com/maps/place/37.4219999,-122.0840575/@37.4219999,-122.0840575,17z");
  assert.equal(r.kind, "coords");
  assert.equal(r.p.ll, "37.4219999,-122.0840575");
  assert.equal(r.p.q, "37.4219999,-122.0840575");
});

test("place: /maps/place/?q=place_id: falls back to link text", () => {
  const r = conv("https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4", { fallbackText: "Google Sydney" });
  assert.equal(r.kind, "fallback");
  assert.equal(r.p.q, "Google Sydney");
});

test("place: regional domain google.ca and google.com.au", () => {
  assert.equal(conv("https://www.google.ca/maps/place/CN+Tower/@43.6426,-79.3871,17z").p.q, "CN Tower");
  assert.equal(conv("https://www.google.com.au/maps/place/Sydney+Opera+House/").p.q, "Sydney Opera House");
});

// ---------------------------------------------------------------------------
// Searches
// ---------------------------------------------------------------------------

test("search: /maps/search/QUERY", () => {
  const r = conv("https://www.google.com/maps/search/coffee+near+me/");
  assert.equal(r.kind, "search");
  assert.equal(r.p.q, "coffee near me");
});

test("search: /maps/search/QUERY/@viewport keeps the area", () => {
  const r = conv("https://www.google.com/maps/search/pizza/@40.7589,-73.9851,15z");
  assert.equal(r.p.q, "pizza");
  assert.equal(r.p.sll, "40.7589,-73.9851");
  assert.equal(r.p.z, "15");
});

test("search: api=1 query", () => {
  const r = conv("https://www.google.com/maps/search/?api=1&query=centurylink+field");
  assert.equal(r.p.q, "centurylink field");
});

test("search: api=1 query with coordinates", () => {
  const r = conv("https://www.google.com/maps/search/?api=1&query=47.5951518%2C-122.3316393");
  assert.equal(r.kind, "coords");
  assert.equal(r.p.ll, "47.5951518,-122.3316393");
});

test("search: api=1 query with query_place_id is ignored safely", () => {
  const r = conv("https://www.google.com/maps/search/?api=1&query=Google&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4");
  assert.equal(r.p.q, "Google");
});

test("search: maps?q=", () => {
  assert.equal(conv("https://maps.google.com/maps?q=Empire+State+Building").p.q, "Empire State Building");
  assert.equal(conv("https://www.google.com/maps?q=Empire+State+Building").p.q, "Empire State Building");
  assert.equal(conv("https://maps.google.com/?q=Empire+State+Building").p.q, "Empire State Building");
});

test("search: q=loc:lat,lng", () => {
  const r = conv("https://maps.google.com/?q=loc:51.5007,-0.1246");
  assert.equal(r.kind, "coords");
  assert.equal(r.p.ll, "51.5007,-0.1246");
});

test("search: q=Name@lat,lng", () => {
  const r = conv("https://maps.google.com/maps?q=Big+Ben@51.5007,-0.1246");
  assert.equal(r.p.q, "Big Ben");
  assert.equal(r.p.sll, "51.5007,-0.1246");
});

test("search: q=lat,lng (Name)", () => {
  const r = conv("https://maps.google.com/maps?q=51.5007,-0.1246+(Big+Ben)");
  assert.equal(r.p.q, "Big Ben");
  assert.equal(r.p.sll, "51.5007,-0.1246");
});

test("search: q with ll and z", () => {
  const r = conv("https://maps.google.com/maps?q=tacos&ll=34.05,-118.24&z=14");
  assert.equal(r.p.q, "tacos");
  assert.equal(r.p.sll, "34.05,-118.24");
  assert.equal(r.p.z, "14");
});

// ---------------------------------------------------------------------------
// Bare coordinates and map views
// ---------------------------------------------------------------------------

test("coords: ll= only", () => {
  const r = conv("https://maps.google.com/?ll=37.0625,-95.677068");
  assert.equal(r.kind, "coords");
  assert.equal(r.p.ll, "37.0625,-95.677068");
});

test("coords: bare map view /maps/@lat,lng,zoom", () => {
  const r = conv("https://www.google.com/maps/@37.7749,-122.4194,12z");
  assert.equal(r.p.ll, "37.7749,-122.4194");
  assert.equal(r.p.z, "12");
});

test("coords: api=1 map_action=map center/zoom", () => {
  const r = conv("https://www.google.com/maps/@?api=1&map_action=map&center=-33.712206,150.311941&zoom=12");
  assert.equal(r.p.ll, "-33.712206,150.311941");
  assert.equal(r.p.z, "12");
});

test("coords: geo: URI", () => {
  const r = conv("geo:37.7749,-122.4194");
  assert.equal(r.p.ll, "37.7749,-122.4194");
});

test("coords: geo: URI with query", () => {
  const r = conv("geo:0,0?q=Sushi+in+Tokyo");
  assert.equal(r.p.q, "Sushi in Tokyo");
});

// ---------------------------------------------------------------------------
// Wrappers, short links, classification
// ---------------------------------------------------------------------------

test("wrapper: google.com/url?q= unwraps to the real maps link", () => {
  const r = conv("https://www.google.com/url?q=https://www.google.com/maps/dir//Apple+Park/&sa=D");
  assert.equal(r.kind, "directions");
  assert.equal(r.p.daddr, "Apple Park");
});

test("wrapper: consent.google.com/m?continue= unwraps", () => {
  const r = conv("https://consent.google.com/m?continue=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2FBrandenburg%2BGate%2F&gl=DE");
  assert.equal(r.p.q, "Brandenburg Gate");
});

test("relative links on google.com are handled", () => {
  const r = conv("/maps/dir//Apple+Park,+Cupertino,+CA/data=!4m2!4m1!3e0");
  assert.equal(r.p.daddr, "Apple Park, Cupertino, CA");
  assert.equal(r.p.dirflg, "d");
});

test("short links are classified, not converted", () => {
  for (const u of ["https://maps.app.goo.gl/XZ3nnTjxQPbfeqM57", "https://goo.gl/maps/abc123", "https://g.page/some-business"]) {
    assert.equal(Maps.classify(u), "short", u);
    assert.equal(Maps.isShortLink(u), true, u);
    assert.equal(Maps.convert(u), null, u);
  }
  assert.equal(Maps.classify("https://g.page/r/abc/review"), null, "review links are left alone");
  assert.equal(Maps.classify("https://goo.gl/xyz"), null, "non-maps goo.gl is left alone");
});

test("non-maps URLs are ignored", () => {
  for (const u of [
    "https://www.google.com/search?q=apple+park",
    "https://www.google.com/",
    "https://www.apple.com/maps/",
    "https://maps.apple.com/?q=Apple+Park",
    "https://notgoogle.com/maps/place/Foo",
    "https://google.com.evil.example/maps/place/Foo",
    "mailto:someone@example.com",
    "javascript:void(0)",
    "",
    null
  ]) {
    assert.equal(Maps.convert(u), null, String(u));
  }
});

test("maps paths with no Apple equivalent are skipped", () => {
  for (const u of [
    "https://www.google.com/maps/embed?pb=!1m18",
    "https://www.google.com/maps/d/viewer?mid=abc",
    "https://www.google.com/maps/contrib/123",
    "https://www.google.com/maps/timeline"
  ]) {
    assert.equal(Maps.classify(u), "skip", u);
    assert.equal(Maps.convert(u), null, u);
  }
});

test("fallback: cid-only link uses nearby text, never returns null", () => {
  const r = conv("https://maps.google.com/?cid=1234567890", { fallbackText: "Joe's Diner" });
  assert.equal(r.kind, "fallback");
  assert.equal(r.p.q, "Joe's Diner");
  const bare = conv("https://maps.google.com/?cid=1234567890", { fallbackText: "Directions" });
  assert.equal(bare.url, "https://maps.apple.com/");
});

test("encoding: commas stay readable, plus is encoded", () => {
  const r = conv("https://www.google.com/maps/search/C%2B%2B+meetup/@1.3,103.8,12z");
  assert.equal(r.p.q, "C++ meetup");
  assert.ok(r.url.includes("sll=1.3,103.8"));
  assert.ok(r.url.includes("q=C%2B%2B+meetup"));
});

test("travel mode mapping table", () => {
  assert.equal(Maps.toDirflg("driving"), "d");
  assert.equal(Maps.toDirflg("walking"), "w");
  assert.equal(Maps.toDirflg("transit"), "r");
  assert.equal(Maps.toDirflg("bicycling"), "c");
  assert.equal(Maps.toDirflg("flying"), null);
});

// ---------------------------------------------------------------------------
// Manifest consistency: host permissions and content script matches agree,
// and every host the converter accepts is covered by a permission pattern.
// ---------------------------------------------------------------------------

test("manifest: host_permissions and content script matches are identical", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(resources, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  const hosts = manifest.host_permissions.slice().sort();
  const matches = manifest.content_scripts[0].matches.slice().sort();
  assert.deepEqual(matches, hosts);
  assert.deepEqual(manifest.content_scripts[0].js, ["mapsConverter.js", "content.js"]);
  assert.ok(manifest.background.scripts.includes("mapsConverter.js"));
  for (const must of ["*://*.google.com/*", "*://maps.app.goo.gl/*", "*://goo.gl/*", "*://g.page/*", "*://*.google.co.uk/*", "*://*.google.ca/*"]) {
    assert.ok(hosts.includes(must), "missing host permission " + must);
  }
  for (const p of manifest.permissions) {
    assert.ok(["storage", "webNavigation"].includes(p), "unexpected permission " + p);
  }
});

// ---------------------------------------------------------------------------

for (const f of failures) {
  console.error("FAIL: " + f.name + "\n  " + (f.err && f.err.message));
}
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
