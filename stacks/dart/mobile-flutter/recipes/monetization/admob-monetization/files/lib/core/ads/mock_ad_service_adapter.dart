import 'package:{{PACKAGE_NAME}}/core/ads/ad_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class MockAdServiceAdapter implements AdServicePort {
  bool _initialized = false;

  @override
  bool get isInitialized => _initialized;

  @override
  Future<void> initialize() async {
    _initialized = true;
    LogHelper.info('Mock Ad Service initialized (test mode)', tag: 'ADS');
  }

  @override
  Future<bool> showInterstitialAd() async {
    LogHelper.info('Mock Interstitial Ad presented successfully', tag: 'ADS');
    return true;
  }
}
