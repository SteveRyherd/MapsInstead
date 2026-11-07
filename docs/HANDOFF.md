# Hand-off notes

Read this first if you are picking the project up cold. It says what exists, what is left, and the
mistakes already made so they are not repeated.

## What this is

**Maps Instead** is a Safari Web Extension app for iPhone, iPad and Mac that opens Google Maps links
in Apple Maps. "Detour" was the working title and survives only in the `DETOUR_*`
build settings, the `DetourMaps` JavaScript object and a few source file names. The repository is
`SteveRyherd/MapsInstead` (renamed from `detour` on 7 November 2026; GitHub redirects the old URL). The App Store name is Maps Instead;
the subtitle is "Google Maps links open in Maps"; the price plan is $1.99, universal purchase.

Everything a user sees is driven from two files: `Config/Branding.xcconfig` (names, bundle IDs,
URLs, version) and `Shared (Extension)/Resources/_locales/en/messages.json` (extension name and
popup strings). App copy is in `Shared (App)/Branding.swift`.

## State on 6 November 2026

- Builds and runs on Mac and iPhone (last verified under the Remapped name; the rename to Maps
  Instead changed only names and the bundle ID prefix, now `com.desatt`).
- Converter tests: 55, all passing, run on GitHub Actions on every push (`.github/workflows/tests.yml`).
- Icon finished: `docs/design/icon-source.png`, produced by `docs/design/icon-studio.html`
  (interactive) or `docs/design/build-icon.py` (script); `docs/design/make-icons.py` cuts every size.
- Website in `docs/` with picture slots that show placeholders until the files in
  `docs/images/README.md` exist. Placeholders show only on localhost; the public site hides empty slots.
- App Store copy, privacy answers, review notes, screenshot list and launch plan in `docs/app-store/`.

## Remaining work, in order

1. Capture the images listed in `docs/images/README.md` and drop them in with those exact names.
2. Put a real support email in `docs/support.html` (it says where).
3. Website: hosted on Cloudflare at mapsinstead.com. Publish with `scripts/deploy-site.sh`, which
   sends only the public pages and images, not the notes and raw files that also live in `docs/`.
4. Rebuild on device under the new name; delete old Detour/Remapped installs first. Test the
   Directions button in Google results, a shared `maps.app.goo.gl` link, and a place result.
   This is also the first real test of `NAVIGATION_FILTER` in `mapsConverter.js`: it passes the Node
   tests and matches WebKit's source, but has not yet run in Safari. If short links stop redirecting,
   look there first. The setup page's "Runs only on Google's sites" relies on it.
5. Record the App Preview and take screenshots per `docs/app-store/launch-plan.md` sections 4 and 5.
6. Optional: show the same Settings screenshots inside the in-app walkthrough (`OnboardingView.swift`)
   once they exist.
7. Create the App Store Connect record, add macOS as a platform, paste `docs/app-store/copy.md`,
   archive both platforms, TestFlight, submit. Step-by-step, for a first-time Apple developer:
   `docs/app-store/submit-guide.md`. iPad (2064 x 2752) and Mac (2880 x 1800) screenshots are
   required too and not drafted yet.

## Open decisions and loose ends (7 November 2026)

- **Map imagery.** The rule below says no real Google or Apple map imagery, but the website's
  `ios-google-result.png`, `ios-test.png` and `hero.jpg`, and App Store slides 1 and 2, all show it.
  Decide whether to relax the rule or replace those pictures.
- **Claims ahead of the facts.** The setup page's "Is it safe?" section says Apple reviews each
  version and the privacy label is "Data Not Collected"; both become true only at launch. "Runs only
  on Google's sites" relies on `NAVIGATION_FILTER`, untested in Safari (step 4 below).
- **App Store slides** are drafted in `docs/app-store/slides/` (see `docs/app-store/screenshots.md`).
  Slides 2 and 3 need a Maps app capture with a route and a Messages capture with a short link.
- **`ios-success.png` is Safari showing maps.apple.com**, not the Maps app. Check whether that is
  what normally happens on iPhone; if so, the site's "Apple Maps takes over" overstates it.
- **Website images** are cut by `docs/design/build-screenshots.py` from raw captures in
  `docs/screenshots/`, which stays out of git (personal content). The popup and Mac app pictures are
  rendered by `docs/design/render-app-images.sh`. The hero video slot is still empty.

## Conventions

- Work on `development`, push to `development` and fast-forward `main` when it is green:
  `git push origin development && git push origin development:main`.
- Run `node tests/mapsConverter.test.js` before every push that touches the extension.
- Any change to `MapsInstead.xcodeproj/project.pbxproj` must keep it a valid old-style plist: any
  value containing a space must be quoted. Xcode's error for a broken file is "not a valid property
  list". A strict checker is cheap to write; the earlier session used one.
- The product name contains a space. That is fine in `PRODUCT_NAME` and display names, but not in
  bundle identifiers (`MapsInstead`) or the project file name (`MapsInstead.xcodeproj`).
- In prose, the name is always distinguished: bold on the website and in Markdown, quotes in
  attributes, plain-text App Store copy and the in-app walkthrough. "Tap Maps Instead" without
  quotes reads as an instruction to tap maps.
- No "Google" or "Apple" in the app name, subtitle or icon. Compatibility statements in the
  description are fine. Do not use real Google or Apple map imagery anywhere.
- Commit messages: short imperative subject, a few lines of why. The user commits from their Mac
  sometimes too, so always `git pull origin development` before starting.

## Pitfalls already hit

- Copying the extension's web files as a folder named `Resources` breaks the iOS extension bundle
  (Xcode reports "Couldn't load Info dictionary"). The files are added individually; keep it so.
- Xcode's "update to recommended settings" sets deployment targets to the latest OS on every target.
  The project minimums are iOS 16 and macOS 13; remove any per-target override it adds.
- `maps.app.goo.gl/?link=...&ifl=...` links carry the destination in `link=` and an App Store
  fallback in `ifl=`; never follow the redirect, read `link=`. Handled in `mapsConverter.js`.
- Google's "get the app" interstitial means the extension did not run on that page load, almost
  always a Safari permission still set to Ask. The content script dismisses it as a safety net.

## Suggested opening prompt for the next session

> Read docs/HANDOFF.md in this repository and follow its conventions. I have added screenshots to
> docs/images and want you to (a) confirm every slot on the website now shows a real image and fix
> any that do not, (b) wire the iPhone Settings screenshots into the in-app walkthrough in
> Shared (App)/OnboardingView.swift, keeping all copy in Shared (App)/Branding.swift, and (c) run
> the tests and push to development and main. Do not rename anything or touch the icon.
