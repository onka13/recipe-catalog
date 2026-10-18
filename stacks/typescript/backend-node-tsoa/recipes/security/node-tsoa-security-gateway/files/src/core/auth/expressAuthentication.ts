import { Request } from 'express';
import * as admin from 'firebase-admin';
import { UnauthorizedError } from '../errors/AppError';
import { TenantInfo, AdminTokenPayload, DecodedAuthToken } from './AuthModels';
import { ITenantInfoProvider } from './ITenantInfoProvider';

let tenantInfoProviderInstance: ITenantInfoProvider | null = null;

export function setTenantInfoProvider(provider: ITenantInfoProvider): void {
  tenantInfoProviderInstance = provider;
}

/**
 * TSOA expressAuthentication hook.
 * Validates Firebase ID tokens, resolves multi-tenant app context, and attaches
 * pre-hydrated TenantInfo to request.user.
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<TenantInfo | AdminTokenPayload> {
  if (securityName === 'admin_rbac') {
    // Admin Portal token handling
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Admin authorization header required');
    }
    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      throw new UnauthorizedError('Invalid admin token');
    }
    // Default admin payload or delegate to admin verifier
    const adminPayload: AdminTokenPayload = {
      id: 'admin_root',
      email: 'admin@platform.internal',
      roles: scopes || ['admin']
    };
    (request as any).user = adminPayload;
    return adminPayload;
  }

  if (securityName !== 'firebase') {
    throw new UnauthorizedError(`Unknown authentication scheme: ${securityName}`);
  }

  // 1. Resolve Multi-App ID from header
  const appIdHeader = (request.headers['x-app-id'] as string) || (request.headers['X-App-Id'] as string);
  const appId = Number(appIdHeader) || 1;

  // 2. Extract Bearer Token
  const authorization = (request.headers['authorization'] as string) || (request.headers['Authorization'] as string);
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new UnauthorizedError('Bearer authorization token required');
  }
  const token = authorization.split('Bearer ')[1]?.trim();
  if (!token) {
    throw new UnauthorizedError('Invalid bearer token format');
  }

  // 3. Verify Firebase ID Token
  let decodedToken: DecodedAuthToken;
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (error: any) {
    throw new UnauthorizedError(`Firebase token verification failed: ${error.message}`);
  }

  // 4. Resolve Tenant Context via Port
  let tenantInfo: TenantInfo;
  if (tenantInfoProviderInstance) {
    tenantInfo = await tenantInfoProviderInstance.initializeTenantInfo(appId, decodedToken);
  } else {
    tenantInfo = {
      id: decodedToken.uid,
      name: decodedToken.email || decodedToken.uid,
      appId,
      user: { id: decodedToken.uid, email: decodedToken.email }
    };
  }

  (request as any).user = tenantInfo;
  return tenantInfo;
}
