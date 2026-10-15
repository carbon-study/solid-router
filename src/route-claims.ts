import { createRoutes } from "./routing.js";
import { scoreRoute } from "./utils.js";
import type { RouteDefinition } from "./types.js";

// A lazy definition owns its entire prefix, including children not loaded yet.
// This lets a registry reject cross-registration collisions before publication.
export function routeClaims(definitions: readonly RouteDefinition[], base = "") {
  const claims: Array<{ pattern: string; score: number; exclusive: boolean; lazyGroup?: object }> = [];
  function visit(definition: RouteDefinition, parents: readonly string[]) {
    // One occurrence may expand optional parameters or path alternatives.
    // Its reservations belong together; a separate visit has separate ownership.
    const lazyGroup = {};
    const routes = parents.flatMap(parent => createRoutes(definition, parent));
    const children = definition.children;
    if (children && typeof children !== "function" && (!Array.isArray(children) || children.length)) {
      for (const child of Array.isArray(children) ? children : [children]) visit(child as RouteDefinition, routes.map(route => route.pattern));
      return;
    }
    for (const route of routes) {
      if (typeof children === "function") {
        claims.push({ pattern: route.pattern + "/*", score: 0, exclusive: true, lazyGroup });
      } else claims.push({ pattern: route.pattern, score: scoreRoute(route), exclusive: false });
    }
  }
  for (const definition of definitions) visit(definition, [base]);
  return claims;
}
