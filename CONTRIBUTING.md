# Contributing

Thank you for adding to the catalog. A missing stack, a recipe for a capability you have built, or a fix to an existing item are all welcome.

## Before you start

- Read `FORMAT.md`. Every item is one folder with one Markdown file and its `files/`.
- Look for an item close to yours and copy its folder. Change the id, the name and the version (`1.0.0` for a new item).
- File a recipe under one of the categories in `CATEGORIES.md`. If none fits, add one with its meaning in the same pull request.

## Check your item

```bash
npm install
npm run build
npm run catalog -- lint
```

The lint must report no errors. Warnings are allowed for now.

Changing an item that is already released? Give it a new version and a changelog entry; a released `id@version` never changes.

## Sign your commits (DCO)

Contributions are accepted under the Apache License 2.0 (`LICENSE`) and the [Developer Certificate of Origin](https://developercertificate.org/). Sign off every commit to confirm you wrote the change or have the right to submit it:

```bash
git commit -s -m "feat(recipe): add stripe-payments 1.0.0"
```

This adds a `Signed-off-by: Your Name <you@example.com>` line. Pull requests with unsigned commits cannot be merged.

## Review and release

- A maintainer reviews the pull request and starts the full check (the one with a coding agent) on it.
- Releases are tagged `v<major>.<minor>.<patch>` and carry `release/catalog.json` and `release/checks.json`. Only a tagged release is used by consumers.
- Never put real keys, tokens or ids in an item. Use a parameter; a secret parameter has no default.
