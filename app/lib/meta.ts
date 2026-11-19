import {createTranslator, getSeoMeta, type SeoConfig, type Translate} from '@cloudcart/nitrogen';
import type {MetaDescriptor} from 'react-router';
import {breadcrumbJsonLd, type Crumb} from '~/components/Breadcrumbs';
import {getFiltersFromParams, getSortFromParams, listingParams} from '~/lib/filters';
import type {RootLoader} from '~/root';

type RootData = Awaited<ReturnType<RootLoader>>;
type MetaMatches = ReadonlyArray<{id: string; data?: unknown; meta?: MetaDescriptor[]} | undefined>;

/** The root's data, as a route's `meta` sees it among its matches. */
export function rootData(matches: MetaMatches) {
  return matches.find((match) => match?.id === 'root')?.data as RootData | undefined;
}

/**
 * A route's `meta` when its own error boundary shows (every route with an `action` has one, B-201): the root's, which
 * titles the error page and keeps it out of search. React Router passes the error to each route's `meta` up to the
 * boundary and shows the last one's, so a route that titled itself as usual would replace it (B-227).
 *
 *   export const meta: Route.MetaFunction = ({data, error, matches}) => {
 *     if (error) return errorMeta(matches);
 */
export function errorMeta(matches: MetaMatches): MetaDescriptor[] {
  return matches.find((match) => match?.id === 'root')?.meta ?? [];
}

/**
 * The store's texts for a route's `meta`, which runs outside React and so has no `useTranslation`: read from the
 * root's data. A page's `meta` always has it — when the root's own loader fails, the root's error page is shown
 * instead — so the empty fallback, which would show the keys, is never seen.
 */
export function metaTranslator(matches: MetaMatches): Translate {
  return createTranslator(rootData(matches)?.translations ?? {language: 'en', messages: {}});
}

/**
 * The store's own address — its primary domain — for canonical URLs and structured data, whichever host served the
 * page: a preview host's pages point search engines at the store (B-191). Empty only without the root's data.
 */
export function storeOrigin(matches: MetaMatches) {
  const url = rootData(matches)?.header.shop.primaryDomain.url;
  return url ? new URL(url).origin : '';
}

/** The store's name, for `og:site_name` and the descriptions that name the store. */
export function storeName(matches: MetaMatches) {
  return rootData(matches)?.header.shop.name ?? '';
}

/** `getSeoMeta` with the store's name as `og:site_name`: every page's `meta` goes through it. */
export function seoMeta(matches: MetaMatches, config: SeoConfig) {
  return getSeoMeta({siteName: storeName(matches), ...config});
}

/** The parameters of a page of results (`getPaginationVariables`' cursor and direction). */
const PAGE_OF_RESULTS = ['cursor', 'direction'];

/**
 * A listing's canonical address: `path` on the store's own domain with the page of results the URL asks for, so each
 * page is its own canonical (Google: "Don't use the first page of a paginated sequence as the canonical page"). A
 * filtered or sorted view points at the listing's first page: its cursor belongs to the filtered list (B-261) — unless
 * the store lets search engines index it (`indexable`, `listingSeo`), when it is its own canonical: its filters and
 * sort (`listingParams`) with its page of results.
 */
export function listingUrl(matches: MetaMatches, path: string, search: string, indexable = false) {
  const params = new URLSearchParams(search);
  const narrowed = getFiltersFromParams(params).length > 0 || getSortFromParams(params).sortKey !== undefined;
  const page = new URLSearchParams(narrowed && indexable ? listingParams(params) : []);
  for (const key of narrowed && !indexable ? [] : PAGE_OF_RESULTS) {
    const value = params.get(key);
    if (value) page.set(key, value);
  }
  const query = page.toString();
  return `${storeOrigin(matches)}${path}${query ? `?${query}` : ''}`;
}

/**
 * A product listing's canonical address and robots, by the store's SEO setting "Deindex filtered and sorted pages"
 * (`listingIndexing`, asked in the listing's own query with its filters and sort): a view the store does not let
 * search engines index is `noindex` and points at the listing's first page; one it does is its own canonical. Without
 * the answer, the listing's canonical as `listingUrl` gives it and no `noindex`.
 *
 *   seoMeta(matches, {title, ...listingSeo(matches, path, location.search, data.indexing)})
 */
export function listingSeo(
  matches: MetaMatches,
  path: string,
  search: string,
  indexing: {indexable: boolean} | null | undefined,
): {url: string; robots?: SeoConfig['robots']} {
  return {
    url: listingUrl(matches, path, search, indexing?.indexable === true),
    ...(indexing && !indexing.indexable && {robots: {noIndex: true}}),
  };
}

/**
 * A page's breadcrumb trail as JSON-LD, as the page shows it: its last crumb, which the page does not link, at the
 * page's own address (B-266).
 */
export function crumbsJsonLd(matches: MetaMatches, crumbs: Crumb[], path: string) {
  const items = crumbs.map((crumb, index) => (index === crumbs.length - 1 && !crumb.to ? {...crumb, to: path} : crumb));
  return breadcrumbJsonLd(storeOrigin(matches), items, metaTranslator(matches)('navigation.home'));
}

/**
 * A page's `meta`: its title, description and canonical address — `path` on the store's own domain, with the page of
 * results for a listing (`search`, the URL's query) — and its breadcrumb trail when it shows one.
 */
export function pageMeta(
  matches: MetaMatches,
  page: {title: string; path: string; description?: string | null; search?: string; crumbs?: Crumb[]},
) {
  return seoMeta(matches, {
    title: page.title,
    description: page.description || undefined,
    url:
      page.search === undefined ? `${storeOrigin(matches)}${page.path}` : listingUrl(matches, page.path, page.search),
    jsonLd: page.crumbs ? crumbsJsonLd(matches, page.crumbs, page.path) : undefined,
  });
}

/**
 * A private, form or utility page's `meta`: its title, kept out of search results. Each such route returns it from
 * its own `meta`: React Router shows the deepest route's, so a parent's `noindex` never reaches its children (B-263).
 */
export function privateMeta(title: string): MetaDescriptor[] {
  return [{title}, {name: 'robots', content: 'noindex'}];
}
