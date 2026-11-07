# Screenshot checklist

App Store Connect accepts screenshots for the largest device in each class and scales them down,
so the minimum set is small. Take them in light mode and, if you have time, dark mode variants.

## Required sizes

| Platform | Device class | Pixel size (portrait) | Notes |
|---|---|---|---|
| iPhone | 6.9" (iPhone 16 Pro Max, 17 Pro Max) | 1320 × 2868 | Required. Also covers 6.5" and 6.7" if you do not upload those. |
| iPhone | 6.5" (iPhone 11 Pro Max, XS Max) | 1284 × 2778 or 1242 × 2688 | Optional once 6.9" is uploaded. |
| iPad | 13" (iPad Pro M4) | 2064 × 2752 | Required for iPad. Also covers 12.9". |
| Mac | Any | 2880 × 1800 or 2560 × 1600 | Required for the macOS platform (16:10 only). |

Up to 10 screenshots per device class. App previews (video) are optional.

Simulator tip: take iPhone and iPad shots in the Simulator at 100% scale with File › Save Screen Shot.
Mac shots: Shift-Command-4, then Space, then click the window, on a Retina display.

## Design

The iPhone set is drafted in `slides/` in the Paper map style: one illustrated map across all six
slides, using the icon's two halves. The paper side has a route on slides 1 to 3, and the icon's
curved edge crosses into the night side, with its highway and blue arrow, on slides 3 and 4. Edit `slides/paper.html`, then run
`python3 docs/app-store/slides/build-slides.py`. `slides/compare.png` shows the styles that were tried.

Before submitting, replace slide 2's capture with the Maps app showing a route, replace slide 3's
bubbles with a real Messages capture, and remove the red draft tags. Add a capture of the iPhone
app's main screen, which Review will want to see. Don't put the price on a slide.

## Suggested shots, in order

1. **Hero: the result.** Apple Maps showing directions to a place, with a caption such as
   "Google Maps links open in Apple Maps. Directions included." The first screenshot is the one
   people see in search results, so lead with the payoff.
2. **Before and after.** Split image: a Google search result with its Directions button on the
   left, Apple Maps directions on the right. Caption: "Directions actually work."
3. **The app's main screen.** Status card and setup steps visible. Caption: "Set up in a minute."
   (Review wants to see the actual app; this shot covers that.)
4. **The Safari popup.** Toggle on, a redirect count showing. Caption: "Pause any time. Count what it saved you."
5. **Privacy.** The app's footer or a simple graphic with "No analytics. No tracking. No data collected. Open source."
   Caption: "Privacy you can check."
6. **Universal purchase.** iPhone, iPad and Mac side by side. Caption: "Buy once. iPhone, iPad and Mac."
7. (Mac only) **Safari Extensions settings** with **Maps Instead** enabled, to show where it lives.

## Caption rules of thumb

- One sentence per screenshot, under 8 words where possible.
- Do not show the Google logo prominently or crop Google's UI in a way that implies endorsement.
- Do not name competitor apps.
- Screenshots must reflect the current build; re-take them if the UI or name changes.

## Assets to prepare alongside

- 1024 × 1024 App Store icon (no alpha, no rounded corners). Replace
  `Shared (App)/Assets.xcassets/AppIcon.appiconset/ios-1024.png` and regenerate the macOS sizes.
- Optional: an App Store promotional artwork set if you want to be considered for features.
