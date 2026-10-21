// Fails when `KEPT_PAGES` (`app/lib/kept-pages.ts`) is out of step with the routes: a page shared by every visitor
// (`handle = SHARED_PAGE`, with a component) whose route does not load through `keptPageLoader`, or a route that does
// and is not in the list — its links would load nothing ahead — or a pattern in the list that no such route has.
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const app = join(import.meta.dirname, '..', 'app');

/** A flat route file's address pattern, as React Router writes it: `blog.category.$handle` → `/blog/category/:handle`. */
const patternOf = (name) =>
  '/' +
  name
    .split('.')
    .filter((segment) => segment !== '_index' && !segment.startsWith('_'))
    .map((segment) => (segment.startsWith('$') ? `:${segment.slice(1)}` : segment.replace(/_$/, '')))
    .join('/');

const listed = new Set(
  [...readFileSync(join(app, 'lib', 'kept-pages.ts'), 'utf8').matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]),
);
const problems = [];
const kept = new Set();
for (const file of readdirSync(join(app, 'routes')).filter((name) => name.endsWith('.tsx'))) {
  const source = readFileSync(join(app, 'routes', file), 'utf8');
  const name = file.slice(0, -'.tsx'.length);
  const shared = /^export const handle = SHARED_PAGE;$/m.test(source) && /^export default function /m.test(source);
  const loads = /keptPageLoader\(args\)/.test(source);
  if (shared && !loads) problems.push(`routes/${file}: a shared page without \`keptPageLoader\``);
  if (!loads) continue;
  kept.add(patternOf(name));
  if (!listed.has(patternOf(name))) problems.push(`routes/${file}: ${patternOf(name)} is not in KEPT_PAGES`);
}
for (const pattern of listed)
  if (!kept.has(pattern)) problems.push(`KEPT_PAGES: ${pattern} has no route with \`keptPageLoader\``);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
