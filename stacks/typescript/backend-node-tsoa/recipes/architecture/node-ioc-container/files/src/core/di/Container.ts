export type ServiceToken<T = any> = string | symbol;
export type ServiceFactory<T = any> = (container: Container) => T;

export interface RegisterOptions {
  singleton?: boolean;
}

interface ServiceBinding<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * Zero-dependency, type-safe Inversion of Control (IoC) Container.
 * Eliminates the need for 'reflect-metadata' or invasive decorators.
 * Provides clean seam isolation for unit testing, characterization tests, and dry-run mock adapters.
 */
export class Container {
  private bindings = new Map<ServiceToken, ServiceBinding>();
  private overrides = new Map<ServiceToken, any>();

  /**
   * Registers a service factory under a token.
   */
  public register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, options: RegisterOptions = {}): this {
    this.bindings.set(token, {
      factory,
      singleton: Boolean(options.singleton)
    });
    return this;
  }

  /**
   * Resolves an instance of the service bound to the given token.
   */
  public resolve<T>(token: ServiceToken<T>): T {
    // 1. Check for explicit test/dry-run override
    if (this.overrides.has(token)) {
      return this.overrides.get(token) as T;
    }

    const binding = this.bindings.get(token);
    if (!binding) {
      throw new Error(`[IoC Container] No binding found for token: ${String(token)}. Did you forget to register it?`);
    }

    // 2. Handle Singleton caching
    if (binding.singleton) {
      if (binding.instance === undefined) {
        binding.instance = binding.factory(this);
      }
      return binding.instance as T;
    }

    // 3. Transient instance creation
    return binding.factory(this) as T;
  }

  /**
   * Checks whether a token is registered in the container.
   */
  public has(token: ServiceToken): boolean {
    return this.overrides.has(token) || this.bindings.has(token);
  }

  /**
   * Overrides a service token with a specific mock or dry-run instance.
   * Ideal for automated characterization tests and side-effect isolation.
   */
  public override<T>(token: ServiceToken<T>, mockInstance: T): this {
    this.overrides.set(token, mockInstance);
    return this;
  }

  /**
   * Removes all overrides and clears singleton instances.
   */
  public reset(): void {
    this.overrides.clear();
    for (const binding of this.bindings.values()) {
      delete binding.instance;
    }
  }
}

/**
 * Global application container instance.
 */
export const container = new Container();
