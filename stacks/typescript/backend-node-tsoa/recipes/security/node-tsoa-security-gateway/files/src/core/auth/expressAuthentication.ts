import { Request } from 'express';
import * as admin from 'firebase-admin';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { TenantInfo, AdminTokenPayload, DecodedAuthToken } from './AuthModels';
import { ITenantInfoProvider } from './ITenantInfoProvider';

let tenantInfoProviderInstance: ITenantInfoProvider | null = null;

export function setTenantInfoProvider(provider: ITenantInfoProvider): void {
  tenantInfoProviderInstance = provider;
}

function bearerToken(request: Request): string {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) {
    throw new UnauthorizedError('Bearer authorization token required');
  }
  return token;
}

async function verifyFirebaseToken(request: Request): Promise<DecodedAuthToken> {
  const token = bearerToken(request);
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    return await admin.auth().verifyIdToken(token);
  } catch (error: any) {
    throw new UnauthorizedError(`Firebase token verification failed: ${error.message}`);
  }
}

/** Admin endpoints: a verified Firebase token whose `roles` custom claim holds every required scope ('admin' when none is given). */
async function authenticateAdmin(request: Request, scopes?: string[]): Promise<AdminTokenPayload> {
  const decodedToken = await verifyFirebaseToken(request);
  const roles: string[] = Array.isArray(decodedToken.roles) ? decodedToken.roles : [];
  const required = scopes && scopes.length ? scopes : ['admin'];
  const missing = required.filter((role) => !roles.includes(role));
  if (missing.length) {
    throw new ForbiddenError(`Missing admin role(s): ${missing.join(', ')}`);
  }
  return { id: decodedToken.uid, email: decodedToken.email ?? '', roles };
}

/** App users: a verified Firebase token, resolved to its tenant by the provider set at startup. */
async function authenticateTenant(request: Request): Promise<TenantInfo> {
  if (!tenantInfoProviderInstance) {
    throw new Error('No tenant info provider: call setTenantInfoProvider() in createServer (src/server.ts).');
  }
  const appId = Number(request.headers['x-app-id']) || 1;
  const decodedToken = await verifyFirebaseToken(request);
  return tenantInfoProviderInstance.initializeTenantInfo(appId, decodedToken);
}

/**
 * TSOA expressAuthentication hook: `@Security('firebase')` for app users, `@Security('admin_rbac', [roles])` for admins.
 * The resolved identity is attached to request.user, so controllers never read tokens.
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<TenantInfo | AdminTokenPayload> {
  let user: TenantInfo | AdminTokenPayload;
  if (securityName === 'admin_rbac') {
    user = await authenticateAdmin(request, scopes);
  } else if (securityName === 'firebase') {
    user = await authenticateTenant(request);
  } else {
    throw new UnauthorizedError(`Unknown authentication scheme: ${securityName}`);
  }
  (request as any).user = user;
  return user;
}
