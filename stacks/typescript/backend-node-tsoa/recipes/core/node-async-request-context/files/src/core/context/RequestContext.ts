import { AsyncLocalStorage } from 'async_hooks';

export interface IRequestState {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  isTestLab?: boolean;
  [key: string]: any;
}

export const requestContextStorage = new AsyncLocalStorage<IRequestState>();

export class RequestContext {
  public static getStore(): IRequestState | undefined {
    return requestContextStorage.getStore();
  }

  public static get<T = any>(key: string): T | undefined {
    const store = requestContextStorage.getStore();
    return store ? (store[key] as T) : undefined;
  }

  public static set<T = any>(key: string, value: T): void {
    const store = requestContextStorage.getStore();
    if (store) {
      store[key] = value;
    }
  }

  public static getCorrelationId(): string | undefined {
    return this.get<string>('correlationId');
  }

  public static getTenantId(): string | undefined {
    return this.get<string>('tenantId');
  }

  public static getUserId(): string | undefined {
    return this.get<string>('userId');
  }

  public static isTestLab(): boolean {
    return Boolean(this.get<boolean>('isTestLab'));
  }
}
