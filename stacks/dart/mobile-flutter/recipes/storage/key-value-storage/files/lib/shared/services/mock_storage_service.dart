import 'package:{{PACKAGE_NAME}}/core/storage/storage_service_port.dart';

class MockStorageService implements StorageServicePort {
  final Map<String, dynamic> _memory = {};

  @override
  Future<void> init() async {}

  @override
  Future<bool> setString(String key, String value) async {
    _memory[key] = value;
    return true;
  }

  @override
  String? getString(String key) => _memory[key] as String?;

  @override
  Future<bool> setBool(String key, bool value) async {
    _memory[key] = value;
    return true;
  }

  @override
  bool? getBool(String key) => _memory[key] as bool?;

  @override
  Future<bool> setInt(String key, int value) async {
    _memory[key] = value;
    return true;
  }

  @override
  int? getInt(String key) => _memory[key] as int?;

  @override
  Future<bool> remove(String key) async {
    _memory.remove(key);
    return true;
  }

  @override
  Future<bool> clear() async {
    _memory.clear();
    return true;
  }
}
