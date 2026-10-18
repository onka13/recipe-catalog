# Recipe categories

Every recipe sits in one of these folders (`stacks/<language>/<stack>/recipes/<category>/`). The same list serves every stack. Add a category, with its meaning, in the pull request that first needs it.

- `delivery`: Build and test scripts, CI files: what the platform and contributors run to check a tier
- `core`: The base every other recipe of the stack builds on: error types, app entry, request context, configuration
- `architecture`: Structural patterns: dependency injection, ports and adapters, strangler facade, anti-corruption layer
- `api`: The project's own API surface: controllers, routing, input validation, response shapes
- `networking`: Calling other services: HTTP clients, retries, sockets
- `storage`: Databases, repositories, caches, local key-value storage, files
- `security`: Authentication, authorization, request signing, app attestation, secrets handling
- `observability`: Logging, metrics, tracing, health checks
- `testing`: Test harnesses, fixtures, characterization tests
- `ui`: Theming, design system, navigation, shared widgets and components
- `media`: Audio, speech, camera, images, video
- `ai`: Model calls, embeddings, vector search
- `monetization`: Ads, in-app purchases, subscriptions
- `analytics`: Product analytics and attribution
