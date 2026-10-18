import { z } from 'zod';
import { ValidationError } from '../errors/AppError';

export interface IAntiCorruptionLayerMapper<TLegacy, TDomain> {
  toDomain(legacy: TLegacy): TDomain;
  toDomainList(legacyList: TLegacy[]): TDomain[];
  toPersistence(domain: Partial<TDomain>): Partial<TLegacy>;
}

/**
 * Base Anti-Corruption Layer (ACL) Mapper.
 * Translates legacy database schemas into pristine domain entities and vice versa,
 * validating invariants and preventing legacy technical debt from polluting domain logic.
 */
export abstract class BaseAclMapper<TLegacy, TDomain> implements IAntiCorruptionLayerMapper<TLegacy, TDomain> {
  protected readonly domainSchema?: z.ZodSchema<TDomain>;

  constructor(domainSchema?: z.ZodSchema<TDomain>) {
    this.domainSchema = domainSchema;
  }

  public abstract mapLegacyToDomain(legacy: TLegacy): TDomain;
  public abstract mapDomainToLegacy(domain: Partial<TDomain>): Partial<TLegacy>;

  public toDomain(legacy: TLegacy): TDomain {
    if (!legacy) {
      throw new ValidationError('Cannot map null or undefined legacy record to domain entity');
    }
    const domainEntity = this.mapLegacyToDomain(legacy);
    if (this.domainSchema) {
      const parseResult = this.domainSchema.safeParse(domainEntity);
      if (!parseResult.success) {
        throw new ValidationError('ACL validation failed for domain entity', parseResult.error.format());
      }
    }
    return domainEntity;
  }

  public toDomainList(legacyList: TLegacy[]): TDomain[] {
    if (!Array.isArray(legacyList)) return [];
    return legacyList.map(item => this.toDomain(item));
  }

  public toPersistence(domain: Partial<TDomain>): Partial<TLegacy> {
    if (!domain) return {};
    return this.mapDomainToLegacy(domain);
  }
}
