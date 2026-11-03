import SwiftUI

/// Main screen: live status (where the platform allows it), the setup steps, and a test button.
struct ContentView: View {
    @EnvironmentObject private var status: ExtensionStatus
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showOnboarding = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                header
                statusCard
                stepsCard
                actions
                footer
            }
            .padding(24)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        #if os(iOS)
        .background(Color(uiColor: .systemGroupedBackground))
        #endif
        .onAppear {
            status.refresh()
            if !hasCompletedOnboarding { showOnboarding = true }
        }
        .sheet(isPresented: $showOnboarding, onDismiss: { hasCompletedOnboarding = true }) {
            OnboardingView().environmentObject(status)
        }
    }

    // MARK: Sections

    private var header: some View {
        VStack(spacing: 12) {
            AppIconView(size: 80)
            Text(Copy.name)
                .font(.largeTitle.bold())
            Text(Copy.tagline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    private var statusCard: some View {
        Card(title: Copy.statusHeading, symbol: "safari") {
            HStack(alignment: .top, spacing: 12) {
                statusIcon
                VStack(alignment: .leading, spacing: 6) {
                    Text(statusText)
                        .fixedSize(horizontal: false, vertical: true)
                    if status.isSupported {
                        Button(Copy.refresh) { status.refresh() }
                            .buttonStyle(.borderless)
                            .font(.footnote)
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var stepsCard: some View {
        Card(title: Copy.enableTitle, symbol: "list.number") {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(Copy.enableSteps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("\(index + 1).").monospacedDigit().foregroundStyle(.secondary)
                        Text(step).fixedSize(horizontal: false, vertical: true)
                    }
                }
                Divider().padding(.vertical, 4)
                Text(Copy.permissionTitle).font(.headline)
                ForEach(Array(Copy.permissionSteps.enumerated()), id: \.offset) { _, step in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("•").foregroundStyle(.secondary)
                        Text(step).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    private var actions: some View {
        VStack(spacing: 12) {
            #if os(macOS)
            Button {
                status.openSafariExtensionPreferences()
            } label: {
                Label(Copy.openSafariSettings, systemImage: "gearshape")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            #endif

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

            Button(Copy.showWalkthrough) { showOnboarding = true }
                .buttonStyle(.borderless)
                .font(.footnote)
                .padding(.top, 4)
        }
    }

    private var footer: some View {
        VStack(spacing: 8) {
            Text(Copy.privacyPromise)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            HStack(spacing: 16) {
                Link(Copy.privacyLink, destination: Branding.privacyURL)
                Link(Copy.supportLink, destination: Branding.supportURL)
                Link(Copy.sourceLink, destination: Branding.sourceURL)
            }
            .font(.footnote)
            Text("Version \(Branding.version)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(.top, 8)
    }

    // MARK: Status presentation

    private var statusText: String {
        switch status.state {
        case .unknown: return Copy.statusUnknown
        case .enabled: return Copy.statusEnabled
        case .disabled: return Copy.statusDisabled
        case .unavailable: return Copy.statusUnavailable
        case .error: return Copy.statusError
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch status.state {
        case .enabled:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).font(.title2)
        case .disabled, .error:
            Image(systemName: "xmark.circle.fill").foregroundStyle(.orange).font(.title2)
        case .unknown:
            ProgressView().controlSize(.small)
        case .unavailable:
            Image(systemName: "info.circle.fill").foregroundStyle(Color.accentColor).font(.title2)
        }
    }
}

/// A grouped-style card used on the main screen.
struct Card<Content: View>: View {
    let title: String
    let symbol: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: symbol)
                .font(.headline)
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var cardBackground: some ShapeStyle {
        #if os(macOS)
        return Color(nsColor: .controlBackgroundColor)
        #else
        return Color(uiColor: .secondarySystemGroupedBackground)
        #endif
    }
}

#Preview {
    ContentView().environmentObject(ExtensionStatus())
}
