abstract class Failure {
  final String message;
  final String? code;
  final Object? cause;

  const Failure(this.message, {this.code, this.cause});

  @override
  String toString() => 'Failure(message: $message, code: $code)';
}

class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.code, super.cause});
}

class StorageFailure extends Failure {
  const StorageFailure(super.message, {super.code, super.cause});
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message, {super.code, super.cause});
}

class UnexpectedFailure extends Failure {
  const UnexpectedFailure([super.message = 'An unexpected error occurred', Object? cause]) : super(cause: cause);
}
