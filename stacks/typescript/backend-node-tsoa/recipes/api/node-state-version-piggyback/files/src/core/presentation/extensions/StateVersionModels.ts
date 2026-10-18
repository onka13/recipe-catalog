export interface IVersionedEntity {
  id?: string;
  dataVersion?: number;
  DataVersion?: number;
  [key: string]: any;
}

export interface IStateVersionMetadata {
  user?: IVersionedEntity;
  userState?: IVersionedEntity;
  systemData?: any;
  systemDataVersion?: number;
  [key: string]: any;
}
