import { FindByModel, FilterQuery, PaginationOptions, LookupOptions } from './QueryModels';

export interface IGenericRepository<T> {
  create(data: Partial<T>): Promise<T>;
  bulkCreate(data: Partial<T>[]): Promise<T[]>;
  get(id: string): Promise<T | null>;
  getBy(params: FindByModel[]): Promise<T | null>;
  list(pagination?: PaginationOptions): Promise<T[]>;
  find(filterQueries: FilterQuery[], pagination?: PaginationOptions): Promise<T[]>;
  findBy(params: FindByModel[], pagination?: PaginationOptions): Promise<T[]>;
  findByPartial(params: FindByModel[], fields: string[], pagination?: PaginationOptions): Promise<Partial<T>[]>;
  update(data: T, createIfNonExist?: boolean): Promise<void>;
  updatePartial(id: string, updates: Partial<T>): Promise<void>;
  updateBy(params: FindByModel[], data: Record<string, any>): Promise<number>;
  incrementBy(params: FindByModel[] | null, increments: Record<string, number>): Promise<number>;
  delete(id: string): Promise<T | null>;
  deleteBy(params: FindByModel[]): Promise<number>;
  count(params?: FindByModel[]): Promise<number>;
  textSearch(searchTerm: string, offset?: number, limit?: number): Promise<T[]>;
  lookup(options: LookupOptions): Promise<any[]>;
  lookupOne(options: LookupOptions): Promise<any[]>;
}
