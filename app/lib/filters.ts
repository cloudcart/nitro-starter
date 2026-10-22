import type {ProductFilter, ProductSortKeys} from '@cloudcart/nitrogen/storefront-api-types';

/*
 * Listing filters and sorting, kept in readable URL parameters:
 *
 *   vendor=nike&vendor=adidas          {productVendor: "nike"}, {productVendor: "adidas"}
 *   option_Color=Red                   {variantOption: {name: "Color", value: "Red"}}
 *   prop_material=cotton               {productMetafield: {namespace: "material", key: "material", value: "cotton"}}
 *   brand_1=2                          {brandModel: {brandId: "1", modelId: "2"}}
 *   category=123                       {category: {id: "123"}}
 *   onSale=true, isNew=true, isFeatured=true, available=true
 *   minPrice=10&maxPrice=50            {price: {min: 10, max: 50}}
 *   filter={JSON}                      any other facet value's `input`, as is
 *
 * A facet value's `input` (from `ProductConnection.filters`) is turned into
 * one of these parameters, and the parameters back into `ProductFilter`s.
 */

/** URL parameters that are not filters. */
const NON_FILTER_PARAMS = ['sort', 'cursor', 'direction', 'query', 'q'];

/**
 * Each `ProductFilter` field and the JSON type of its value. Typed against the schema's input, so a field the API adds
 * fails the typecheck until it is listed here.
 */
const FILTER_FIELDS = {
  available: 'boolean',
  variantOption: 'object',
  productVendor: 'string',
  price: 'object',
  tag: 'string',
  onSale: 'boolean',
  isNew: 'boolean',
  isFeatured: 'boolean',
  productMetafield: 'object',
  brandModel: 'object',
  category: 'object',
} as const satisfies Record<keyof ProductFilter, 'boolean' | 'string' | 'object'>;

/**
 * A raw `filter` parameter as a `ProductFilter`, or null when it is not one: an object whose every field is the
 * input's, with a value of its type. Anything else would make the API refuse the whole query (B-413).
 */
function rawFilter(value: string): ProductFilter | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const entries = Object.entries(parsed);
  const valid =
    entries.length > 0 &&
    entries.every(([field, fieldValue]) => {
      const type = FILTER_FIELDS[field as keyof ProductFilter] as string | undefined;
      return type === 'object'
        ? typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)
        : type !== undefined && typeof fieldValue === type;
    });
  return valid ? (parsed as ProductFilter) : null;
}

/** The `ProductFilter`s for the products query, from the page's URL. */
export function getFiltersFromParams(searchParams: URLSearchParams): ProductFilter[] {
  const filters: ProductFilter[] = [];

  if (searchParams.get('available') === 'true') filters.push({available: true});
  if (searchParams.get('onSale') === 'true') filters.push({onSale: true});
  if (searchParams.get('isNew') === 'true') filters.push({isNew: true});
  if (searchParams.get('isFeatured') === 'true') filters.push({isFeatured: true});

  const min = parseFloat(searchParams.get('minPrice') ?? '');
  const max = parseFloat(searchParams.get('maxPrice') ?? '');
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    filters.push({price: {...(!Number.isNaN(min) && {min}), ...(!Number.isNaN(max) && {max})}});
  }

  for (const vendor of searchParams.getAll('vendor')) {
    if (vendor) filters.push({productVendor: vendor});
  }
  for (const tag of searchParams.getAll('tag')) {
    if (tag) filters.push({tag});
  }
  for (const id of searchParams.getAll('category')) {
    if (id) filters.push({category: {id}});
  }

  for (const [key, value] of searchParams) {
    if (!value) continue;

    if (key.startsWith('option_')) {
      filters.push({variantOption: {name: key.slice('option_'.length), value}});
    } else if (key.startsWith('prop_')) {
      const property = key.slice('prop_'.length);
      filters.push({productMetafield: {namespace: property, key: property, value}});
    } else if (key.startsWith('brand_')) {
      filters.push({brandModel: {brandId: key.slice('brand_'.length), modelId: value}});
    } else if (key === 'filter') {
      // Not a filter: ignored.
      const filter = rawFilter(value);
      if (filter) filters.push(filter);
    }
  }

  return filters;
}

/** The URL parameter for a facet value's `input`. Null for price, which has its own two parameters. */
export function filterInputToParam(input: string): {key: string; value: string} | null {
  let filter: ProductFilter;
  try {
    filter = JSON.parse(input) as ProductFilter;
  } catch {
    return null;
  }

  if (filter.price) return null;
  if (filter.productVendor) return {key: 'vendor', value: filter.productVendor};
  if (filter.tag) return {key: 'tag', value: filter.tag};
  if (filter.category) return {key: 'category', value: filter.category.id};
  // The API's inputs name the option and property as well as their ids; one without names stays a raw `filter`.
  if (filter.variantOption?.name && filter.variantOption.value)
    return {key: `option_${filter.variantOption.name}`, value: filter.variantOption.value};
  if (filter.productMetafield?.key && filter.productMetafield.value)
    return {key: `prop_${filter.productMetafield.key}`, value: filter.productMetafield.value};
  if (filter.brandModel) return {key: `brand_${filter.brandModel.brandId}`, value: filter.brandModel.modelId ?? ''};
  if (filter.onSale === true) return {key: 'onSale', value: 'true'};
  if (filter.isNew === true) return {key: 'isNew', value: 'true'};
  if (filter.isFeatured === true) return {key: 'isFeatured', value: 'true'};
  if (filter.available === true) return {key: 'available', value: 'true'};

  return {key: 'filter', value: input};
}

/** Whether a facet value is applied on the current page. */
export function isFilterActive(searchParams: URLSearchParams, input: string) {
  const param = filterInputToParam(input);
  return param ? searchParams.getAll(param.key).includes(param.value) : false;
}

/**
 * The URL with a facet value added, or removed when it is already applied. Pagination starts over. An added value goes
 * to the end and a removed one leaves the others where they were: the address keeps the order the filters were chosen
 * in, which the chosen filters' chips follow (T-558).
 */
export function toggleFilterParam(searchParams: URLSearchParams, input: string) {
  const params = withoutPagination(searchParams);
  const param = filterInputToParam(input);
  if (!param) return params;

  if (!params.getAll(param.key).includes(param.value)) {
    params.append(param.key, param.value);
    return params;
  }
  return new URLSearchParams([...params].filter(([key, value]) => key !== param.key || value !== param.value));
}

/**
 * The URL with one parameter set, or removed when empty. Pagination starts over. A value set goes to the end, as a
 * filter just chosen (T-558).
 */
export function setParam(searchParams: URLSearchParams, key: string, value: string | null) {
  const params = withoutPagination(searchParams);
  params.delete(key);
  if (value) params.append(key, value);
  return params;
}

/**
 * Where a parameter last stands in the address — with a value, that pair — or -1: the later a filter was chosen, the
 * higher (T-558).
 */
export function paramPosition(searchParams: URLSearchParams, key: string, value?: string) {
  let position = -1;
  [...searchParams].forEach(([k, v], index) => {
    if (k === key && (value === undefined || v === value)) position = index;
  });
  return position;
}

/** The URL without any filter, keeping the search term and sorting. */
export function clearFilterParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (NON_FILTER_PARAMS.includes(key) && key !== 'cursor' && key !== 'direction') params.append(key, value);
  }
  return params;
}

/** Whether any filter is applied. */
export function hasFilterParams(searchParams: URLSearchParams) {
  return [...searchParams.keys()].some((key) => !NON_FILTER_PARAMS.includes(key));
}

/**
 * The address's pairs a GET form carries as hidden fields, so that without JavaScript it submits the listing as it is
 * with its own fields changed (T-600): every pair but pagination, the keys the form's fields name (`keys`) and the
 * pairs they do (`pairs`, by `pairId`).
 */
export function hiddenPairs(
  searchParams: URLSearchParams,
  {keys = [], pairs = new Set<string>()}: {keys?: string[]; pairs?: Set<string>},
) {
  return [...withoutPagination(searchParams)].filter(
    ([key, value]) => !keys.includes(key) && !pairs.has(pairId(key, value)),
  );
}

/** One address pair as a set's key. */
export function pairId(key: string, value: string) {
  return JSON.stringify([key, value]);
}

function withoutPagination(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  params.delete('cursor');
  params.delete('direction');
  return params;
}

/** The sort orders the listing offers, each named by its text in `listing.sort`. The first is the store's own order. */
export const SORT_OPTIONS: Array<{value: string; label: SortLabel; sortKey?: ProductSortKeys; reverse?: boolean}> = [
  {value: '', label: 'featured'},
  {value: 'best-selling', label: 'bestSelling', sortKey: 'BEST_SELLING'},
  {value: 'created-desc', label: 'newest', sortKey: 'CREATED_AT', reverse: true},
  {value: 'price-asc', label: 'priceAsc', sortKey: 'PRICE'},
  {value: 'price-desc', label: 'priceDesc', sortKey: 'PRICE', reverse: true},
  {value: 'title-asc', label: 'titleAsc', sortKey: 'TITLE'},
  {value: 'title-desc', label: 'titleDesc', sortKey: 'TITLE', reverse: true},
];

/** A sort order's text in `listing.sort`; `relevance` names the store's own order on search results. */
export type SortLabel =
  'featured' | 'relevance' | 'bestSelling' | 'newest' | 'priceAsc' | 'priceDesc' | 'titleAsc' | 'titleDesc';

/** `sortKey` and `reverse` for the products query, from the `sort` URL parameter. */
export function getSortFromParams(searchParams: URLSearchParams): {sortKey?: ProductSortKeys; reverse?: boolean} {
  const option = SORT_OPTIONS.find(({value}) => value && value === searchParams.get('sort'));
  return option ? {sortKey: option.sortKey, reverse: option.reverse ?? false} : {};
}
