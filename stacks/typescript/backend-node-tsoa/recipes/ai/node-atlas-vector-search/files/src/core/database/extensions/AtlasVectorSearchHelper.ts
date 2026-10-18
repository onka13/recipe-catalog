import { Collection, Document } from 'mongoose';
import { VectorSearchOptions, VectorSearchResult } from './VectorSearchModels';

export class AtlasVectorSearchHelper {
  public static async search<T>(
    collection: Collection<Document>,
    embedding: number[],
    options: VectorSearchOptions = {},
    docMapper: (doc: any) => T
  ): Promise<VectorSearchResult<T>[]> {
    const indexName = options.indexName || '{{DEFAULT_VECTOR_INDEX}}';
    const path = options.path || '{{DEFAULT_EMBEDDING_PATH}}';
    const limit = options.limit || 5;
    const threshold = options.threshold || 0.80;
    const numCandidates = limit * (options.numCandidatesMultiplier || 10);

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: indexName,
          path: path,
          queryVector: embedding,
          numCandidates: numCandidates,
          limit: limit
        }
      },
      {
        $project: {
          [path]: 0,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    const matchConditions: any = {
      score: { $gte: threshold }
    };

    if (options.tenantId) {
      matchConditions.tenantId = options.tenantId;
    }

    pipeline.push({ $match: matchConditions });

    const results = await collection.aggregate(pipeline).toArray();
    return results.map(doc => ({
      item: docMapper(doc),
      score: doc.score
    }));
  }
}
