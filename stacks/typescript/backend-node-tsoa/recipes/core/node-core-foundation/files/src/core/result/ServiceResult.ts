import { AppError } from '../errors/AppError';

export type ServiceResult<T, E extends Error = AppError> = ResultOk<T> | ResultFail<E>;

export class ResultOk<T> {
  public readonly isSuccess = true;
  public readonly isFailure = false;

  constructor(public readonly data: T) {}

  public get dataOrNull(): T {
    return this.data;
  }

  public get errorOrNull(): null {
    return null;
  }

  public map<U>(fn: (data: T) => U): ServiceResult<U, any> {
    return new ResultOk(fn(this.data));
  }

  public flatMap<U, E extends Error>(fn: (data: T) => ServiceResult<U, E>): ServiceResult<U, E> {
    return fn(this.data);
  }

  public when<R>(matchers: { success: (data: T) => R; failure: (error: any) => R }): R {
    return matchers.success(this.data);
  }
}

export class ResultFail<E extends Error = AppError> {
  public readonly isSuccess = false;
  public readonly isFailure = true;

  constructor(public readonly error: E) {}

  public get dataOrNull(): null {
    return null;
  }

  public get errorOrNull(): E {
    return this.error;
  }

  public map<U>(_fn: (data: any) => U): ServiceResult<U, E> {
    return this as any;
  }

  public flatMap<U>(_fn: (data: any) => ServiceResult<U, any>): ServiceResult<U, E> {
    return this as any;
  }

  public when<R>(matchers: { success: (data: any) => R; failure: (error: E) => R }): R {
    return matchers.failure(this.error);
  }
}

export function ok<T>(data: T): ResultOk<T> {
  return new ResultOk(data);
}

export function fail<E extends Error>(error: E): ResultFail<E> {
  return new ResultFail(error);
}
