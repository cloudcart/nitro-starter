/** What the helpers read of a variant: its id. */
type Variant = {id: string};

/** What the helpers read of a product: its loaded variant and that variant's neighbours. */
type WithVariants<V extends Variant> = {selectedOrFirstAvailableVariant?: V | null; adjacentVariants: V[]};

/** The variants a product page has with every field it shows: the loaded one and its neighbours. */
export function variantsWhole<V extends Variant>(product: WithVariants<V>): V[] {
  const loaded = product.selectedOrFirstAvailableVariant;
  return loaded ? [loaded, ...product.adjacentVariants] : product.adjacentVariants;
}

/**
 * The product as the page shows it. A variant chosen without the loader (`useOptimisticVariant`, settled) is its loaded
 * one — the form's tiers are its own — and every variant the page has whole is a neighbour, the loaded one too: its
 * options' values pick them with no loader either (T-597). While a variant comes through the loader, the loaded one
 * stays.
 */
export function productAsShown<V extends Variant, P extends WithVariants<V>>(
  product: P,
  selectedVariant: (V & {isOptimistic?: boolean}) | null | undefined,
  wholeVariants: V[],
): P {
  if (
    !selectedVariant ||
    selectedVariant.isOptimistic ||
    selectedVariant.id === product.selectedOrFirstAvailableVariant?.id
  )
    return product;
  return {...product, selectedOrFirstAvailableVariant: selectedVariant, adjacentVariants: wholeVariants};
}
