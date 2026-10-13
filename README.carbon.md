# Carbon's Solid Router source pin

`src/` begins as an unchanged copy of solidjs/solid-router tag
`v2.0.0-next.17`, commit `37d76dd88e7187e8af4bfebfae32caff2db9e192`.
This repository is Carbon’s Solid Router fork, consumed as the
`vendor/solid-router` Git submodule. The MIT license and upstream source
files are retained; the fork adds Hono as a runtime dependency.

`carbon.ts` exports the upstream public API plus `createLiveRouter`.
`src/live-registry.ts` and `src/live-router.tsx` are Carbon additions. The
upstream static factory is unmodified. The live entry reuses native route
contexts, rendering, history, link events, and scroll restoration. Its small
integration/provider wiring follows upstream `routers/factory.tsx`.

The live entry is browser-only and flat-page-only. It does not promise SSR,
nested layout trees, lazy route definitions, static typed-path enumeration,
or the upstream server data collector for mutable routes. Components receive
native RouteSectionProps and may use the ordinary router hooks. Hono provides
matching; live-registry owns restricted grammar, specificity, and leases.

Oxc lowers this source's TSX during the blessed build. Solid and web remain
external imports to Carbon's shared routes; Hono is private to the router.
