import SwiftUI

/// First-launch walkthrough: welcome, enable the extension, allow Google sites, test it.
struct OnboardingView: View {
    @EnvironmentObject private var status: ExtensionStatus
    @Environment(\.dismiss) private var dismiss
    @State private var page = 0

    private let pageCount = 4

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(Copy.skip) { finish() }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
            }
            .padding([.top, .horizontal])

            Group {
                switch page {
                case 0: welcome
                case 1: enable
                case 2: permission
                default: test
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.horizontal, 24)
            .id(page)
            .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                    removal: .move(edge: .leading).combined(with: .opacity)))

            pageIndicator
                .padding(.bottom, 12)

            HStack {
                if page > 0 {
                    Button(Copy.back) { withAnimation { page -= 1 } }
                        .buttonStyle(.bordered)
                }
                Spacer()
                Button(page == pageCount - 1 ? Copy.done : Copy.next) {
                    if page == pageCount - 1 { finish() } else { withAnimation { page += 1 } }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
            }
            .padding([.horizontal, .bottom], 24)
        }
        #if os(macOS)
        .frame(width: 440, height: 560)
        #endif
        .interactiveDismissDisabled(false)
    }

    private func finish() {
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        dismiss()
    }

    // MARK: Pages

    private var welcome: some View {
        VStack(spacing: 20) {
            AppIconView(size: 96)
                .padding(.top, 24)
            Text(Copy.welcomeTitle)
                .font(.title.bold())
                .multilineTextAlignment(.center)
            Text(Copy.welcomeBody)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Label(Copy.privacyPromise, systemImage: "lock.shield")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.top, 8)
        }
    }

    private var enable: some View {
        StepsPage(symbol: "puzzlepiece.extension",
                  title: Copy.enableTitle,
                  steps: Copy.enableSteps,
                  footnote: Copy.enableFootnote) {
            #if os(macOS)
            Button(Copy.openSafariSettings) { status.openSafariExtensionPreferences() }
                .buttonStyle(.bordered)
            #endif
        }
    }

    private var permission: some View {
        StepsPage(symbol: "checkmark.shield",
                  title: Copy.permissionTitle,
                  steps: Copy.permissionSteps,
                  footnote: Copy.permissionFootnote) { EmptyView() }
    }

    private var test: some View {
        VStack(spacing: 20) {
            Image(systemName: "map")
                .font(.system(size: 56))
                .foregroundStyle(Color.accentColor)
                .padding(.top, 24)
            Text(Copy.testTitle)
                .font(.title.bold())
            Text(Copy.testBody)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button {
                status.openTestLink()
            } label: {
                Label(Copy.testButton, systemImage: "arrow.triangle.turn.up.right.diamond")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            Text(Copy.testFootnote)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var pageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<pageCount, id: \.self) { index in
                Circle()
                    .fill(index == page ? Color.accentColor : Color.secondary.opacity(0.3))
                    .frame(width: 8, height: 8)
            }
        }
        .accessibilityLabel("Page \(page + 1) of \(pageCount)")
    }
}

/// A numbered list of instructions with an optional action below it.
struct StepsPage<Action: View>: View {
    let symbol: String
    let title: String
    let steps: [String]
    let footnote: String
    @ViewBuilder let action: () -> Action

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Spacer()
                Image(systemName: symbol)
                    .font(.system(size: 48))
                    .foregroundStyle(Color.accentColor)
                Spacer()
            }
            .padding(.top, 24)
            Text(title)
                .font(.title.bold())
                .frame(maxWidth: .infinity, alignment: .center)
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text("\(index + 1)")
                            .font(.headline.monospacedDigit())
                            .frame(width: 26, height: 26)
                            .background(Color.accentColor.opacity(0.15), in: Circle())
                        Text(step)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            HStack { Spacer(); action(); Spacer() }
            Text(footnote)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Shows the app icon from the asset catalog with rounded corners.
struct AppIconView: View {
    var size: CGFloat

    var body: some View {
        Group {
            #if os(macOS)
            Image(nsImage: NSApplication.shared.applicationIconImage)
                .resizable()
            #else
            if let icon = Self.primaryIcon {
                Image(uiImage: icon).resizable()
            } else {
                RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
                    .fill(Color.accentColor)
                    .overlay(Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                        .font(.system(size: size * 0.5)).foregroundStyle(.white))
            }
            #endif
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.22, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
    }

    #if os(iOS)
    private static var primaryIcon: UIImage? {
        guard let icons = Bundle.main.object(forInfoDictionaryKey: "CFBundleIcons") as? [String: Any],
              let primary = icons["CFBundlePrimaryIcon"] as? [String: Any],
              let files = primary["CFBundleIconFiles"] as? [String],
              let last = files.last else { return nil }
        return UIImage(named: last)
    }
    #endif
}
