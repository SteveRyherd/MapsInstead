# Images the site expects

Drop real captures in with these exact names and the pages pick them up. Until a file exists,
its slot shows a labelled placeholder so the layout can be reviewed without it.

Capture tips are in `../app-store/launch-plan.md` section 6. Put raw captures in `../screenshots`
at the device's native size, then add them to `../design/build-screenshots.py`, which crops each one
to the part that matters, dims the rest and rings the control to tap. Don't hand-annotate new
captures; the script paints out the boxes on the existing ones.

| File | Used on | What to capture |
|---|---|---|
| `icon.png` | all pages | Generated from the app icon. Already present. |
| `hero.mp4` | index | 15 to 30 s screen recording: tap Directions on a Google result, Apple Maps opens. Same cut as the App Preview. Optional `hero-poster.jpg` as the poster frame. |
| `hero.jpg` | index (fallback when no video) | Made by `build-screenshots.py` from the Google result and Apple Maps captures. |
| `ios-settings-apps.png` | setup (iPhone/iPad) | Settings main list, with Apps highlighted. |
| `ios-settings-apps-safari.png` | setup (iPhone/iPad) | Settings > Apps, with Safari highlighted. |
| `ios-settings-safari.png` | setup (iPhone/iPad) | Settings > Apps > Safari, with Extensions highlighted. |
| `ios-settings-remapped.png` | setup (iPhone/iPad) | **Maps Instead**'s page with the extension switched on. The name is historical; keep it. |
| `ios-safari-menu.png` | setup (iPhone/iPad) | Safari's page menu with Manage Extensions highlighted. |
| `ios-safari-menu-app.png` | setup (iPhone/iPad) | Safari's page menu with **Maps Instead** highlighted. |
| `ios-safari-prompt.png` | setup (iPhone/iPad) | Safari's "Maps Instead would like to access google.com" prompt with Always Allow highlighted. |
| `ios-safari-every-website.png` | setup (iPhone/iPad) | Safari's follow-up with Always Allow on Every Website highlighted. |
| `ios-google-result.png` | index | A Google result in Safari with a map link. |
| `ios-test.png` | index, setup (iPhone/iPad) | Apple Maps with directions to Apple Park, after pressing Test it. |
| `mac-safari-settings.png` | setup (Mac) | Safari > Settings > Extensions with **Maps Instead** ticked. |
| `mac-permissions.png` | setup (Mac) | The Edit Websites sheet, or Always Allow on Every Website highlighted. |
| `mac-test.png` | setup (Mac) | Rendered: the app's status card and Test it button. |
| `popup.png` | index | Rendered from the real popup by `render-app-images.sh`, with a sample count. Replace with a capture when convenient. |
| `app-main.png` | setup (Mac) | Rendered from the real SwiftUI view by `render-app-images.sh`, status forced to On. |
| `dancing.png` | index | The developer and his girlfriend, for the Who made this section. |
| `person-dancing.png` | setup | Sign-off at the end of the steps. |
| `person-suit.png` | support | Beside Report a problem. |
