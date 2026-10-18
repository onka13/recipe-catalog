import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:{{PACKAGE_NAME}}/core/ads/ad_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class AdMobServiceAdapter implements AdServicePort {
  bool _initialized = false;
  InterstitialAd? _interstitialAd;

  @override
  bool get isInitialized => _initialized;

  @override
  Future<void> initialize() async {
    try {
      await MobileAds.instance.initialize();
      _initialized = true;
      LogHelper.info('Google AdMob SDK initialized', tag: 'ADS');
      _loadInterstitialAd();
    } catch (e, st) {
      LogHelper.error('AdMob initialization error', error: e, stackTrace: st, tag: 'ADS');
    }
  }

  void _loadInterstitialAd() {
    InterstitialAd.load(
      adUnitId: '{{ADMOB_INTERSTITIAL_UNIT_ID}}',
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) => _interstitialAd = ad,
        onAdFailedToLoad: (error) {
          LogHelper.warning('Interstitial ad failed to load: ${error.message}', tag: 'ADS');
          _interstitialAd = null;
        },
      ),
    );
  }

  @override
  Future<bool> showInterstitialAd() async {
    if (_interstitialAd == null) {
      LogHelper.warning('Interstitial ad not ready, reloading', tag: 'ADS');
      _loadInterstitialAd();
      return false;
    }

    _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        _loadInterstitialAd();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        _loadInterstitialAd();
      },
    );

    await _interstitialAd!.show();
    return true;
  }
}
