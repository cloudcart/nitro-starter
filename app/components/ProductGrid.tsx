import {useId} from 'react';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {ProductItem, ProductItemPlaceholder} from '~/components/ProductItem';
import {SectionHeading} from '~/components/SectionHeading';

/**
 * A grid of products across the page's width (a home section, "You may also like"): two, three, then four a row. It
 * lives here, not with the listing's toolbar, so a page without a listing does not load the toolbar for it.
 */
export const PRODUCT_GRID_CLASSES = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

/** How many cards a grid shows: two rows of four on a desktop. */
const MAX_PRODUCTS = 8;

/**
 * A titled grid of product cards: two on a phone, three from 750 px, four from 990 px; at most eight. With `to`,
 * "View all" beside the title leads to the whole list. Nothing when there are no products.
 */
export function ProductGrid({
  title,
  products,
  to,
  className = '',
}: {
  title: string;
  products: ProductItemFragment[];
  to?: string;
  className?: string;
}) {
  const titleId = useId();
  if (!products.length) return null;

  return (
    <section aria-labelledby={titleId} className={className}>
      <SectionHeading id={titleId} title={title} to={to} />
      <ul className={`grid gap-x-4 gap-y-8 ${PRODUCT_GRID_CLASSES}`}>
        {products.slice(0, MAX_PRODUCTS).map((product) => (
          <li key={product.id}>
            <ProductItem product={product} loading="lazy" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A grid's place while its products load: its heading and `count` cards' places (at most eight), so the page does not
 * grow and shift when they arrive (B-410).
 */
export function ProductGridPlaceholder({
  title,
  to,
  count = MAX_PRODUCTS,
  className = '',
}: {
  title: string;
  to?: string;
  count?: number;
  className?: string;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} aria-busy="true" className={className}>
      <SectionHeading id={titleId} title={title} to={to} />
      <ul className={`grid gap-x-4 gap-y-8 ${PRODUCT_GRID_CLASSES}`}>
        {Array.from({length: Math.min(count, MAX_PRODUCTS)}, (_, index) => (
          <li key={index} aria-hidden="true">
            <ProductItemPlaceholder />
          </li>
        ))}
      </ul>
    </section>
  );
}
