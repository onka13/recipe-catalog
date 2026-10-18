---
schemaVersion: 1
id: node-atlas-vector-search
name: Node.js MongoDB Atlas Vector Search & Semantic RAG Extension
version: 1.0.1
language: typescript
stack: backend-node-tsoa
category: ai
standardType: custom
interfacePort: IVectorSearchRepository
order: 60
tags:
  - vector-search
  - embeddings
  - rag
  - mongodb-atlas
  - semantic-search
dependsOn:
  - node-generic-repository
parameters:
  - key: DEFAULT_VECTOR_INDEX
    label: Atlas Vector Search Index Name
    description: Name of the vector search index configured in MongoDB Atlas
    default: vector_index
    secret: false
  - key: DEFAULT_EMBEDDING_PATH
    label: Embedding Field Path
    description: Name of the document field storing the float vector
    default: embedding
    secret: false
verify:
  - npm run lint
---
# Node.js MongoDB Atlas Vector Search & Semantic RAG Extension

Composable extension for BaseMongoRepository adding MongoDB Atlas Vector Search ($vectorSearch), cosine similarity thresholding, tenant-scoped vector filtering, and memory-safe float embedding exclusions.

## Conventions

### src/features/*/infrastructure/repositories/*Repository.ts
When adding vector search to a feature repository, implement searchByVector(embedding: number[], options?: VectorSearchOptions) by calling AtlasVectorSearchHelper.search with this.getCollection(). Ensure normal read queries project { embedding: 0 } to prevent multi-megabyte vector payloads from polluting memory.

## Changelog

### 1.0.1
- Rules for code written later (file patterns) moved from Instructions to Conventions; they are no longer applied at install.

### 1.0.0
- First version.
