import mongoose, { Collection, Document } from 'mongoose';
import { z } from 'zod';
import { IEntityBase, EntityStatus } from './EntityBase';
import { FindByModel, FilterQuery, PaginationOptions, LookupOptions, WhereFilterOperator } from './QueryModels';
import { IGenericRepository } from './IGenericRepository';
import { NotFoundError, ValidationError, DatabaseError } from '../errors/AppError';

export interface RepositoryOptions<T> {
  softDelete?: boolean;
  softDeleteField?: string;
  validator?: z.ZodSchema<T>;
}

export class BaseMongoRepository<T extends IEntityBase> implements IGenericRepository<T> {
  protected readonly collectionName: string;
  protected readonly options: Required<RepositoryOptions<T>>;

  constructor(collectionName: string, options: RepositoryOptions<T> = {}) {
    this.collectionName = collectionName;
    this.options = {
      softDelete: options.softDelete ?? false,
      softDeleteField: options.softDeleteField ?? 'status',
      validator: options.validator as any
    };
  }

  protected async getCollection(): Promise<Collection<Document>> {
    if (!mongoose.connection.db) {
      throw new DatabaseError(`MongoDB connection is not established. Cannot access collection '${this.collectionName}'`);
    }
    return mongoose.connection.db.collection(this.collectionName);
  }

  protected toMongoDoc(data: any): any {
    const { id, _id, ...rest } = data;
    const targetId = id || _id || new mongoose.Types.ObjectId().toHexString();
    return {
      _id: targetId,
      ...rest
    };
  }

  protected fromMongoDoc(doc: any): T | null {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return {
      id: typeof _id === 'object' && _id !== null ? _id.toString() : String(_id),
      ...rest
    } as T;
  }

  protected applySoftDeleteFilter(filter: any): any {
    if (this.options.softDelete) {
      filter[this.options.softDeleteField] = { $ne: EntityStatus.Deleted };
    }
    return filter;
  }

  protected convertOperator(opStr: WhereFilterOperator, value: any): any {
    switch (opStr) {
      case '==': return value;
      case '!=': return { $ne: value };
      case '>': return { $gt: value };
      case '>=': return { $gte: value };
      case '<': return { $lt: value };
      case '<=': return { $lte: value };
      case 'in': return { $in: value };
      case 'not-in': return { $nin: value };
      case 'array-contains': return { $elemMatch: { $eq: value } };
      case 'regex': return { $regex: value, $options: 'i' };
      case 'exists': return { $exists: true };
      case 'not-exists': return { $exists: false };
      default: return value;
    }
  }

  protected validate(data: any): void {
    if (this.options.validator) {
      const result = this.options.validator.safeParse(data);
      if (!result.success) {
        throw new ValidationError(`Validation failed for '${this.collectionName}'`, result.error.format());
      }
    }
  }

  public async create(data: Partial<T>): Promise<T> {
    this.validate(data);
    const collection = await this.getCollection();
    const now = new Date();
    const entryObject: any = {
      ...data,
      createdAt: now,
      updatedAt: now,
      id: data.id || new mongoose.Types.ObjectId().toHexString()
    };

    if (this.options.softDelete && entryObject[this.options.softDeleteField] === undefined) {
      entryObject[this.options.softDeleteField] = EntityStatus.Active;
    }

    const mongoDoc = this.toMongoDoc(entryObject);
    const res = await collection.insertOne(mongoDoc);
    if (!res.acknowledged) {
      throw new DatabaseError(`Failed to insert document into '${this.collectionName}'`);
    }
    return this.fromMongoDoc(mongoDoc)!;
  }

  public async bulkCreate(data: Partial<T>[]): Promise<T[]> {
    const collection = await this.getCollection();
    const now = new Date();
    const entries: T[] = [];
    const mongoEntries: any[] = [];

    for (const item of data) {
      this.validate(item);
      const entryObject: any = {
        ...item,
        createdAt: now,
        updatedAt: now,
        id: item.id || new mongoose.Types.ObjectId().toHexString()
      };
      if (this.options.softDelete && entryObject[this.options.softDeleteField] === undefined) {
        entryObject[this.options.softDeleteField] = EntityStatus.Active;
      }
      mongoEntries.push(this.toMongoDoc(entryObject));
      entries.push(entryObject as T);
    }

    if (mongoEntries.length > 0) {
      const res = await collection.insertMany(mongoEntries);
      if (!res.acknowledged) {
        throw new DatabaseError(`Failed to bulk insert into '${this.collectionName}'`);
      }
    }
    return entries;
  }

  public async get(id: string): Promise<T | null> {
    const collection = await this.getCollection();
    const filter: any = { _id: id };
    this.applySoftDeleteFilter(filter);
    const doc = await collection.findOne(filter);
    return this.fromMongoDoc(doc);
  }

  public async getBy(params: FindByModel[]): Promise<T | null> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);
    for (const param of params) {
      const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
      filter[fieldName] = this.convertOperator(param.opStr, param.value);
    }
    const doc = await collection.findOne(filter);
    return this.fromMongoDoc(doc);
  }

  public async list(pagination?: PaginationOptions): Promise<T[]> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);
    let cursor = collection.find(filter);

    if (pagination?.offset && pagination.offset > 0) cursor = cursor.skip(pagination.offset);
    if (pagination?.limit && pagination.limit > 0) cursor = cursor.limit(pagination.limit);

    if (pagination?.orderBy) {
      const dir = pagination.orderDirection === 'asc' ? 1 : -1;
      cursor = cursor.sort({ [pagination.orderBy]: dir });
    } else {
      cursor = cursor.sort({ _id: -1 });
    }

    const docs = await cursor.toArray();
    return docs.map(d => this.fromMongoDoc(d)!);
  }

  public async find(filterQueries: FilterQuery[], pagination?: PaginationOptions): Promise<T[]> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);

    for (const filterQuery of filterQueries) {
      const conditions = filterQuery.filters.map(param => {
        const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
        return { [fieldName]: this.convertOperator(param.opStr, param.value) };
      });
      if (filterQuery.operator === 'AND' && conditions.length > 0) {
        filter.$and = filter.$and ? [...filter.$and, ...conditions] : conditions;
      } else if (filterQuery.operator === 'OR' && conditions.length > 0) {
        filter.$or = filter.$or ? [...filter.$or, ...conditions] : conditions;
      }
    }

    let cursor = collection.find(filter);
    if (pagination?.offset && pagination.offset > 0) cursor = cursor.skip(pagination.offset);
    if (pagination?.limit && pagination.limit > 0) cursor = cursor.limit(pagination.limit);
    if (pagination?.orderBy) {
      const dir = pagination.orderDirection === 'asc' ? 1 : -1;
      cursor = cursor.sort({ [pagination.orderBy]: dir });
    } else {
      cursor = cursor.sort({ _id: -1 });
    }

    const docs = await cursor.toArray();
    return docs.map(d => this.fromMongoDoc(d)!);
  }

  public async findBy(params: FindByModel[], pagination?: PaginationOptions): Promise<T[]> {
    return this.find([{ operator: 'AND', filters: params }], pagination);
  }

  public async findByPartial(params: FindByModel[], fields: string[], pagination?: PaginationOptions): Promise<Partial<T>[]> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);
    for (const param of params) {
      const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
      filter[fieldName] = this.convertOperator(param.opStr, param.value);
    }

    const projection: Record<string, number> = {};
    for (const f of fields) {
      const key = f === 'id' ? '_id' : f;
      projection[key] = 1;
    }

    let cursor = collection.find(filter, { projection });
    if (pagination?.offset && pagination.offset > 0) cursor = cursor.skip(pagination.offset);
    if (pagination?.limit && pagination.limit > 0) cursor = cursor.limit(pagination.limit);
    if (pagination?.orderBy) {
      const dir = pagination.orderDirection === 'asc' ? 1 : -1;
      cursor = cursor.sort({ [pagination.orderBy]: dir });
    } else {
      cursor = cursor.sort({ _id: -1 });
    }

    const docs = await cursor.toArray();
    return docs.map(d => this.fromMongoDoc(d) as Partial<T>);
  }

  public async update(data: T, createIfNonExist: boolean = false): Promise<void> {
    this.validate(data);
    const collection = await this.getCollection();
    const filter: any = { _id: data.id };
    this.applySoftDeleteFilter(filter);

    const existing = await collection.findOne(filter);
    if (!existing) {
      if (!createIfNonExist) {
        throw new NotFoundError(this.collectionName, data.id);
      }
      await this.create(data);
      return;
    }

    const { id, _id, ...setFields } = this.toMongoDoc(data);
    setFields.updatedAt = new Date();
    const res = await collection.updateOne(filter, { $set: setFields });
    if (res.matchedCount === 0) {
      throw new NotFoundError(this.collectionName, data.id);
    }
  }

  public async updatePartial(id: string, updates: Partial<T>): Promise<void> {
    const collection = await this.getCollection();
    const filter: any = { _id: id };
    this.applySoftDeleteFilter(filter);

    const rawUpdates = { ...updates } as Record<string, any>;
    delete rawUpdates.id;
    delete rawUpdates._id;
    rawUpdates.updatedAt = new Date();

    const res = await collection.updateOne(filter, { $set: rawUpdates });
    if (res.matchedCount === 0) {
      throw new NotFoundError(this.collectionName, id);
    }
  }

  public async updateBy(params: FindByModel[], data: Record<string, any>): Promise<number> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);
    for (const param of params) {
      const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
      filter[fieldName] = this.convertOperator(param.opStr, param.value);
    }
    const res = await collection.updateMany(filter, { $set: { ...data, updatedAt: new Date() } });
    return res.modifiedCount;
  }

  public async incrementBy(params: FindByModel[] | null, increments: Record<string, number>): Promise<number> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);
    if (params) {
      for (const param of params) {
        const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
        filter[fieldName] = this.convertOperator(param.opStr, param.value);
      }
    }
    const res = await collection.updateMany(filter, { $inc: increments });
    return res.modifiedCount;
  }

  public async delete(id: string): Promise<T | null> {
    const collection = await this.getCollection();
    const filter: any = { _id: id };
    this.applySoftDeleteFilter(filter);

    const existing = await collection.findOne(filter);
    if (!existing) {
      throw new NotFoundError(this.collectionName, id);
    }

    if (this.options.softDelete) {
      await collection.updateOne({ _id: id }, {
        $set: {
          [this.options.softDeleteField]: EntityStatus.Deleted,
          deletedAt: new Date()
        }
      });
      return this.fromMongoDoc({ ...existing, [this.options.softDeleteField]: EntityStatus.Deleted });
    } else {
      await collection.deleteOne({ _id: id });
      return this.fromMongoDoc(existing);
    }
  }

  public async deleteBy(params: FindByModel[]): Promise<number> {
    const collection = await this.getCollection();
    const filter: any = {};
    for (const param of params) {
      const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
      filter[fieldName] = this.convertOperator(param.opStr, param.value);
    }

    if (this.options.softDelete) {
      const res = await collection.updateMany(filter, {
        $set: {
          [this.options.softDeleteField]: EntityStatus.Deleted,
          deletedAt: new Date()
        }
      });
      return res.modifiedCount;
    } else {
      const res = await collection.deleteMany(filter);
      return res.deletedCount;
    }
  }

  public async count(params: FindByModel[] = []): Promise<number> {
    const collection = await this.getCollection();
    const filter: any = {};
    this.applySoftDeleteFilter(filter);
    for (const param of params) {
      const fieldName = param.fieldPath === 'id' ? '_id' : param.fieldPath;
      filter[fieldName] = this.convertOperator(param.opStr, param.value);
    }
    return collection.countDocuments(filter);
  }

  public async textSearch(searchTerm: string, offset: number = 0, limit: number = 20): Promise<T[]> {
    const collection = await this.getCollection();
    const filter: any = { $text: { $search: searchTerm } };
    this.applySoftDeleteFilter(filter);
    let cursor = collection.find(filter).skip(offset);
    if (limit > 0) cursor = cursor.limit(limit);
    const docs = await cursor.toArray();
    return docs.map(d => this.fromMongoDoc(d)!);
  }

  public async lookup(options: LookupOptions): Promise<any[]> {
    const collection = await this.getCollection();
    const matchStage: any = {};
    this.applySoftDeleteFilter(matchStage);

    if (options.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        const fieldName = filter.fieldPath === 'id' ? '_id' : filter.fieldPath;
        matchStage[fieldName] = this.convertOperator(filter.opStr, filter.value);
      }
    }

    const local = options.localField === 'id' ? '_id' : options.localField;
    const foreign = options.foreignField === 'id' ? '_id' : options.foreignField;

    const pipeline: any[] = [];
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });
    pipeline.push({
      $lookup: {
        from: options.foreignCollection,
        localField: local,
        foreignField: foreign,
        as: options.asField
      }
    });

    if (options.offset && options.offset > 0) pipeline.push({ $skip: options.offset });
    if (options.limit && options.limit > 0) pipeline.push({ $limit: options.limit });

    const results = await collection.aggregate(pipeline).toArray();
    return results.map(doc => this.fromMongoDoc(doc));
  }

  public async lookupOne(options: LookupOptions): Promise<any[]> {
    const collection = await this.getCollection();
    const matchStage: any = {};
    this.applySoftDeleteFilter(matchStage);

    if (options.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        const fieldName = filter.fieldPath === 'id' ? '_id' : filter.fieldPath;
        matchStage[fieldName] = this.convertOperator(filter.opStr, filter.value);
      }
    }

    const local = options.localField === 'id' ? '_id' : options.localField;
    const foreign = options.foreignField === 'id' ? '_id' : options.foreignField;

    const pipeline: any[] = [];
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });
    pipeline.push({
      $lookup: {
        from: options.foreignCollection,
        localField: local,
        foreignField: foreign,
        as: options.asField
      }
    });
    pipeline.push({
      $unwind: {
        path: `$${options.asField}`,
        preserveNullAndEmptyArrays: false
      }
    });

    if (options.offset && options.offset > 0) pipeline.push({ $skip: options.offset });
    if (options.limit && options.limit > 0) pipeline.push({ $limit: options.limit });

    const results = await collection.aggregate(pipeline).toArray();
    return results.map(doc => this.fromMongoDoc(doc));
  }
}
