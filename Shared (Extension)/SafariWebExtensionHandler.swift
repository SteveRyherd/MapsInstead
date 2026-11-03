import SafariServices
import os.log

/// Native side of the Safari Web Extension.
///
/// The extension does all of its work in JavaScript and never needs native code, so this
/// handler only exists because Safari requires a principal class. It answers any message
/// with a small acknowledgement and logs nothing identifying.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        let message: Any?
        if #available(iOS 17.0, macOS 14.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }

        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@", String(describing: message))

        let response = NSExtensionItem()
        if #available(iOS 17.0, macOS 14.0, *) {
            response.userInfo = [SFExtensionMessageKey: ["ok": true]]
        } else {
            response.userInfo = ["message": ["ok": true]]
        }

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
