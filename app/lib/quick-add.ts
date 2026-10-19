/**
 * What a card's quick add needs — the listing's card and the linked products' carousel (T-550): whether the product's
 * page must choose first — a bundle's parts, or a second value of an option the visitor has not chosen on the card —
 * and the line it adds: the least the store sells of the variant (B-196), with what the cart drawer shows of it until
 * the cart comes back.
 */
export function quickAddOf<V extends {id: string; minimumQuantity: number}, I>(
  product: {
    title: string;
    handle: string;
    productType?: string | null;
    featuredImage?: I | null;
    options: {name: string; values: string[]}[];
  },
  variant: V,
  /** The option whose value the visitor chose on the card: chosen already. */
  chosenOption?: string,
) {
  const needsChoice =
    product.productType === 'bundle' ||
    product.options.some((option) => option.name !== chosenOption && option.values.length > 1);
  const line = {
    merchandiseId: variant.id,
    quantity: variant.minimumQuantity,
    selectedVariant: {
      ...variant,
      title: product.title,
      image: product.featuredImage,
      selectedOptions: [],
      product: {handle: product.handle, title: product.title},
    },
  };
  return {needsChoice, line};
}
