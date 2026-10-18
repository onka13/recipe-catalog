export class FeatureFlags {
  private static flags: Map<string, boolean> = new Map();

  public static initialize(initialFlags: Record<string, boolean> = {}): void {
    this.flags = new Map(Object.entries(initialFlags));
  }

  public static isEnabled(flagName: string): boolean {
    // If explicitly set in process.env (e.g. FEATURE_USE_V2_AUTH=true), that takes precedence
    const envKey = `FEATURE_${flagName}`;
    if (process.env[envKey] !== undefined) {
      return process.env[envKey] === 'true' || process.env[envKey] === '1';
    }
    return this.flags.get(flagName) === true;
  }

  public static setFlag(flagName: string, enabled: boolean): void {
    this.flags.set(flagName, enabled);
  }

  public static getAll(): Record<string, boolean> {
    const res: Record<string, boolean> = {};
    this.flags.forEach((value, key) => {
      res[key] = value;
    });
    return res;
  }

  public static async executeBranch<T>({
    flagName,
    modern,
    legacy,
    onShadowMismatch
  }: {
    flagName: string;
    modern: () => Promise<T>;
    legacy: () => Promise<T>;
    onShadowMismatch?: (legacyRes: any, modernRes: any) => void;
  }): Promise<T> {
    const isV2 = this.isEnabled(flagName);
    const isShadow = this.isEnabled(`SHADOW_${flagName}`);

    if (isShadow) {
      const [legacyResult, modernResult] = await Promise.allSettled([legacy(), modern()]);
      if (legacyResult.status !== modernResult.status && onShadowMismatch) {
        onShadowMismatch(legacyResult, modernResult);
      }
      if (legacyResult.status === 'fulfilled') {
        return legacyResult.value;
      }
      throw (legacyResult as PromiseRejectedResult).reason;
    }

    return isV2 ? modern() : legacy();
  }
}
