import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:{{PACKAGE_NAME}}/core/stt/stt_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class SpeechToTextAdapter implements SttServicePort {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isAvailable = false;
  final String _defaultLocale = '{{STT_LOCALE_ID}}';

  @override
  bool get isListening => _speech.isListening;

  @override
  bool get isAvailable => _isAvailable;

  @override
  Future<bool> initialize() async {
    try {
      _isAvailable = await _speech.initialize(
        onStatus: (status) => LogHelper.debug('STT Status: $status', tag: 'STT'),
        onError: (errorNotification) => LogHelper.error('STT Error: ${errorNotification.errorMsg}', tag: 'STT'),
      );
      LogHelper.info('SpeechToText initialized (available: $_isAvailable)', tag: 'STT');
      return _isAvailable;
    } catch (e, st) {
      LogHelper.error('Failed to initialize SpeechToText', error: e, stackTrace: st, tag: 'STT');
      return false;
    }
  }

  @override
  Future<void> startListening({required Function(String recognizedWords) onResult, String? localeId}) async {
    if (!_isAvailable) {
      await initialize();
    }
    if (_isAvailable) {
      await _speech.listen(
        listenOptions: stt.SpeechListenOptions(localeId: localeId ?? _defaultLocale),
        onResult: (result) {
          onResult(result.recognizedWords);
        },
      );
    }
  }

  @override
  Future<void> stopListening() async {
    await _speech.stop();
  }

  @override
  Future<void> cancelListening() async {
    await _speech.cancel();
  }
}
