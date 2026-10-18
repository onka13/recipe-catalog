import 'package:dio/dio.dart';
import 'package:{{PACKAGE_NAME}}/core/errors/failures.dart';
import 'package:{{PACKAGE_NAME}}/core/network/result.dart';
import 'package:{{PACKAGE_NAME}}/core/utils/log_helper.dart';

class ApiClient {
  final Dio dio;

  ApiClient({Dio? customDio})
      : dio = customDio ??
            Dio(
              BaseOptions(
                baseUrl: '{{API_BASE_URL}}',
                connectTimeout: const Duration(seconds: {{API_TIMEOUT_SECONDS}}),
                receiveTimeout: const Duration(seconds: {{API_TIMEOUT_SECONDS}}),
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          LogHelper.debug('--> ${options.method} ${options.uri}', tag: 'HTTP');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          LogHelper.debug('<-- ${response.statusCode} ${response.requestOptions.uri}', tag: 'HTTP');
          return handler.next(response);
        },
        onError: (DioException error, handler) {
          LogHelper.error('HTTP Error: ${error.message}', error: error, tag: 'HTTP');
          return handler.next(error);
        },
      ),
    );
  }

  Future<Result<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic data) parser,
  }) async {
    try {
      final response = await dio.get(path, queryParameters: queryParameters);
      return Result.success(parser(response.data));
    } on DioException catch (e) {
      return Result.failure(ServerFailure(e.message ?? 'Network error', code: e.response?.statusCode.toString(), cause: e));
    } catch (e) {
      return Result.failure(UnexpectedFailure('Failed to parse response', e));
    }
  }

  Future<Result<T>> post<T>(
    String path, {
    dynamic data,
    required T Function(dynamic data) parser,
  }) async {
    try {
      final response = await dio.post(path, data: data);
      return Result.success(parser(response.data));
    } on DioException catch (e) {
      return Result.failure(ServerFailure(e.message ?? 'Network error', code: e.response?.statusCode.toString(), cause: e));
    } catch (e) {
      return Result.failure(UnexpectedFailure('Failed to parse response', e));
    }
  }
}
