abstract interface class AdServicePort {
  Future<void> initialize();
  Future<bool> showInterstitialAd();
  bool get isInitialized;
}
