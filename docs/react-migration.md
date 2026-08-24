# React + TypeScript Incremental Migration

TeamUp keeps the current Vanilla SPA running while new or migrated modules are built as React islands.

## Goals

- Keep the existing router and views stable while React is introduced feature by feature.
- Use TypeScript only for new React code at first.
- Make every React island responsible for cleanup through a single mount/unmount contract.

## Folder Convention

```text
src/react/
  app/                         # App-level shells and composition
  features/<feature-name>/
    components/                # UI for one feature
    hooks/                     # React hooks owned by the feature
    services/                  # Feature API adapters and state helpers
    types/                     # Feature-specific TypeScript contracts
  platform/                    # Cross-cutting integration with the Vanilla app
  shared/
    components/                # Reusable React UI once there is a real pattern
    hooks/                     # Generic hooks
    services/                  # Cross-feature services
    types/                     # Shared contracts
```

Feature folders may import from `shared` and `platform`. They should not import from sibling features unless the dependency has been promoted to `shared`.

## Mounting From Vanilla

Vanilla views mount React through `mountReactIsland`:

```js
this.reactRoot = mountReactIsland(container, ReactShell, {
  router: this.router,
  params: this.params,
});
```

Every Vanilla view that mounts React must call `this.reactRoot?.unmount()` in `destroy()`. This keeps React effects, timers, subscriptions and event listeners scoped to the view lifecycle.

## TypeScript Rules

New React code is checked by `tsc --noEmit` with:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`

Existing Vanilla JavaScript is not type-checked yet. Migrated modules should be moved into `src/react/features/<feature-name>` and converted to `.ts` or `.tsx`.

## Migration Path

1. Wrap a small existing UI surface in a Vanilla view that owns a `div` mount point.
2. Build the new React feature under `src/react/features/<feature-name>`.
3. Pass only route params and stable service functions into the React island.
4. Move data fetching into typed feature services.
5. Delete duplicated Vanilla event binding from the migrated surface.
6. Once a route is fully React, replace the Vanilla view class with a thin adapter.
7. When all routes are React adapters, replace the central router with a React router and keep the RBAC rules as route metadata.

## CI Contract

`npm run verify` is the local and CI contract:

```text
lint -> format -> type-check -> test -> build
```

CI should use `npm ci` so the checked-in `package-lock.json` is the source of truth.
