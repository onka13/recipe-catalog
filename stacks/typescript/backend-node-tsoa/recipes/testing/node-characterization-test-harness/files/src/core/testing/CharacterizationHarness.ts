import { PiiMasker } from './PiiMasker';

export interface ComparisonResult {
  matches: boolean;
  statusMatch: boolean;
  differences: string[];
}

export interface CharacterizationOptions {
  ignoredKeys?: string[];
  maskPii?: boolean;
  dryRun?: boolean;
}

export class CharacterizationHarness {
  private static defaultIgnoredKeys = new Set([
    'timestamp',
    'createdAt',
    'updatedAt',
    'correlationId',
    '_id',
    'latencyMs'
  ]);

  /**
   * Sanitizes object by stripping non-deterministic runtime fields and masking PII.
   */
  public static sanitizeObject(obj: any, options: CharacterizationOptions = {}): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    const ignored = new Set([...this.defaultIgnoredKeys, ...(options.ignoredKeys || [])]);

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, options));
    }

    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (!ignored.has(key)) {
        sanitized[key] = this.sanitizeObject(obj[key], options);
      }
    }

    // Apply PII masking (default: true for compliance)
    return options.maskPii !== false ? PiiMasker.maskObject(sanitized) : sanitized;
  }

  /**
   * Compares legacy V1 response with modern V2 response and returns precise discrepancy list.
   */
  public static compareResponses(
    legacyRes: { status: number; body: any },
    modernRes: { status: number; body: any },
    options: CharacterizationOptions = {}
  ): ComparisonResult {
    const differences: string[] = [];
    const statusMatch = legacyRes.status === modernRes.status;

    if (!statusMatch) {
      differences.push(`Status mismatch: Expected ${legacyRes.status} (legacy), got ${modernRes.status} (modern)`);
    }

    const cleanLegacy = this.sanitizeObject(legacyRes.body, options);
    const cleanModern = this.sanitizeObject(modernRes.body, options);

    const legacyStr = JSON.stringify(cleanLegacy);
    const modernStr = JSON.stringify(cleanModern);

    if (legacyStr !== modernStr) {
      differences.push(`Payload mismatch:\nLegacy: ${legacyStr}\nModern: ${modernStr}`);
    }

    return {
      matches: statusMatch && differences.length === 0,
      statusMatch,
      differences
    };
  }
}
