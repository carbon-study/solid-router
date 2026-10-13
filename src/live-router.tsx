import { type Component, type Owner, createSignal, getOwner, onCleanup, sharedConfig, untrack } from "solid-js";
import { isServer } from "@solidjs/web";
import { setupLinkClaims } from "./claims.js";
import { setupNativeEvents } from "./data/events.js";
import { createRouterContext, RouterContextObj } from "./routing.js";
import { Root, Routes } from "./routers/components.jsx";
import { browserHistory } from "./routers/history.js";
import type { RouterHistory } from "./routers/history.js";
import { createScrollRestoration, withScrollRestoration } from "./routers/scrollRestoration.js";
import type { Branch, LocationChange, RouteDescription, RouteSectionProps, RouterIntegration } from "./types.js";
import type { RouterProps } from "./routers/factory.jsx";
import { createPageRoutes } from "./live-registry.js";

// Mirrors upstream factory.tsx's integration, keeping the static factory intact.
function integrate(history: RouterHistory): RouterIntegration {
  let ignore = false;
  const wrap = (value: string | LocationChange) => typeof value === "string" ? { value } : value;
  const [read, write] = createSignal(wrap(history.get()), {
    equals: (a, b) => a.value === b.value && a.state === b.state, ownedWrite: true,
  });
  const signal: RouterIntegration["signal"] = [read, next => {
    if (!ignore) history.set(next);
    if (sharedConfig.registry && !sharedConfig.done) sharedConfig.done = true;
    write(next);
  }];
  if (history.init) onCleanup(history.init((value = history.get()) => {
    ignore = true;
    try { signal[1](wrap(value)); } finally { ignore = false; }
  }));
  return { signal, utils: history.utils };
}

// Browser-only flat pages. Every selected page gets an ordinary native route
// context, so useParams/useRouteMatches/useNavigate see the actual registration.
export function createLiveRouter(options: { history?: RouterHistory; fallback?: Component<RouteSectionProps>; scrollRestoration?: boolean } = {}) {
  const fallback: RouteDescription = {
    key: {}, originalPath: "*", pattern: "*",
    component: options.fallback ?? (() => "page unavailable"), matcher: () => null,
  };
  const registry = createPageRoutes<RouteDescription>(publish);
  function build() {
    const select = registry.snapshot();
    return [{
      routes: [], score: 0,
      matcher(pathname: string) {
        const selected = select(pathname);
        const route = selected?.value ?? fallback;
        const params = selected?.params ?? {};
        // Like upstream's leaf matcher, a splat route's path is its matched
        // prefix. It is the base used by relative route navigation.
        const path = selected?.pattern.endsWith("/*")
          ? pathname.split("/").slice(0, selected.pattern.split("/").length - 1).join("/") || "/"
          : pathname;
        return [{ route, path, params }];
      },
    }] satisfies Branch[];
  }
  const [branches, setBranches] = createSignal<Branch[]>(build());
  function publish() { setBranches(build()); }
  function describe(pattern: string, component: Component<RouteSectionProps>): RouteDescription {
    return { key: {}, originalPath: pattern, pattern, component, matcher: () => null };
  }
  function register(owner: string, pattern: string, component: Component<RouteSectionProps>) {
    const lease = registry.register(owner, pattern, describe(pattern, component));
    return {
      replace(component: Component<RouteSectionProps>) { lease.replace(describe(pattern, component)); },
      [Symbol.dispose]() { lease[Symbol.dispose](); },
    };
  }
  function Router(props: RouterProps) {
    if (isServer) throw new Error("createLiveRouter currently supports browser rendering only");
    const root = untrack(() => props.children);
    const restoration = (options.scrollRestoration ?? true) ? createScrollRestoration() : undefined;
    const baseHistory = options.history ?? browserHistory();
    const history = restoration ? withScrollRestoration(baseHistory, restoration) : baseHistory;
    let context: Owner | null;
    const state = createRouterContext(integrate(history), branches, () => context, { singleFlight: false });
    setupNativeEvents({ preload: false })(state);
    setupLinkClaims(state, false);
    restoration?.create(state);
    return <RouterContextObj value={state}>
      <Root routerState={state} root={root}>
        {(context = getOwner()) && null}
        <Routes routerState={state} branches={branches} />
      </Root>
    </RouterContextObj>;
  }
  return Object.assign(Router, { register });
}
