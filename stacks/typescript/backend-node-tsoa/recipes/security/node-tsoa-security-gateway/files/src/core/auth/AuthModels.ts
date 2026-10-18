export interface TenantInfo {
  id: string;
  name: string;
  appId?: number;
  user?: any;
  userState?: any;
  [key: string]: any;
}

export interface AdminTokenPayload {
  id: string;
  email: string;
  roles: string[];
  tenantId?: string;
}

export interface DecodedAuthToken {
  uid: string;
  email?: string;
  [key: string]: any;
}
