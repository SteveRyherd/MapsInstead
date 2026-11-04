# App Store copy

Paste into App Store Connect. Character limits are noted where Apple enforces them.

Trademark note: do not put "Google" in the app name, subtitle or icon. Mentioning Google Maps in
the description and keywords as a compatibility statement is normal and accepted.

## Name (30 characters max)

Remapped

Fallback if taken: Remapped for Safari

## Subtitle (30 characters max)

Google Maps links → Apple Maps

Alternatives:

- Directions that actually work
- Open map links in Apple Maps

## Promotional text (170 characters max, editable without a new build)

Directions, places, searches and shared short links all open in Apple Maps. One purchase for iPhone, iPad and Mac. No tracking, open source.

## Description (4000 characters max)

Remapped opens Google Maps links in Apple Maps.

Tap a Google Maps link in Safari and Apple Maps opens instead, with the right place, search or directions already filled in. No Google Maps app needed, no App Store interruption, no copying addresses by hand.

DIRECTIONS ACTUALLY WORK
The "Directions" buttons in Google search results, /maps/dir/ links and directions parameters all open Apple Maps directions. Walking, transit, cycling and driving modes carry across. A missing starting point means "from here", exactly as you would expect.

EVERY KIND OF LINK
• Places and business listings, with the exact pin
• Searches such as "coffee near me"
• Plain coordinates and map views
• Short shared links (maps.app.goo.gl, goo.gl/maps, g.page)
• Map thumbnails and local business cards in search results
• Links Google adds to the page after it loads
• Google's regional sites (google.co.uk, google.ca, google.de and the rest)
If a link cannot be understood, Remapped still opens Apple Maps with the best search it can, so you are never stuck.

ONE PURCHASE, THREE DEVICES
Buy once and use it on iPhone, iPad and Mac.

PRIVACY YOU CAN CHECK
No analytics. No tracking. No accounts. No data collected. The only network request Remapped ever makes is to resolve a shortened link, and only when you tap one. The complete source code is public on GitHub, so you do not have to take our word for it.

FAST
Links are converted on your device in plain JavaScript. There is no noticeable delay when you tap.

SETUP
1. Open the app for a short walkthrough.
2. Turn on the extension: Settings › Apps › Safari › Extensions on iPhone and iPad, or Safari › Settings › Extensions on Mac.
3. Allow it on Google sites.
4. Press "Test it" to watch a real directions link open in Apple Maps.

Remapped is an independent project and is not affiliated with Apple or Google. Google Maps is a trademark of Google LLC. Apple Maps is a trademark of Apple Inc.

## Keywords (100 characters max, comma separated, no spaces after commas)

apple maps,google maps,directions,safari extension,map links,redirect,navigation,open in maps,privacy

(98 characters.)

## What's New (first release)

First release. Google Maps links, including directions, open in Apple Maps on iPhone, iPad and Mac.

## URLs

- Support URL: https://steveryherd.github.io/detour/support.html
- Marketing URL: https://steveryherd.github.io/detour/
- Privacy Policy URL: https://steveryherd.github.io/detour/privacy.html

## Category

Primary: Utilities. Secondary: Navigation.

## Price

$1.99, no in-app purchases, no subscription. See `launch-plan.md` for the reasoning.

## Age rating

4+ (no objectionable content).

## App Privacy (the "nutrition label")

Answer "No, we do not collect data from this app" to every question. The resulting label is
**Data Not Collected**. The short-link resolution request goes to Google, not to you, and does not
include identifiers, so it is not collection by the developer.

## Universal purchase

Create one app record in App Store Connect with the iOS platform, then use "Add Platform" to add
macOS to the same record. Both platforms must use the same bundle identifier, which this project
already does (Config/Branding.xcconfig). Set the price once; it applies to both.

## Review notes (App Review Information)

Remapped is a Safari Web Extension. To test:

1. Install and open the app, then enable the extension in Settings › Apps › Safari › Extensions (iOS) or Safari › Settings › Extensions (macOS) and allow it on google.com.
2. In Safari, open https://www.google.com/maps/dir//Apple+Park,+Cupertino,+CA (the app's "Test it" button opens this link).
3. Apple Maps opens with directions to Apple Park.

No account is needed. The app collects no data. The only network request is resolving Google's
own shortened map links when the user taps one.
