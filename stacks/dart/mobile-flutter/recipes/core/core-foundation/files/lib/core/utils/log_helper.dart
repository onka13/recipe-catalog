import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

enum LogLevel { debug, info, warning, error }

class LogHelper {
  static void debug(String message, {String tag = 'APP'}) => _log(LogLevel.debug, message, tag: tag);
  static void info(String message, {String tag = 'APP'}) => _log(LogLevel.info, message, tag: tag);
  static void warning(String message, {String tag = 'APP'}) => _log(LogLevel.warning, message, tag: tag);
  static void error(String message, {Object? error, StackTrace? stackTrace, String tag = 'APP'}) {
    _log(LogLevel.error, message, tag: tag, error: error, stackTrace: stackTrace);
  }

  static void _log(LogLevel level, String message, {String tag = 'APP', Object? error, StackTrace? stackTrace}) {
    if (kDebugMode) {
      final color = switch (level) {
        LogLevel.debug => '\x1B[34m',
        LogLevel.info => '\x1B[32m',
        LogLevel.warning => '\x1B[33m',
        LogLevel.error => '\x1B[31m',
      };
      developer.log('$color[${level.name.toUpperCase()}][$tag] $message\x1B[0m', error: error, stackTrace: stackTrace);
    }
  }
}
