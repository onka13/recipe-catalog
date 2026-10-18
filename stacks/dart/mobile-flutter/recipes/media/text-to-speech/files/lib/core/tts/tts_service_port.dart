abstract interface class TtsServicePort {
  Future<void> init();
  Future<void> speak(String text);
  Future<void> stop();
  Future<void> pause();
  bool get isSpeaking;
}
