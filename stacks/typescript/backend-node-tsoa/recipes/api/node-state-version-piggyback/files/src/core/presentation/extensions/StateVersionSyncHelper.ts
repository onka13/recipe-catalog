import { Request } from 'express';
import { RequestContext } from '../../context/RequestContext';
import { IVersionedEntity, IStateVersionMetadata } from './StateVersionModels';

const UPDATED_USER_KEY = 'state_sync_updated_user';
const UPDATED_USER_STATE_KEY = 'state_sync_updated_user_state';

export class StateVersionSyncHelper {
  /**
   * Records updated User entity in RequestContext for automatic response piggybacking.
   */
  public static userChanged(newUser: IVersionedEntity): void {
    RequestContext.set(UPDATED_USER_KEY, newUser);
  }

  /**
   * Records updated UserState entity in RequestContext for automatic response piggybacking.
   */
  public static userStateChanged(newUserState: IVersionedEntity): void {
    RequestContext.set(UPDATED_USER_STATE_KEY, newUserState);
  }

  public static getUpdatedUser(): IVersionedEntity | undefined {
    return RequestContext.get<IVersionedEntity>(UPDATED_USER_KEY);
  }

  public static getUpdatedUserState(): IVersionedEntity | undefined {
    return RequestContext.get<IVersionedEntity>(UPDATED_USER_STATE_KEY);
  }

  /**
   * Computes piggyback response metadata by comparing client request headers against server versions.
   */
  public static computePiggybackMetadata(req?: Request, tenantInfo?: any): IStateVersionMetadata {
    const extras: IStateVersionMetadata = {};
    if (!req) return extras;

    const updatedUser = this.getUpdatedUser();
    const updatedUserState = this.getUpdatedUserState();

    const baseUser = updatedUser || tenantInfo?.User || tenantInfo?.user;
    const baseUserState = updatedUserState || tenantInfo?.UserState || tenantInfo?.userState;

    const serverUserVersion = baseUser?.dataVersion ?? baseUser?.DataVersion ?? 1;
    const serverUserStateVersion = baseUserState?.dataVersion ?? baseUserState?.DataVersion ?? 1;

    const clientUserVersion = parseInt(String(req.headers['x-user-data-version'] || '0'), 10) || 0;
    const clientUserStateVersion = parseInt(String(req.headers['x-user-state-data-version'] || '0'), 10) || 0;

    // Piggyback updated user if mutated during request OR if client is on an older version
    if (updatedUser || (baseUser && serverUserVersion > clientUserVersion)) {
      extras.user = updatedUser ?? baseUser;
    }

    // Piggyback updated userState if mutated during request OR if client is on an older version
    if (updatedUserState || (baseUserState && serverUserStateVersion > clientUserStateVersion)) {
      extras.userState = updatedUserState ?? baseUserState;
    }

    const customReq = req as any;
    if (customReq.systemData) {
      extras.systemData = customReq.systemData;
    }
    if (customReq.systemDataVersion) {
      extras.systemDataVersion = customReq.systemDataVersion;
    }

    return extras;
  }
}
