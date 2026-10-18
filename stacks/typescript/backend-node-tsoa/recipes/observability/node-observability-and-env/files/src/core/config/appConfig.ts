/**
 * Canonical Enterprise Environment Names.
 * Mapped from industry standards across cloud providers (AWS, GCP, Vercel).
 */
export type EnvironmentName = 'dev' | 'test' | 'staging' | 'prod' | 'demo';

function resolveEnvironmentName(): EnvironmentName {
  const raw = (process.env.NODE_ENV || '').toLowerCase().trim();
  switch (raw) {
    case 'prod':
    case 'production':
      return 'prod';
    case 'staging':
    case 'stage':
    case 'preprod':
    case 'uat':
      return 'staging';
    case 'test':
    case 'testing':
    case 'ci':
      return 'test';
    case 'demo':
    case 'sandbox':
      return 'demo';
    case 'dev':
    case 'development':
    default:
      return 'dev';
  }
}

const envName = resolveEnvironmentName();

/**
 * Single Source of Truth (SSOT) Application Configuration.
 * MANDATE: process.env must NEVER be accessed directly anywhere else in the codebase.
 * NOTE: Do not populate arbitrary speculative sample keys here; only declare real,
 * typed platform parameters and lifecycle flags.
 */
export const appConfig = {
  envName,
  isDev: envName === 'dev',
  isTest: envName === 'test',
  isStaging: envName === 'staging',
  isProd: envName === 'prod',
  isDemo: envName === 'demo',
  isEmulator: process.env.FUNCTIONS_EMULATOR === 'true',
  isDryRun: process.env.DRY_RUN === 'true' || envName === 'demo',
  port: parseInt(process.env.PORT || '{{DEFAULT_PORT}}', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000'
} as const;

export type AppConfig = typeof appConfig;
