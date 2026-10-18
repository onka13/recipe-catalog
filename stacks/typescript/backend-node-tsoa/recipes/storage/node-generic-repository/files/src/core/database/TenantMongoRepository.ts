import { IEntityBase, ITenantScoped, TenantInfo } from './EntityBase';
import { BaseMongoRepository, RepositoryOptions } from './BaseMongoRepository';
import { FindByModel, FilterQuery, PaginationOptions, LookupOptions } from './QueryModels';
import { UnauthorizedError } from '../errors/AppError';

export class TenantMongoRepository<T extends IEntityBase & ITenantScoped> extends BaseMongoRepository<T> {
  protected readonly tenant: TenantInfo;

  constructor(collectionName: string, tenant: TenantInfo, options: RepositoryOptions<T> = {}) {
    super(collectionName, options);
    if (!tenant || !tenant.id) {
      throw new UnauthorizedError('TenantContext is mandatory for TenantMongoRepository.');
    }
    this.tenant = tenant;
  }

  public get tenantId(): string {
    return this.tenant.id;
  }

  protected applyTenantFilter(filter: any): any {
    filter.tenantId = this.tenant.id;
    return filter;
  }

  protected override applySoftDeleteFilter(filter: any): any {
    super.applySoftDeleteFilter(filter);
    return this.applyTenantFilter(filter);
  }

  public override async create(data: Partial<T>): Promise<T> {
    const tenantData = {
      ...data,
      tenantId: this.tenant.id
    };
    return super.create(tenantData);
  }

  public override async bulkCreate(data: Partial<T>[]): Promise<T[]> {
    const tenantData = data.map(item => ({
      ...item,
      tenantId: this.tenant.id
    }));
    return super.bulkCreate(tenantData);
  }

  public override async updatePartial(id: string, updates: Partial<T>): Promise<void> {
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).tenantId;
    return super.updatePartial(id, cleanUpdates);
  }

  public override async lookup(options: LookupOptions): Promise<any[]> {
    const tenantFilters = [
      ...(options.filters || []),
      new FindByModel('tenantId', '==', this.tenant.id)
    ];
    return super.lookup({ ...options, filters: tenantFilters });
  }

  public override async lookupOne(options: LookupOptions): Promise<any[]> {
    const tenantFilters = [
      ...(options.filters || []),
      new FindByModel('tenantId', '==', this.tenant.id)
    ];
    return super.lookupOne({ ...options, filters: tenantFilters });
  }
}
