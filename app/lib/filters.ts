import type {ProductFilter, Filter} from '@cloudcart/nitrogen';

/**
 * Convert URL search params to ProductFilter[] for the Storefront API.
 *
 * Supports multiple values per facet (multi-select).
 * URL param conventions:
 *   available=true           → {available: true}
 *   minPrice=10&maxPrice=50  → {price: {min: 10, max: 50}}
 *   vendor=nike&vendor=adidas → {productVendor: "nike"}, {productVendor: "adidas"}
 *   tag=sale&tag=new         → {tag: "sale"}, {tag: "new"}
 *   option_Color=Red&option_Color=Blue → multiple variantOption filters
 *   onSale=true              → {onSale: true}
 *   isNew=true               → {isNew: true}
 *   isFeatured=true          → {isFeatured: true}
 *   prop_material=cotton     → {productMetafield: {namespace: "material", key: "material", value: "cotton"}}
 *   brand_1=2                → {brandModel: {brandId: "1", modelId: "2"}}
 *   category=123             → {category: {id: "123"}}
 *   filter={JSON}            → parsed from facet FilterValue.input
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

  // Multi-select: vendor
  for (const vendor of searchParams.getAll('vendor')) {
    if (vendor) filters.push({productVendor: vendor});
  }

  // Multi-select: tag
  for (const tag of searchParams.getAll('tag')) {
    if (tag) filters.push({tag});
  }

  if (searchParams.get('onSale') === 'true') {
    filters.push({onSale: true});
  }

  if (searchParams.get('isNew') === 'true') {
    filters.push({isNew: true});
  }

  if (searchParams.get('isFeatured') === 'true') {
    filters.push({isFeatured: true});
  }

  // Multi-select: category
  for (const category of searchParams.getAll('category')) {
    if (category) filters.push({category: {id: category}});
  }

  for (const [key, value] of searchParams) {
    if (!value) continue;

    // Multi-select: variant option filters: option_Color=Red&option_Color=Blue
    if (key.startsWith('option_')) {
      filters.push({variantOption: {name: key.slice(7), value}});
    }

    // Multi-select: category property filters: prop_material=cotton&prop_material=wood
    if (key.startsWith('prop_')) {
      const handle = key.slice(5);
      filters.push({productMetafield: {namespace: handle, key: handle, value}});
    }

    // Brand model filters: brand_1=2 (brandId=1, modelId=2)
    if (key.startsWith('brand_')) {
      filters.push({brandModel: {brandId: key.slice(6), modelId: value}});
    }

    // Raw JSON filter from facet input: filter={"productVendor":"nike"}
    if (key === 'filter') {
      try {
        const parsed = JSON.parse(value) as ProductFilter;
        filters.push(parsed);
      } catch {
        // ignore invalid JSON
      }
    }
  }

  return filters;
}

/**
 * Convert a Filter facet value's input JSON into a URL search param.
 * This is the reverse of buildFiltersFromParams — takes the JSON from
 * FilterValue.input and produces the URL param key=value.
 */
export function filterInputToParam(input: string): {key: string; value: string} | null {
  try {
    const parsed = JSON.parse(input) as ProductFilter;

    if (parsed.productVendor) return {key: 'vendor', value: parsed.productVendor};
    if (parsed.variantOption) return {key: `option_${parsed.variantOption.name}`, value: parsed.variantOption.value};
    if (parsed.productMetafield) return {key: `prop_${parsed.productMetafield.key}`, value: parsed.productMetafield.value};
    if (parsed.brandModel) return {key: `brand_${parsed.brandModel.brandId}`, value: parsed.brandModel.modelId ?? ''};
    if (parsed.onSale) return {key: 'onSale', value: 'true'};
    if (parsed.isNew) return {key: 'isNew', value: 'true'};
    if (parsed.isFeatured) return {key: 'isFeatured', value: 'true'};
    if (parsed.category) return {key: 'category', value: parsed.category.id};
    if (parsed.price) return null; // Price is handled separately via minPrice/maxPrice

    // Fallback: encode as raw JSON filter
    return {key: 'filter', value: input};
  } catch {
    return null;
  }
}

/**
 * Check if a filter value is currently active in the URL search params.
 * Supports multi-select: checks all values for a given key.
 */
export function isFilterActive(searchParams: URLSearchParams, input: string): boolean {
  const param = filterInputToParam(input);
  if (!param) return false;
  return searchParams.getAll(param.key).includes(param.value);
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
