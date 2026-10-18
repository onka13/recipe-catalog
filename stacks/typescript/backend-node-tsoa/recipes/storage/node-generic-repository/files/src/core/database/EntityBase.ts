export enum EntityStatus {
  Active = 1,
  Deleted = 2,
  PendingDeletion = 3,
  Archived = 4
}

export interface IEntityBase {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISoftDeletable {
  status?: EntityStatus;
  deletedAt?: Date | null;
}

export interface ITenantScoped {
  tenantId: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
}
