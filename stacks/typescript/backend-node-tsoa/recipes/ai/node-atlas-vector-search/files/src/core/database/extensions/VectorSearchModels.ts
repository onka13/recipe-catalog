export interface IVectorSearchable {
  embedding?: number[];
}

export interface VectorSearchOptions {
  indexName?: string;
  path?: string;
  limit?: number;
  threshold?: number;
  numCandidatesMultiplier?: number;
  tenantId?: string;
}

export interface VectorSearchResult<T> {
  item: T;
  score: number;
}
