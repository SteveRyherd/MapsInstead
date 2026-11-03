import SwiftUI

@main
struct DetourApp: App {
    @StateObject private var status = ExtensionStatus()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(status)
                #if os(macOS)
                .frame(minWidth: 440, idealWidth: 480, minHeight: 600, idealHeight: 680)
                #endif
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) { }
        }
        #endif
    }
}
