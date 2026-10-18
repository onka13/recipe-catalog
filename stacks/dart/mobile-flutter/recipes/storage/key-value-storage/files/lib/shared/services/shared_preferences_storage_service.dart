import 'package:shared_preferences/shared_preferences.dart';
import 'package:{{PACKAGE_NAME}}/core/storage/storage_service_port.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class SharedPreferencesStorageService implements StorageServicePort {
  SharedPreferences? _prefs;
  final String _prefix = '{{STORAGE_KEY_PREFIX}}';

  @override
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    LogHelper.info('SharedPreferences storage initialized', tag: 'STORAGE');
  }

  String _prefixed(String key) => '$_prefix$key';

  @override
  Future<bool> setString(String key, String value) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.setString(_prefixed(key), value);
  }

  @override
  String? getString(String key) {
    return _prefs?.getString(_prefixed(key));
  }

  @override
  Future<bool> setBool(String key, bool value) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.setBool(_prefixed(key), value);
  }

  @override
  bool? getBool(String key) {
    return _prefs?.getBool(_prefixed(key));
  }

  @override
  Future<bool> setInt(String key, int value) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.setInt(_prefixed(key), value);
  }

  @override
  int? getInt(String key) {
    return _prefs?.getInt(_prefixed(key));
  }

  @override
  Future<bool> remove(String key) async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.remove(_prefixed(key));
  }

  @override
  Future<bool> clear() async {
    final prefs = _prefs ?? await SharedPreferences.getInstance();
    return prefs.clear();
  }
}
