/**
 * Enterprise PII Masker & Data Redaction Engine.
 * Enforces KVKK, GDPR, and PCI-DSS compliance before any test snapshot or log hits disk.
 */
export class PiiMasker {
  private static readonly PAN_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g;
  private static readonly IBAN_REGEX = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g;
  private static readonly TCKN_REGEX = /\b[1-9][0-9]{10}\b/g;
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static readonly SENSITIVE_KEY_REGEX = /^(?:password|secret|token|authorization|apiKey|cvv|pin)$/i;

  public static maskString(value: string): string {
    if (!value || typeof value !== 'string') return value;
    let masked = value;
    // Mask Credit Card Numbers (preserve last 4)
    masked = masked.replace(this.PAN_REGEX, (pan) => `****-****-****-${pan.slice(-4)}`);
    // Mask IBANs (preserve first 4 and last 4)
    masked = masked.replace(this.IBAN_REGEX, (iban) => `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`);
    // Mask 11-digit National Identity (TCKN)
    masked = masked.replace(this.TCKN_REGEX, (id) => `${id.slice(0, 3)}*****${id.slice(-2)}`);
    // Mask Email addresses
    masked = masked.replace(this.EMAIL_REGEX, (email) => {
      const [local, domain] = email.split('@');
      return `${local.charAt(0)}***@${domain}`;
    });
    return masked;
  }

  public static maskObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.maskString(obj);
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObject(item));
    }

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.SENSITIVE_KEY_REGEX.test(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        result[key] = this.maskString(value);
      } else {
        result[key] = this.maskObject(value);
      }
    }
    return result;
  }
}
