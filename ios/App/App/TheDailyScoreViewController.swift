import Capacitor

class TheDailyScoreViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InstagramStoriesPlugin())
    }
}
