#!/bin/sh
# Renders the popup and the Mac app's main screen from their real source, for the website.
# Needs no running app or Safari: the popup opens in headless Chrome with a stand-in for the
# extension API, and the SwiftUI view is drawn off screen with the status forced to On.
# The redirect count in the popup is a sample value. Writes raw files to docs/screenshots;
# docs/design/build-screenshots.py cuts them for the site.
set -eu
cd "$(dirname "$0")/../.."
OUT=docs/screenshots
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Popup
mkdir "$WORK/popup"
cp -R "Shared (Extension)/Resources/." "$WORK/popup"
{ printf 'var MESSAGES = '; cat "Shared (Extension)/Resources/_locales/en/messages.json"; printf ';\n'; } > "$WORK/popup/stub.js"
cat >> "$WORK/popup/stub.js" <<'JS'
window.browser = {
  i18n: { getMessage: function (key) { return MESSAGES[key] ? MESSAGES[key].message : ""; } },
  storage: {
    local: { get: function () { return Promise.resolve({ enabled: true, redirectCount: 27 }); }, set: function () { return Promise.resolve(); } },
    onChanged: { addListener: function () {} }
  }
};
JS
# Headless Chrome lays out at 500 px or wider, so the popup's width is set here.
sed -i '' -e 's|<script src="mapsConverter.js">|<script src="stub.js"></script>&|' \
  -e 's|</head>|<style>body { width: 340px; min-width: 0; }</style>&|' "$WORK/popup/popup.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=3 --blink-settings=preferredColorScheme=1 --user-data-dir="$WORK/chrome" \
  --window-size=340,300 --screenshot="$PWD/$OUT/popup-raw.png" "file://$WORK/popup/popup.html" >/dev/null 2>&1

# Mac app
mkdir "$WORK/app"
cp "Shared (App)/ContentView.swift" "Shared (App)/OnboardingView.swift" "Shared (App)/Branding.swift" "$WORK/app/"
sed -e 's/@Published private(set) var state: State = .unknown/@Published private(set) var state: State = .enabled/' \
    -e '/func refresh() {/,/^    }/c\
    func refresh() {}' \
    "Shared (App)/ExtensionStatus.swift" > "$WORK/app/ExtensionStatus.swift"
cat > "$WORK/app/main.swift" <<'SWIFT'
import AppKit
import SwiftUI

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
app.applicationIconImage = NSImage(contentsOfFile: CommandLine.arguments[2])
UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")

@MainActor func render(to path: String) {
    let size = NSSize(width: 480, height: 960)
    let view = NSHostingView(rootView: ContentView().environmentObject(ExtensionStatus())
        .environment(\.controlActiveState, .key).tint(Color(red: 0.039, green: 0.518, blue: 1)))
    view.frame = NSRect(origin: .zero, size: size)
    view.wantsLayer = true
    let window = NSWindow(contentRect: view.frame, styleMask: [.borderless], backing: .buffered, defer: false)
    window.appearance = NSAppearance(named: .aqua)
    window.contentView = view
    view.layoutSubtreeIfNeeded()
    RunLoop.main.run(until: Date().addingTimeInterval(1))
    let scale: CGFloat = 3
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size.width * scale), pixelsHigh: Int(size.height * scale),
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = size
    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = context
    NSColor(white: 0.925, alpha: 1).setFill()  // A Mac window's background in light mode.
    NSRect(origin: .zero, size: size).fill()
    context.cgContext.translateBy(x: 0, y: size.height)
    context.cgContext.scaleBy(x: 1, y: -1)
    view.layer?.render(in: context.cgContext)
    NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}
MainActor.assumeIsolated { render(to: CommandLine.arguments[1]) }
SWIFT
swiftc -o "$WORK/render" "$WORK"/app/*.swift
"$WORK/render" "$PWD/$OUT/app-main-raw.png" "$PWD/docs/images/icon.png"
