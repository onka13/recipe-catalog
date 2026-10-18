import 'package:flutter_tts/flutter_tts.dart';
import 'package:{{PACKAGE_NAME}}/core/tts/tts_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class FlutterTtsAdapter implements TtsServicePort {
  final FlutterTts _flutterTts = FlutterTts();
  bool _speaking = false;

  @override
  bool get isSpeaking => _speaking;

  @override
  Future<void> init() async {
    await _flutterTts.setLanguage('{{TTS_DEFAULT_LANGUAGE}}');
    await _flutterTts.setSpeechRate(double.tryParse('{{TTS_SPEECH_RATE}}') ?? 0.5);
    _flutterTts.setStartHandler(() => _speaking = true);
    _flutterTts.setCompletionHandler(() => _speaking = false);
    _flutterTts.setErrorHandler((msg) {
      _speaking = false;
      LogHelper.error('TTS Error: $msg', tag: 'TTS');
    });
    LogHelper.info('FlutterTts adapter initialized', tag: 'TTS');
  }

  @override
  Future<void> speak(String text) async {
    if (text.trim().isEmpty) return;
    await _flutterTts.speak(text);
  }

  @override
  Future<void> stop() async {
    await _flutterTts.stop();
    _speaking = false;
  }

  @override
  Future<void> pause() async {
    await _flutterTts.pause();
    _speaking = false;
  }
}
