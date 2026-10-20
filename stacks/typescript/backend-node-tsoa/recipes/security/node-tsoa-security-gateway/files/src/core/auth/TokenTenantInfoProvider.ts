import { DecodedAuthToken, TenantInfo } from './AuthModels';
import { ITenantInfoProvider } from './ITenantInfoProvider';

/** The signed-in Firebase user is the tenant. Replace it with the project's own provider once tenants are stored records. */
export class TokenTenantInfoProvider implements ITenantInfoProvider {
  public async initializeTenantInfo(appId: number, decodedToken: DecodedAuthToken): Promise<TenantInfo> {
    return {
      id: decodedToken.uid,
      name: decodedToken.email ?? decodedToken.uid,
      appId,
      user: { id: decodedToken.uid, email: decodedToken.email }
    };
  }
}
