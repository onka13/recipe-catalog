export type WhereFilterOperator = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in' | 'regex' | 'exists' | 'not-exists';

export class FindByModel {
  constructor(
    public readonly fieldPath: string,
    public readonly opStr: WhereFilterOperator,
    public readonly value: any
  ) {}
}

export class FilterQuery {
  constructor(
    public readonly operator: 'AND' | 'OR',
    public readonly filters: FindByModel[]
  ) {}
}

export interface PaginationOptions {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface LookupOptions {
  foreignCollection: string;
  localField: string;
  foreignField: string;
  asField: string;
  filters?: FindByModel[];
  offset?: number;
  limit?: number;
}
