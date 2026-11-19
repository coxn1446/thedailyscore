import Capacitor
import UIKit

@objc(InstagramStoriesPlugin)
public class InstagramStoriesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStoriesPlugin"
    public let jsName = "InstagramStories"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    @objc func share(_ call: CAPPluginCall) {
        guard let encoded = call.getString("image") else {
            call.reject("Could not share")
            return
        }
        let payload = encoded.contains(",") ? String(encoded.split(separator: ",").last ?? "") : encoded
        guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters), !data.isEmpty else {
            call.reject("Could not share")
            return
        }
        let appId = ((Bundle.main.object(forInfoDictionaryKey: "FacebookAppID") as? String) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard appId.range(of: "^[0-9]+$", options: .regularExpression) != nil else {
            call.reject("Could not share")
            return
        }
        guard let url = URL(string: "instagram-stories://share?source_application=\(appId)") else {
            call.reject("Could not share")
            return
        }

        DispatchQueue.main.async {
            guard UIApplication.shared.canOpenURL(url) else {
                call.reject("Instagram is not installed")
                return
            }
            UIPasteboard.general.setItems(
                [["com.instagram.sharedSticker.backgroundImage": data]],
                options: [.expirationDate: Date().addingTimeInterval(60 * 5)]
            )
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("Could not share")
                }
            }
        }
    }
}
