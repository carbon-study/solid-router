# Carbon's Solid Router source pin

`src/` begins as an unchanged copy of solidjs/solid-router tag
`v2.0.0-next.17`, commit `37d76dd88e7187e8af4bfebfae32caff2db9e192`.
This repository is Carbon’s Solid Router fork, consumed as the
`vendor/solid-router` Git submodule. The MIT license and upstream source
files are retained.

`carbon.ts` exports the upstream public API plus `routeClaims`. The native
factory also accepts reactive immutable route snapshots (below).

Carbon's compiler lowers this source's TSX and bundles its declarations. Solid
and web remain external plugin imports.

An earlier flat-page `createLiveRouter` (with a Hono-backed `live-registry`) has
been removed: Carbon's registry plugin uses the native factory, and nothing
called the live entry.

## Registry-backed native route snapshots

`createRouter` also accepts a reactive getter for `config.routes` that returns
immutable route-tree snapshots. It recompiles when snapshot identity or the
native lazy-subtree version changes, while keeping history and router context.
Unchanged definition objects keep their native route keys. Its `routes` getter
reports the current snapshot. Literal static configs keep their existing types.
`routeClaims` describes native expanded leaf patterns and scores; unresolved
lazy-definition prefixes are marked exclusive for Carbon registry validation.

Client lazy-table waits use a real async Solid memo before matching. A raw
Promise is not a valid reactive source for the pinned Solid NotReadyError
protocol; server-side matching retains its existing path and has not been
revalidated by this Carbon slice.
