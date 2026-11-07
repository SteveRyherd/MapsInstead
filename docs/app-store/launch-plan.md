# Launch plan

Working notes for taking **Maps Instead** from "it works on my phone" to a listing that out-sells the
incumbents. Everything here is a recommendation; the numbered checklists at the end are the
actual to-do list.

## 1. The competition, as listed in the App Store (November 2026)

| App | Price | Rating | What their listing leads with | Weakness we exploit |
|---|---|---|---|---|
| Mapper for Safari | $1.99 | 4.2 from 622 | Video first, then "Google Search → Apple Maps" and "Tap Directions in Safari" | Reviews complain redirects fail, land on Google, or need settings toggled repeatedly. Setup described as confusing. |
| Open In Maps | $1.99 | 3 stars from 7 | "Run in background", recognises Google search results | Dated screenshots, Travel category, tiny review base. |
| Map Path | $0.99 | 2 stars from 1 | Welcome screen, "Any map link. Apple Maps." | Screenshots are walls of text; the first one is a Settings screen. |
| Maps Switcher for Safari | $2.99 | 5 stars from 1 | Annotated arrows from Google results to the Maps icon | No traction; highest price. |

Takeaways:

- Mapper owns the category on volume. Its first asset is a video, and its captions are short
  and concrete. Match the format and beat it on the thing its reviews complain about.
- Nobody leads with privacy or with universal purchase. Both are differentiators.
- Nobody shows the *result* first. Every listing starts with a settings screen or a welcome
  page. Our first frame should be Apple Maps showing directions.

## 2. Positioning

One sentence: **Maps Instead opens Google Maps links in Apple Maps, and directions actually work.**

Three supporting claims, in the order they should appear everywhere (listing, website, onboarding):

1. Directions actually work. Directions buttons, shared links, short links, search results.
2. Buy once, use on iPhone, iPad and Mac.
3. Nothing is tracked. Open source so you can check.

Tone: plain, confident, no jargon, no exclamation marks. We do not name competitors anywhere
public. "Directions actually work" says it for us.

## 3. Pricing

Launch at **$1.99**, the same as Mapper. Cheaper reads as lesser, and $2.99 is the price of
the app nobody bought. Universal purchase at $1.99 means the Mac version is effectively free,
which is worth saying in the description. Revisit after the first 100 ratings.

No subscriptions, no in-app purchases. "No subscription" is a selling point in this category
and keeps the privacy story clean.

## 4. The App Preview video (first asset on the iPhone listing)

Apple's rules: 15 to 30 seconds, captured on device, portrait for iPhone, no hands or device
frames, must show the app or its extension in use. Record with the iPhone's built-in screen
recorder, trim in iMovie or QuickTime, export at the device's native size.

Storyboard, 22 seconds:

| Time | On screen | Caption overlay (optional, keep to 4 words) |
|---|---|---|
| 0 to 3 s | Safari, Google search for a restaurant, local card visible | "A Google result" |
| 3 to 6 s | Finger taps Directions on the card | "Tap Directions" |
| 6 to 10 s | Apple Maps opens with the route drawn | "Apple Maps. Every time." |
| 10 to 14 s | Back in Messages, a shared maps.app.goo.gl link, tap it | "Shared links too" |
| 14 to 18 s | Apple Maps opens on the place | "No app store detour" |
| 18 to 22 s | **Maps Instead** app main screen, status card showing On | "Set up in a minute" |

Record the same flow on the Mac for the macOS preview (landscape, 1920 x 1080 or the Mac's
native size), ending on Safari's Extensions settings with **Maps Instead** ticked.

Set the preview's poster frame to the Apple Maps directions frame, not the opening Google frame.

## 5. Screenshots and captions

Captions short enough to read at thumbnail size. Device frames are optional; Mapper uses none.

| Order | Shot | Caption |
|---|---|---|
| 1 | Apple Maps with directions drawn, arrived from a Google link | Directions actually work |
| 2 | Google search result card with the Directions button highlighted | Tap Directions in Safari |
| 3 | Messages thread with a Google Maps short link, Apple Maps peeking behind | Shared links open in Apple Maps |
| 4 | **Maps Instead** main screen, status On | Set up in a minute |
| 5 | Safari popup with the toggle and counter | Pause any time |
| 6 | Simple graphic: iPhone, iPad, Mac outlines | Buy once. Get all three. |
| 7 | Simple graphic: lock, "No tracking, no data, open source" | Privacy you can check |

Sizes and the capture process are in `screenshots.md`.

## 6. Website and support pages

The site in `docs/` is laid out so that every setup step has a picture. The pictures are not
in the repo yet because they have to be real captures from your devices. The exact files the
pages expect, and where each appears, are listed in `docs/images/README.md`. Drop the files
in with those names and the pages are complete.

Capture guidance:

- iPhone: Settings screens in light mode, 1x scale is fine (the site scales them down). Crop
  nothing; the site crops to a card.
- Mac: Shift-Command-4, then Space, click the Safari Settings window. Retina.
- Annotate with a single red rounded rectangle around the control to tap. Preview on the Mac
  can do it: Tools > Annotate > Rectangle, set the colour red, border width 4.

## 7. Launch checklist

Metadata and assets:

1. Confirm the name "Maps Instead" is available when creating the app record. Fallback: "Maps Instead for Safari".
2. Icon: adjust in `docs/design/icon-studio.html` (drag, sliders, colour pickers), export
   `icon-source.png`, then run `docs/design/make-icons.py` to cut every size.
3. Record the two App Previews (iPhone, Mac) and take the seven screenshots per device class.
4. Paste `copy.md` into App Store Connect. Set Promotional Text separately; it can change without a build.
5. Answer the privacy questions: no data collected.
6. Set price $1.99, availability all territories, age rating 4+.
7. Add macOS as a platform on the same record (universal purchase).

Code and repo:

8. Set `DETOUR_BUNDLE_ID_PREFIX` in `Config/Branding.xcconfig` to your real prefix.
9. Archive both platforms, upload, and run a TestFlight build on a real iPhone, iPad and Mac.
10. Verify the three website URLs load (support, privacy, marketing) once GitHub Pages is on.
11. Tag the release: `git tag v1.0.0` on `main`.

After launch:

12. Reply to every review in the first month. Ask reviewers who hit a failing link to send it;
    each becomes a test case.
13. Watch for Google URL format changes. The test suite is the early warning: run it when a
    report comes in, add the URL, fix, ship.
