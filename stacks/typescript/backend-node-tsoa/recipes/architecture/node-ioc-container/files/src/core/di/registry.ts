import { container } from './Container';

/**
 * The one place where ports are bound to their adapters, for example
 * `container.register<IPaymentGateway>('IPaymentGateway', () => new StripePaymentGateway(), { singleton: true })`.
 * createServer (src/server.ts) calls it once; tests swap an adapter with container.override(token, mock) instead of
 * adding dry-run flags to business code.
 */
export function registerServices(): typeof container {
  return container;
}
