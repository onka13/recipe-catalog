export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AppError extends Error {
  public readonly isAppError = true;

  constructor(
    public readonly message: string,
    public readonly code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public readonly statusCode: number = 500,
    public readonly details: any = null
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(entityName: string, identifier?: string | number) {
    const msg = identifier ? `${entityName} with ID '${identifier}' was not found.` : `${entityName} not found.`;
    super(msg, ErrorCode.NOT_FOUND, 404, { entityName, identifier });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required.') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied.') {
    super(message, ErrorCode.FORBIDDEN, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, ErrorCode.CONFLICT, 409, details);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500, originalError ? { original: String(originalError) } : null);
    this.name = 'DatabaseError';
  }
}
