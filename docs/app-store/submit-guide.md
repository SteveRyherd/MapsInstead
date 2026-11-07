# Submitting to the App Store, step by step

Written for a first-time Apple developer. `launch-plan.md` says *what* to ship (positioning, price,
screenshots); `copy.md` holds every piece of text to paste. This file is the *how*, in the order
that avoids waiting around. Tick boxes as you go.

Already done in the repo, nothing to do: Team ID `4M4TYVA28X` set on every target, automatic
signing, bundle IDs `com.desatt.MapsInstead` (+ `.Extension`), version 1.0.0 build 1, App Sandbox on
the Mac targets, the encryption-export flag (`ITSAppUsesNonExemptEncryption = NO`), a privacy
manifest (`Shared (App)/PrivacyInfo.xcprivacy`), and every icon size.

---

## Words you'll see

| Term | What it means here |
|---|---|
| **Team** | Every developer account is a "team", even a one-person one. Yours is `4M4TYVA28X`. If you enrolled as an Individual, the App Store shows your legal name as the seller; an Organization (needs a D-U-N-S number) shows the company name. |
| **developer.apple.com** | Certificates, bundle IDs, devices. With automatic signing, Xcode manages this for you; you rarely visit. |
| **App Store Connect** (appstoreconnect.apple.com) | Where the listing, price, screenshots, TestFlight and review live. |
| **Bundle ID** | The app's permanent unique ID. Can't change after the first upload. |
| **SKU** | Your own private label for the app in sales reports. Anything, e.g. `MAPSINSTEAD1`. |
| **Archive** | A release build Xcode packages for upload. |
| **TestFlight** | Apple's beta app. Builds you upload appear there first; install them on your own devices before submitting. |
| **Universal purchase** | One App Store record with iOS and macOS platforms, sharing a bundle ID. Buy once, get both. |

---

## Phase 1: Paperwork (start today, it can take days)

A paid app cannot go on sale until these are active, and the bank/tax step sometimes takes a few
business days to verify.

- [ ] **Paid Apps Agreement.** App Store Connect → **Business** (older name: Agreements, Tax, and
      Banking). Accept the Paid Apps agreement.
- [ ] **Bank account** for payouts (same page).
- [ ] **Tax form.** US person: the W-9 interview. Takes five minutes.
- [ ] **EU trader status (Digital Services Act).** App Store Connect asks whether you are a
      "trader". Selling a paid app generally means yes, and then your **address, phone and email
      are shown publicly on EU product pages**. Options: declare as trader (use a business address
      or PO box and a dedicated email/phone if you don't want home details public), or leave the EU
      out of availability at launch. Without a declaration the app won't appear in EU storefronts.
- [ ] **Support email.** `docs/support.html` still needs a real address (see HANDOFF.md). Make a
      dedicated one, e.g. `support@mapsinstead.com` via Cloudflare Email Routing. The same address
      works for the DSA contact.

## Phase 2: Xcode signing (15 minutes)

- [ ] Use the current Xcode (26 or later). Apple rejects uploads built with old SDKs.
- [ ] Xcode → Settings → **Accounts** → `+` → Apple ID. Your team appears under it.
- [ ] Open `MapsInstead.xcodeproj`. For each of the four targets (iOS app, iOS extension, macOS app,
      macOS extension): **Signing & Capabilities** tab → "Automatically manage signing" on, Team =
      your team. It should already show; if it shows a red error, the Accounts step is missing.
- [ ] First time only, Xcode registers the two bundle IDs with Apple automatically. If it says the
      ID is taken, someone else owns `com.desatt.MapsInstead`; change `DETOUR_BUNDLE_ID_PREFIX` in
      `Config/Branding.xcconfig` (it must be unique worldwide, not a domain you must own).
- [ ] If Xcode offers "Update to recommended settings", read HANDOFF.md's pitfall first: it raises
      the deployment targets. Revert those.

## Phase 3: Create the App Store Connect record (10 minutes)

- [ ] App Store Connect → **Apps** → `+` → **New App**.
  - Platforms: tick **iOS** and **macOS** (this is what makes it universal purchase).
  - Name: `Maps Instead` (fallback in `copy.md` if taken).
  - Primary language: English (U.S.).
  - Bundle ID: pick `com.desatt.MapsInstead` from the list (it appears after Phase 2).
  - SKU: `MAPSINSTEAD1`. User access: Full.
- [ ] **App Information** (left sidebar): subtitle, category **Utilities** (secondary:
      Navigation), content rights ("does not contain third-party content"), age rating
      questionnaire (answer No/None throughout → 4+).
- [ ] **App Privacy**: privacy policy URL `https://mapsinstead.com/privacy.html`, then "No, we do
      not collect data" → label reads **Data Not Collected**.
- [ ] **Pricing and Availability**: $1.99, territories (see the EU note above).

## Phase 4: Upload a build and test it (1 hour, plus Apple's processing)

- [ ] Run `node tests/mapsConverter.test.js` first.
- [ ] **iOS:** scheme "Maps Instead (iOS)", destination **Any iOS Device (arm64)** →
      Product → **Archive**. The Organizer window opens → **Distribute App** → **App Store
      Connect** → Upload. Accept the defaults.
- [ ] **macOS:** scheme "Maps Instead (macOS)", destination **Any Mac** → Archive → Distribute
      the same way.
- [ ] Wait for the "has completed processing" email (10 to 60 minutes). Problems arrive by email too
      (subject starts "ITMS-"); paste them into a session and they're usually quick to fix.
- [ ] **TestFlight** tab → Internal Testing → add yourself → install the **TestFlight** app on your
      iPhone/iPad and open the build. The Mac build installs through TestFlight for Mac.
- [ ] Delete any old Detour/Remapped dev installs first, then test on a real iPhone, iPad and Mac:
      the Directions button in a Google result, a shared `maps.app.goo.gl` link, a place result,
      and the in-app "Test it" button. (HANDOFF.md step 4: `NAVIGATION_FILTER` has never run in
      Safari yet; this is where you find out.)
- [ ] Every new upload needs a higher build number: bump `CURRENT_PROJECT_VERSION` in
      `Config/Branding.xcconfig` (1 → 2 → 3). `MARKETING_VERSION` stays 1.0.0 until release.

## Phase 5: Screenshots, video, text

Sizes are in `screenshots.md`; what goes on each one is in `launch-plan.md` §4 and §5.

- [ ] **iPhone 6.9"** (1320 × 2868): the six slides in `slides/` are drafted at this size. Finish
      them (real Maps and Messages captures in slides 2 and 3, remove the red draft tags).
- [ ] **iPad 13"** (2064 × 2752): **required**, because the app runs on iPad. Not drafted yet.
      Easiest route: re-render the iPhone slides at iPad size with iPad Simulator captures.
- [ ] **Mac** (2880 × 1800, 16:10): **required** for the macOS platform. Not drafted yet.
- [ ] Optional: App Preview videos (15 to 30 s). Nice, not needed for launch.
- [ ] Paste from `copy.md`: promotional text, description, keywords, support URL
      (`https://mapsinstead.com/support.html`), marketing URL (`https://mapsinstead.com`), What's New.
- [ ] Copyright line: `2026 Steve Ryherd` (or your company name).
- [ ] Do the iOS tab and the macOS tab separately: each platform has its own screenshots and build
      slot, but shares the name, description and price.

## Phase 6: Submit

- [ ] On each platform's version page, under **Build**, pick the processed build.
- [ ] **App Review Information**: paste the review notes from `copy.md`, add your phone and email,
      sign-in required = No. Attach a short screen recording of enabling the extension and tapping a
      link if you can; Safari extensions get rejected most often because the reviewer couldn't see it
      work.
- [ ] **Version Release**: choose "Manually release this version" so you control launch day.
- [ ] **Add for Review** → **Submit**. Typical review time is one to two days.
- [ ] Rejected? It's normal for a first app. The message cites a guideline number; reply in the
      Resolution Center or fix and resubmit. Nothing is lost.

## Phase 7: Launch day

- [ ] Press **Release**. It can take a few hours to appear in search.
- [ ] Publish the site (`scripts/deploy-site.sh`) if it isn't already live, and check the three
      URLs load.
- [ ] Tag: `git tag v1.0.0 && git push origin v1.0.0`.

---

## Things most likely to get this rejected (check before submitting)

1. **Google imagery and trademarks (guideline 5.2).** HANDOFF.md's open decision: several
   screenshots and website images show real Google/Apple map imagery. Reviewers do flag
   screenshots that show another company's app UI prominently. Safest: illustrated maps (the slides'
   paper style) plus your own app and Safari chrome. "Google" in the description as a compatibility
   statement is fine; not in the name, subtitle or icon.
2. **The icon's red pin.** A red teardrop pin with a white dot sits close to Google Maps' own pin.
   It's a generic map symbol and probably fine, but if a reviewer raises 5.2, that's the likely
   target. A different pin colour (e.g. the icon's green or orange) would remove the question.
3. **Minimum functionality (4.2).** The container app must be useful on its own. The onboarding,
   status card and "Test it" button cover this; make sure screenshot 3 shows them.
4. **Claims not yet true.** The site says "Data Not Collected" and "Apple reviews each version";
   both become true at launch, which is fine, but don't publish the site with them before you submit.
5. **Metadata mismatch.** The listing says it works on iPad and Mac, so the reviewer will test both.
   Test both in TestFlight first.
