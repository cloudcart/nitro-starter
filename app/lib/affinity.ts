import {createContext} from 'react';
import {
  type AffinityCart,
  type AffinityListsInput,
  type AffinityRankedProduct,
  visitorOptionValues,
} from '@cloudcart/nitrogen';
import type {UseAffinityProductsOptions} from '@cloudcart/nitrogen-react';
import type {AffinityProductsAnswer} from '~/routes/affinity-products';

type Request = UseAffinityProductsOptions<AffinityProductsAnswer>['request'];

/** Asks `/affinity-products` for the visitor's lists; `newest` asks them newest first too (the home page's "New"). */
function askAffinityProducts(newest: boolean): Request {
  return (variables, signal) =>
    fetch('/affinity-products', {
      method: 'POST',
      headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
      body: JSON.stringify({variables, newest}),
      signal,
    }).then((response) => (response.ok ? (response.json() as Promise<AffinityProductsAnswer>) : null));
}

/** The home page's request: "For you" and "New" together. */
export const askHomeLists = askAffinityProducts(true);

/** The other blocks' request: "For you" alone (the cart, the empty places). */
export const askForYou = askAffinityProducts(false);

/** The option values of the visitor's on the page under way, as `"option name\nvalue name"`: the options mark them. */
export const YoursContext = createContext<ReadonlySet<string>>(new Set());

/** The key a value has in `YoursContext`. */
export const yoursKey = (option: string, value: string) => `${option}\n${value}`;

type CardOptions = {
  options: Array<{optionValues: Array<{id: string; firstSelectableVariant?: {availableForSale: boolean} | null}>}>;
};

/** A card's option values in stock: those whose first variant can be bought. */
export const cardValuesInStock = (product: CardOptions) =>
  product.options.flatMap((option) =>
    option.optionValues.filter((value) => value.firstSelectableVariant?.availableForSale).map((value) => value.id),
  );

/**
 * What `rankByAffinity` reads of a card: its categories (asked by the lists it orders), brand, lowest price and
 * option values in stock.
 */
export function describeProductItem<
  P extends CardOptions & {
    vendorDetails?: {id: string} | null;
    priceRange: {minVariantPrice: {amount: string}};
    collections?: {nodes: Array<{id: string}>} | null;
  },
>(product: P): AffinityRankedProduct {
  const price = Number(product.priceRange.minVariantPrice.amount);
  return {
    categoryIds: product.collections?.nodes.map((collection) => collection.id) ?? [],
    vendorId: product.vendorDetails?.id ?? null,
    price: Number.isFinite(price) ? price : null,
    optionValueIds: cardValuesInStock(product),
  };
}

/** A variant as the product page has it: whole, or as a value's first one. */
type PageVariant = {id: string; availableForSale: boolean; selectedOptions: Array<{name: string; value: string}>};

type PageOption = {
  name: string;
  optionValues: Array<{id: string; name: string; firstSelectableVariant?: PageVariant | null}>;
};

/** A product page's variant as `useAffinityChoice` weighs it. */
export type AffinityPageVariant = {
  id: string;
  available: boolean;
  optionValueIds: string[];
  selectedOptions: PageVariant['selectedOptions'];
};

/**
 * A product page's variants as Affinity weighs them (`useAffinityChoice`): the variants the page has whole, then each
 * value's first variant, with their option values' ids.
 */
export function productAffinityVariants(options: PageOption[], whole: readonly PageVariant[]): AffinityPageVariant[] {
  const idOf = new Map(
    options.flatMap((option) =>
      option.optionValues.map((value) => [yoursKey(option.name, value.name), value.id] as const),
    ),
  );
  const variants = new Map<string, AffinityPageVariant>();
  const add = (variant: PageVariant) => {
    if (variants.has(variant.id)) return;
    variants.set(variant.id, {
      id: variant.id,
      available: variant.availableForSale,
      optionValueIds: variant.selectedOptions.flatMap((option) => idOf.get(yoursKey(option.name, option.value)) ?? []),
      selectedOptions: variant.selectedOptions,
    });
  };
  whole.forEach(add);
  for (const option of options)
    for (const value of option.optionValues) if (value.firstSelectableVariant) add(value.firstSelectableVariant);
  return [...variants.values()];
}

type CardValueOf = {id: string; firstSelectableVariant?: {availableForSale: boolean} | null};

/**
 * A card's values of the visitor's (T-679): the strongest of the option the card offers to choose, in stock — the card
 * shows it chosen, with its picture — and whether another option (a size) has one of theirs in stock: "your size".
 */
export function visitorsCardValues<V extends CardValueOf>(
  options: ReadonlyArray<{name: string; optionValues: readonly V[]}>,
  swatchOption: string | null,
  input: AffinityListsInput | null,
): {swatch: V | null; hasYours: boolean} {
  if (!input) return {swatch: null, hasYours: false};
  const inStock = (option: {optionValues: readonly V[]}) =>
    option.optionValues.filter((value) => value.firstSelectableVariant?.availableForSale);
  const swatchValues = inStock(options.find((option) => option.name === swatchOption) ?? {optionValues: []});
  const [best] = visitorOptionValues(
    swatchValues.map((value) => value.id),
    input,
  );
  const others = options.filter((option) => option.name !== swatchOption).flatMap((option) => inStock(option));
  return {
    swatch: swatchValues.find((value) => value.id === best) ?? null,
    hasYours:
      visitorOptionValues(
        others.map((value) => value.id),
        input,
      ).length > 0,
  };
}

type CartLineProduct = {
  merchandise: {
    product: {
      id: string;
      vendor?: string | null;
      vendorDetails?: {handle: string} | null;
      /** A line just added, before the cart comes back, has none (B-622). */
      collections?: {nodes: Array<{id: string}>} | null;
    };
  };
};

/** A cart as Affinity's lists take it (T-679): its products, their categories and their brands, by handle or name. */
export function cartForAffinity(lines: readonly CartLineProduct[]): AffinityCart {
  const products = lines.map((line) => line.merchandise.product);
  return {
    productIds: [...new Set(products.map((product) => product.id))],
    categoryIds: [
      ...new Set(products.flatMap((product) => (product.collections?.nodes ?? []).map((collection) => collection.id))),
    ],
    vendors: [...new Set(products.flatMap((product) => product.vendorDetails?.handle || product.vendor || []))],
  };
}
