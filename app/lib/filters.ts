import type {ProductFilter} from '@cloudcart/nitro';

/**
 * Convert URL search params to ProductFilter[] for the Storefront API.
 */
export function buildFiltersFromParams(searchParams: URLSearchParams): ProductFilter[] {
  const filters: ProductFilter[] = [];

  if (searchParams.get('available') === 'true') {
    filters.push({available: true});
  }

  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  if (minPrice || maxPrice) {
    filters.push({
      price: {
        ...(minPrice ? {min: parseFloat(minPrice)} : {}),
        ...(maxPrice ? {max: parseFloat(maxPrice)} : {}),
      },
    });
  }

  const vendor = searchParams.get('vendor');
  if (vendor) {
    filters.push({productVendor: vendor});
  }

  const tag = searchParams.get('tag');
  if (tag) {
    filters.push({tag});
  }

  // Variant option filters: option_Color=Red, option_Size=L, etc.
  for (const [key, value] of searchParams) {
    if (key.startsWith('option_') && value) {
      filters.push({variantOption: {name: key.slice(7), value}});
    }
  }

  return filters;
}

/** Sort key mapping from URL param to GraphQL ProductSortKeys. */
const SORT_MAP: Record<string, {sortKey: string; reverse: boolean}> = {
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'title-asc': {sortKey: 'TITLE', reverse: false},
  'title-desc': {sortKey: 'TITLE', reverse: true},
  'created-desc': {sortKey: 'CREATED_AT', reverse: true},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
  'updated-desc': {sortKey: 'UPDATED_AT', reverse: true},
};

/**
 * Convert a sort URL param to GraphQL sortKey + reverse.
 */
export function buildSortFromParams(searchParams: URLSearchParams): {sortKey?: string; reverse?: boolean} {
  const sort = searchParams.get('sort');
  if (!sort || !SORT_MAP[sort]) return {};
  return SORT_MAP[sort];
}
