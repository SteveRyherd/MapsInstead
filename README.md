# Maps Instead

**Google Maps links open in Apple Maps. Directions included.**

Maps Instead is a Safari Web Extension for iPhone, iPad and Mac. When you tap a Google Maps link in
Safari, Maps Instead converts it on your device and opens Apple Maps instead of the Google Maps app or the
App Store. It handles places, searches, coordinates, shared short links and, above all, directions,
including the "Directions" buttons in Google search results.

- No analytics, no tracking, no data collected. App Store privacy label: **Data Not Collected**.
- Plain JavaScript, no frameworks, no build step, no npm.
- One Xcode project, one purchase for iOS, iPadOS and macOS (universal purchase).
- MIT licensed.

Site, setup guide, support and privacy policy: `docs/` (published with GitHub Pages).

"Detour" was the working title. It survives as the repository name, in the `DETOUR_*` build
settings and in the `DetourMaps` JavaScript object. Users never see it.

## Repository layout

```
MapsInstead.xcodeproj/          Xcode project with four targets and two shared schemes
Config/Branding.xcconfig     Product name, bundle IDs, URLs, version. The one place to rename.
Shared (App)/                SwiftUI container app (onboarding, status, Test it button)
Shared (Extension)/
  SafariWebExtensionHandler.swift   Required native stub, does nothing interesting
  Resources/
    manifest.json            Manifest V3
    mapsConverter.js         Pure URL conversion. No DOM. Tested in Node.
    content.js               Click interception, page-load redirects, href rewriting
    background.js            Short-link resolution, settings, redirect counter
    popup.html/css/js        Toolbar popup: on/off toggle and redirect count
    _locales/en/messages.json   Extension name and popup strings
iOS (App)/, iOS (Extension)/, macOS (App)/, macOS (Extension)/   Per-platform plists and entitlements
tests/mapsConverter.test.js  Node tests with real Google URL formats
docs/                        GitHub Pages site: index, support, privacy, App Store copy, screenshot checklist
```

## Development setup

Requirements: Xcode 15 or later, a paid Apple Developer account, Node 18 or later for the tests.

```
git clone https://github.com/SteveRyherd/detour.git
cd detour
open MapsInstead.xcodeproj
```

Then in Xcode:

1. Select the project in the navigator, then each of the four targets in turn, open **Signing &
   Capabilities** and choose your **Team**. That is the only signing change required.
2. In `Config/Branding.xcconfig`, change `DETOUR_BUNDLE_ID_PREFIX` from `com.example` to your own
   reverse-DNS prefix. iOS and macOS intentionally share the same bundle IDs; that is what makes the
   App Store treat them as one universal purchase.
3. Pick the **Maps Instead (iOS)** scheme and a device or simulator, then Run. For the Mac, pick
   **Maps Instead (macOS)**.

Running on a device for the first time:

- iPhone and iPad: after the app launches, go to Settings › Apps › Safari › Extensions (Settings ›
  Safari › Extensions on iOS 17 and earlier), turn on Maps Instead, and set Google sites to Allow.
- Mac: Safari › Settings › Extensions, tick Maps Instead. During development also enable
  Safari › Settings › Developer › **Allow unsigned extensions** if Safari refuses to list it.

Press **Test it** in the app. Apple Maps should open with directions to Apple Park.

Adding a new file to the extension: put it in `Shared (Extension)/Resources`, add it to the
Resources group in Xcode and tick both extension targets. The files are copied individually to
the root of the extension bundle. Do not add the folder itself as a folder reference: a
top-level `Resources` directory inside a flat iOS bundle makes the system look for `Info.plist`
in the wrong place and the extension fails to load.

Tip for iterating on the JavaScript: after editing files under `Shared (Extension)/Resources`,
build and run again. Safari picks up the new copy; on Mac you can also inspect the background page
from Safari › Develop › Web Extension Background Content.

## Running the tests

The converter has no dependencies and the tests use Node's built-in `assert`:

```
node tests/mapsConverter.test.js
```

The suite covers every URL format the extension understands, with extra weight on directions, and
also checks that `manifest.json` keeps `host_permissions` and the content script `matches` in sync.

## How it works

1. **Clicks on Google pages.** `content.js` runs on Google domains at `document_start` and listens
   for clicks in the capture phase, so it sees the click before Google's own handlers. If the link
   (or a `data-url` button) is a Google Maps URL, it is converted synchronously with
   `mapsConverter.js` and Apple Maps is opened. Because the listener is on `document`, links that
   Google inserts after the page loads are covered too. A MutationObserver additionally rewrites
   the `href` of Maps links as they appear, so long-press and "Open in New Tab" also go to Apple Maps.
2. **Landing on a Google Maps page.** If the user arrives at a `google.com/maps/...` URL directly
   (shared link, universal link, redirect from a short link), the content script asks the
   background page to confirm the setting, stops the page and replaces it with the Apple Maps URL
   before Google's "open in app" interstitial can run. If a Maps page does load anyway,
   the content script dismisses Google's app-promotion overlay rather than leaving the user stuck.
3. **Short links.** `maps.app.goo.gl`, `goo.gl/maps` and `g.page` are resolved in `background.js`
   with a `fetch` that follows redirects. This is the only network request the extension makes.
   Short links of the form `maps.app.goo.gl/?link=...&ifl=...` carry the destination in the
   `link` parameter and an App Store fallback in `ifl`; the converter reads `link` directly and
   never follows the fallback. `webNavigation.onBeforeNavigate` redirects any Google Maps or
   short-link navigation before the page starts loading; clicks are resolved on demand.
4. **Fallback.** A Google Maps link that cannot be parsed still opens Apple Maps, searching for the
   link text or a nearby heading when one exists, so the user is never left on an interstitial.

All conversion logic is in `mapsConverter.js`, a pure function module with no DOM access. Apple
Maps URLs use the long-supported `maps.apple.com/?q=&ll=&saddr=&daddr=&dirflg=` form, which works
on every supported OS version and falls back to the Apple Maps web app if needed.

## Renaming the app

The product has been renamed twice already (Detour, Remapped, Maps Instead), so the path is proven. The
name is deliberately kept in two files:

1. `Config/Branding.xcconfig`: set `DETOUR_DISPLAY_NAME` (what users see) and optionally
   `DETOUR_PRODUCT_NAME` (the `.app` file and module name). Every target reads these.
2. `Shared (Extension)/Resources/_locales/en/messages.json`: set `extension_name` and, if you
   like, `extension_description`. Safari shows these in its Extensions settings and toolbar.

That is the whole rename for the product. Cosmetic follow-ups, none of which affect the build:
rename the Xcode project, targets and schemes if you want them to match (plain text edits in
`project.pbxproj` and the `.xcscheme` files), update the headings in `docs/`, and search
`docs/app-store/` for the old name. The Swift code never hard-codes the
name; it reads it from the bundle at runtime (`Shared (App)/Branding.swift`), and all app copy
lives in that same file.

## Updating the icon

The icon artwork is `docs/design/icon-source.png`, a square 1024 x 1024 PNG with no rounded
corners and no transparency. Every size the project needs is cut from it by one script:

```
python3 docs/design/make-icons.py
```

That rewrites the iOS and macOS app icon set, the Safari extension icons, the toolbar glyph and
the website icon. To change the icon, replace the source file and run the script. It needs
Python 3 with Pillow.

## Branching and releasing

Work happens on `development`; `main` holds what has shipped or is ready to ship.

```
git checkout development
git pull origin development
```

When a release is ready:

```
git checkout main
git merge --no-ff development
git tag v1.0.0
git push origin main --tags
```

Before archiving for the App Store, bump `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in
`Config/Branding.xcconfig`. The app and extension read the same values, so they always match.

App Store copy, the privacy label answers, review notes, the screenshot checklist and the launch
plan (competitor notes, pricing, App Preview storyboard) are in `docs/app-store/`. The docs site
has picture slots for every setup step; `docs/images/README.md` lists the captures it needs.

## Licence

MIT. See `LICENSE`.
