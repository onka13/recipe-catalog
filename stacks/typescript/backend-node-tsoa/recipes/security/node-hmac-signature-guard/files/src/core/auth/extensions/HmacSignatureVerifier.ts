import crypto from 'crypto';
import { Request } from 'express';
import { UnauthorizedError } from '../../errors/AppError';

export interface HmacVerificationOptions {
  secretKey?: string;
  toleranceSeconds?: number;
}

export class HmacSignatureVerifier {
  private static readonly DEFAULT_TOLERANCE_SECONDS = 300; // 5 minutes

  /**
   * Verifies incoming request HMAC-SHA256 signature and timestamp freshness window.
   */
  public static verify(request: Request, options: HmacVerificationOptions = {}): void {
    if (process.env.HMAC_VERIFICATION_DISABLED === 'true') {
      return;
    }

    const signature = (request.headers['x-signature'] as string) || (request.headers['X-Signature'] as string);
    const timestamp = (request.headers['x-timestamp'] as string) || (request.headers['X-Timestamp'] as string);

    if (!signature || !timestamp) {
      throw new UnauthorizedError('HMAC signature and timestamp headers (x-signature, x-timestamp) are required');
    }

    // 1. Anti-Replay: Check timestamp freshness
    const reqTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const tolerance = options.toleranceSeconds || this.DEFAULT_TOLERANCE_SECONDS;

    if (isNaN(reqTime) || Math.abs(now - reqTime) > tolerance) {
      throw new UnauthorizedError('Request signature timestamp expired or out of allowed window');
    }

    // 2. Compute expected HMAC hash: METHOD + PATH + TIMESTAMP + BODY
    const secret = options.secretKey || process.env.HMAC_SECRET_KEY || '{{HMAC_SECRET_KEY}}';
    const method = (request.method || 'GET').toUpperCase();
    const path = request.originalUrl || request.url || '/';
    const bodyString = request.body ? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body)) : '';

    const payloadToSign = `${method}:${path}:${timestamp}:${bodyString}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');

    // 3. Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedError('HMAC request signature verification failed: Payload was tampered or invalid secret');
    }
  }
}
