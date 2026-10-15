import { createRoutes } from "./routing.js";
import { scoreRoute } from "./utils.js";
import type { RouteDefinition } from "./types.js";

// A lazy definition owns its entire prefix, including children not loaded yet.
// This lets a registry reject cross-registration collisions before publication.
export function routeClaims(definitions: readonly RouteDefinition[], base = "") {
  const claims: Array<{ pattern: string; score: number; exclusive: boolean }> = [];
  function visit(definition: RouteDefinition, parent: string) {
    for (const route of createRoutes(definition, parent)) {
      const children = definition.children;
      if (typeof children === "function") {
        claims.push({ pattern: route.pattern + "/*", score: 0, exclusive: true });
      } else if (children && (!Array.isArray(children) || children.length)) {
        for (const child of Array.isArray(children) ? children : [children]) visit(child as RouteDefinition, route.pattern);
      } else claims.push({ pattern: route.pattern, score: scoreRoute(route), exclusive: false });
    }
  }
  for (const definition of definitions) visit(definition, base);
  return claims;
}
