import Foundation

// MARK: - Identity
//
// Names and bundle identifiers come from Config/Branding.xcconfig via Info.plist, so the
// app never hard-codes its own name. Rename the product there, not here.

enum Branding {
    static let productName: String =
        info("CFBundleDisplayName") ?? info("CFBundleName") ?? "Maps Instead"

    static let extensionBundleIdentifier: String =
        info("DetourExtensionBundleIdentifier")
        ?? (Bundle.main.bundleIdentifier ?? "com.example.MapsInstead") + ".Extension"

    static let supportURL = url("DetourSupportURL", fallback: "https://mapsinstead.com/support.html")
    static let privacyURL = url("DetourPrivacyURL", fallback: "https://mapsinstead.com/privacy.html")
    static let sourceURL = url("DetourSourceURL", fallback: "https://github.com/SteveRyherd/detour")
    static let testURL = url("DetourTestURL", fallback: "https://www.google.com/maps/dir//Apple+Park,+Cupertino,+CA")

    static let version: String = {
        let short = info("CFBundleShortVersionString") ?? "1.0"
        let build = info("CFBundleVersion") ?? "1"
        return "\(short) (\(build))"
    }()

    private static func info(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
              !value.isEmpty, !value.hasPrefix("$(") else { return nil }
        return value
    }

    private static func url(_ key: String, fallback: String) -> URL {
        URL(string: info(key) ?? fallback) ?? URL(string: fallback)!
    }
}

// MARK: - User-facing copy
//
// Every string shown by the container app lives here. The extension's own strings live in
// "Shared (Extension)/Resources/_locales/en/messages.json".

enum Copy {
    static let name = Branding.productName
    static let tagline = "Google Maps links open in Apple Maps. Directions included."

    // Onboarding pages
    static let welcomeTitle = "Welcome to \(name)"
    static let welcomeBody = "Tap a Google Maps link in Safari and it opens in Apple Maps instead. Directions, places, searches and shared short links all work. Nothing is tracked, nothing leaves your device."

    static let enableTitle = "Turn on the extension"
    #if os(macOS)
    static let enableSteps = [
        "Open Safari.",
        "Choose Safari > Settings… and click Extensions.",
        "Tick \"\(name)\" in the list on the left."
    ]
    static let enableFootnote = "The status card on the main screen updates as soon as Safari reports the extension is on."
    #else
    static let enableSteps = [
        "Open Settings on this device.",
        "Go to Apps > Safari > Extensions. On iOS 17 and earlier it is Settings > Safari > Extensions.",
        "Tap \"\(name)\" and turn on Allow Extension."
    ]
    static let enableFootnote = "iOS does not let apps open Safari's extension settings directly, so these are the exact taps."
    #endif

    static let permissionTitle = "Allow it on Google sites"
    #if os(macOS)
    static let permissionSteps = [
        "With \"\(name)\" selected in Safari's Extensions settings, click Edit Websites… or Always Allow on Every Website.",
        "Alternatively, the first time you open a Google page Safari shows a prompt. Choose Always Allow."
    ]
    #else
    static let permissionSteps = [
        "On the \"\(name)\" page in Settings, under Permissions, set google.com and the other Google sites to Allow.",
        "Or wait for Safari to ask the first time you open a Google page, then choose Always Allow."
    ]
    #endif
    static let permissionFootnote = "\"\(name)\" only asks for Google domains and Google's short-link domains. It cannot see any other website."

    static let testTitle = "Try it"
    static let testBody = "This opens a real Google Maps directions link in Safari. If the extension is on, Apple Maps opens with directions to Apple Park."
    #if os(iOS)
    static let testFootnote = "The link opens in your default browser. Safari extensions only run in Safari."
    #else
    static let testFootnote = "The link is opened in Safari even if another browser is your default."
    #endif

    // Main screen
    static let statusHeading = "Extension status"
    static let statusEnabled = "On. Google Maps links now open in Apple Maps."
    static let statusDisabled = "Off. Turn it on in Safari's Extensions settings."
    static let statusUnknown = "Checking…"
    static let statusUnavailable = "Check Settings > Apps > Safari > Extensions to see whether \"\(name)\" is on."
    static let statusError = "Safari did not report a status. Open Safari once, then come back."

    static let openSafariSettings = "Open Safari Extensions Settings"
    static let testButton = "Test it"
    static let showWalkthrough = "Show setup steps again"
    static let refresh = "Refresh"
    static let next = "Next"
    static let back = "Back"
    static let done = "Done"
    static let skip = "Skip"

    static let privacyLink = "Privacy"
    static let supportLink = "Support"
    static let sourceLink = "Source code"
    static let privacyPromise = "No analytics. No tracking. No data collected. The code is open source."
}
