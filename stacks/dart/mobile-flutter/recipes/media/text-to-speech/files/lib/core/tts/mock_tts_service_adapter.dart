import 'package:{{PACKAGE_NAME}}/core/tts/tts_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class MockTtsServiceAdapter implements TtsServicePort {
  bool _isSpeaking = false;

  @override
  bool get isSpeaking => _isSpeaking;

  @override
  Future<void> init() async {
    LogHelper.info('Mock TTS Service initialized (test mode)', tag: 'TTS');
  }

  @override
  Future<void> speak(String text) async {
    _isSpeaking = true;
    LogHelper.info('Mock TTS speaking: "$text"', tag: 'TTS');
    await Future.delayed(const Duration(milliseconds: 500));
    _isSpeaking = false;
  }

  @override
  Future<void> stop() async {
    _isSpeaking = false;
    LogHelper.info('Mock TTS stopped', tag: 'TTS');
  }

  @override
  Future<void> pause() async {
    _isSpeaking = false;
  }
}
