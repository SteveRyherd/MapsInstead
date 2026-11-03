import Foundation
import Combine
#if os(macOS)
import AppKit
import SafariServices
#else
import UIKit
#endif

/// Reports whether the Safari extension is enabled and opens Safari-related things.
///
/// macOS has a real API for this (SFSafariExtensionManager). iOS has none, so the app can only
/// point the user at Settings and let them verify with the "Test it" button.
@MainActor
final class ExtensionStatus: ObservableObject {
    enum State: Equatable {
        case unknown
        case enabled
        case disabled
        case unavailable   // platform has no API (iOS, iPadOS)
        case error(String)
    }

    @Published private(set) var state: State = .unknown
    @Published private(set) var lastChecked: Date?

    private var observers: [Any] = []

    init() {
        #if os(macOS)
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: NSApplication.didBecomeActiveNotification,
                                            object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        })
        #else
        state = .unavailable
        #endif
    }

    deinit {
        for observer in observers {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    var isSupported: Bool {
        #if os(macOS)
        return true
        #else
        return false
        #endif
    }

    func refresh() {
        #if os(macOS)
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: Branding.extensionBundleIdentifier) { [weak self] extensionState, error in
            Task { @MainActor in
                guard let self else { return }
                self.lastChecked = Date()
                if let error {
                    self.state = .error(error.localizedDescription)
                } else if let extensionState {
                    self.state = extensionState.isEnabled ? .enabled : .disabled
                } else {
                    self.state = .unknown
                }
            }
        }
        #endif
    }

    /// macOS: opens Safari > Settings > Extensions with this extension selected.
    func openSafariExtensionPreferences() {
        #if os(macOS)
        SFSafariApplication.showPreferencesForExtension(withIdentifier: Branding.extensionBundleIdentifier) { _ in }
        #endif
    }

    /// Opens the sample Google Maps directions link so the user can watch the redirect happen.
    func openTestLink() {
        open(Branding.testURL, preferSafari: true)
    }

    func open(_ url: URL, preferSafari: Bool = false) {
        #if os(macOS)
        if preferSafari,
           let safari = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Safari") {
            NSWorkspace.shared.open([url], withApplicationAt: safari,
                                    configuration: NSWorkspace.OpenConfiguration()) { _, _ in }
        } else {
            NSWorkspace.shared.open(url)
        }
        #else
        UIApplication.shared.open(url)
        #endif
    }
}
