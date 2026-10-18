import 'package:{{PACKAGE_NAME}}/core/stt/stt_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class MockSttServiceAdapter implements SttServicePort {
  bool _isListening = false;

  @override
  bool get isListening => _isListening;

  @override
  bool get isAvailable => true;

  @override
  Future<bool> initialize() async {
    LogHelper.info('Mock STT Service initialized (test mode)', tag: 'STT');
    return true;
  }

  @override
  Future<void> startListening({required Function(String recognizedWords) onResult, String? localeId}) async {
    _isListening = true;
    LogHelper.info('Mock STT started listening', tag: 'STT');
    await Future.delayed(const Duration(milliseconds: 300));
    onResult('Sample transcribed voice command');
  }

  @override
  Future<void> stopListening() async {
    _isListening = false;
    LogHelper.info('Mock STT stopped', tag: 'STT');
  }

  @override
  Future<void> cancelListening() async {
    _isListening = false;
    LogHelper.info('Mock STT cancelled', tag: 'STT');
  }
}
