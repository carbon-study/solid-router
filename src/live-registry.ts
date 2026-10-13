import { TrieRouter } from "hono/router/trie-router";

function parsePattern(pattern: string) {
  if (!pattern.startsWith("/") || (pattern !== "/" && pattern.endsWith("/"))) throw new Error(`invalid page pattern: ${pattern}`);
  const segments = pattern === "/" ? [] : pattern.slice(1).split("/");
  const names = new Set<string>();
  for (const [i, part] of segments.entries()) {
    if (part === "*" && i === segments.length - 1) continue;
    if (/^:[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      if (names.has(part)) throw new Error(`repeated parameter: ${part}`);
      names.add(part); continue;
    }
    if (!/^[A-Za-z0-9_~-]+$/.test(part)) throw new Error(`unsupported page segment: ${part}`);
  }
  return { key: segments.map(s => s.startsWith(":") ? ":" : s).join("/"), ranks: segments.map(s => s === "*" ? 0 : s.startsWith(":") ? 1 : 2) };
}

// A completed path beats a wildcard matching an empty suffix.
function compare(a: readonly number[], b: readonly number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 3) - (b[i] ?? 3);
    if (difference) return difference;
  }
  return 0;
}

export function createPageRoutes<T>(changed: () => void = () => {}) {
  type Entry = { owner: string; pattern: string; value: T; ranks: number[] };
  let entries = new Map<string, Entry>();
  let matcher = new TrieRouter<Entry>();
  function publish(next: Map<string, Entry>) {
    const built = new TrieRouter<Entry>();
    for (const entry of next.values()) built.add("GET", entry.pattern, entry);
    entries = next; matcher = built; changed();
  }
  function select(matcher: TrieRouter<Entry>, pathname: string) {
    const matches = matcher.match("GET", pathname)[0];
    let best: (typeof matches)[number] | undefined;
    for (const candidate of matches) {
      const order = best ? compare(candidate[0].ranks, best[0].ranks) : 1;
      if (order > 0) best = candidate;
      else if (order === 0 && best && candidate[0] !== best[0]) {
        throw new Error(`ambiguous page: ${best[0].owner} ${best[0].pattern} and ${candidate[0].owner} ${candidate[0].pattern}`);
      }
    }
    return best ? { owner: best[0].owner, pattern: best[0].pattern, value: best[0].value, params: best[1] as Record<string, string> } : undefined;
  }
  return {
    register(owner: string, pattern: string, value: T) {
      if (!owner) throw new Error("page owner must be named");
      const { key, ranks } = parsePattern(pattern);
      const existing = entries.get(key);
      if (existing) throw new Error(`page pattern ${pattern} already belongs to ${existing.owner}: ${existing.pattern}`);
      let entry: Entry = { owner, pattern, value, ranks };
      publish(new Map(entries).set(key, entry));
      let disposed = false;
      return {
        replace(value: T) {
          if (disposed) throw new Error("page registration is disposed");
          entry = { ...entry, value };
          publish(new Map(entries).set(key, entry));
        },
        [Symbol.dispose]() {
          if (disposed) return;
          disposed = true;
          const next = new Map(entries); next.delete(key); publish(next);
        },
      };
    },
    match(pathname: string) { return select(matcher, pathname); },
    snapshot() {
      const captured = matcher;
      return (pathname: string) => select(captured, pathname);
    },
  };
}
