import { Controller } from 'tsoa';
import { Request } from 'express';
import { ServiceResult, ok, fail } from '../result/ServiceResult';
import { AppError, UnauthorizedError, ErrorCode } from '../errors/AppError';
import { Logger } from '../logger/Logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  tenantId?: string;
  [key: string]: any;
}

export interface TenantContext {
  id: string;
  name: string;
  displayName?: string;
  [key: string]: any;
}

export abstract class BaseController extends Controller {
  public request?: Request;

  /**
   * Retrieves authenticated tenant context synchronously.
   * Pre-validated and attached to request.user by expressAuthentication middleware.
   */
  protected getTenant(): TenantContext {
    if (!this.request) {
      throw new UnauthorizedError('Request context is not initialized');
    }
    const user = (this.request as any).user;
    if (!user || (!user.tenantId && !user.tenant)) {
      throw new UnauthorizedError('Authenticated tenant context is missing from request');
    }
    return user.tenant || { id: user.tenantId, name: user.tenantName || 'Default Tenant' };
  }

  /**
   * Retrieves authenticated user context synchronously.
   */
  protected getUser(): AuthenticatedUser {
    if (!this.request) {
      throw new UnauthorizedError('Request context is not initialized');
    }
    const user = (this.request as any).user as AuthenticatedUser;
    if (!user || !user.id) {
      throw new UnauthorizedError('Authentication required');
    }
    return user;
  }

  /**
   * Wraps successful data inside standardized ServiceResult envelope.
   * Supports optional extensible metadata (e.g. pagination, state versions).
   */
  protected successResponse<T>(data: T, meta?: Record<string, any>): ServiceResult<T> {
    this.setStatus(200);
    const result = ok(data);
    if (meta && Object.keys(meta).length > 0) {
      (result as any).meta = meta;
    }
    return result;
  }

  /**
   * Sets custom HTTP status and returns failure result.
   */
  protected failureResponse<E extends Error>(error: E, statusCode: number = 400): ServiceResult<any, E> {
    this.setStatus(statusCode);
    return fail(error);
  }

  /**
   * Standardized error logging helper.
   */
  protected logControllerError(method: string, error: any): void {
    Logger.error(`[${this.constructor.name}.${method}] Controller execution failed`, error, {
      tenantId: (this.request as any)?.user?.tenantId,
      userId: (this.request as any)?.user?.id
    });
  }
}
