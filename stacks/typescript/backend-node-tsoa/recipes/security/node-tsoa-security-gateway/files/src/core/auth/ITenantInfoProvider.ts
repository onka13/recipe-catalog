import { DecodedAuthToken, TenantInfo } from './AuthModels';

export interface ITenantInfoProvider {
  initializeTenantInfo(appId: number, decodedToken: DecodedAuthToken): Promise<TenantInfo>;
}
