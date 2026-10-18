abstract interface class SttServicePort {
  Future<bool> initialize();
  Future<void> startListening({required Function(String recognizedWords) onResult, String? localeId});
  Future<void> stopListening();
  Future<void> cancelListening();
  bool get isListening;
  bool get isAvailable;
}
