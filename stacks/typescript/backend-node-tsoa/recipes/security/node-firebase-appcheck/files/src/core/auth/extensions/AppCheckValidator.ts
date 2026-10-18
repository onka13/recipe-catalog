import { Request } from 'express';
import * as admin from 'firebase-admin';
import { UnauthorizedError } from '../../errors/AppError';

export class AppCheckValidator {
  /**
   * Validates Firebase App Check token from request headers.
   * Enforces device attestation (Play Integrity / App Attest) to block scrapers.
   */
  public static async validateAppCheck(request: Request, appId?: number): Promise<void> {
    // Allow bypassing in local dev/demo environments if configured
    if (process.env.APP_CHECK_DISABLED === 'true') {
      return;
    }

    const appCheckToken = (request.headers['x-firebase-appcheck'] as string) || (request.headers['X-Firebase-AppCheck'] as string);
    if (!appCheckToken || !appCheckToken.trim()) {
      throw new UnauthorizedError('Firebase App Check token is required for device verification');
    }

    try {
      if (admin.apps.length === 0) {
        admin.initializeApp();
      }
      const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);
      (request as any).appCheck = appCheckClaims;
    } catch (error: any) {
      throw new UnauthorizedError(`App Check token verification failed: ${error.message}`);
    }
  }
}
