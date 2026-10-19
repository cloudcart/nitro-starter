import {useEffect, useId, useRef} from 'react';
import {useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {useAutoLoad} from '@cloudcart/nitrogen-react';
import {RECENTLY_VIEWED, useProductList} from '~/lib/product-lists';
import type {loader} from '~/routes/recently-viewed';
import {PRODUCT_GRID_CLASSES, ProductGrid} from './ProductGrid';
import {ProductItemPlaceholder} from './ProductItem';
import {SectionHeading} from './SectionHeading';

/**
 * The products the visitor viewed before this one, from the list their browser keeps; this product is added to it.
 * They are asked for only as the visitor nears the section (T-550): until then a card placeholder each holds its place.
 */
export function RecentlyViewed({productId}: {productId: string}) {
  const {t} = useTranslation();
  const titleId = useId();
  const {ids, add} = useProductList(RECENTLY_VIEWED);
  const fetcher = useFetcher<typeof loader>();
  const others = ids.filter((id) => id !== productId).slice(0, 8);
  const query = others.join(',');

  useEffect(() => {
    add(productId);
  }, [add, productId]);

  const sectionRef = useRef<HTMLElement>(null);
  useAutoLoad(sectionRef, {
    load: () => void fetcher.load(`/recently-viewed?ids=${encodeURIComponent(query)}`),
    limit: 1,
    paused: !query || fetcher.data !== undefined || fetcher.state !== 'idle',
  });

  if (!query) return null;
  if (fetcher.data) return <ProductGrid title={t('product.recentlyViewed')} products={fetcher.data.products ?? []} />;

  return (
    <section ref={sectionRef} aria-labelledby={titleId} aria-busy="true">
      <SectionHeading id={titleId} title={t('product.recentlyViewed')} />
      <ul className={`grid gap-x-4 gap-y-8 ${PRODUCT_GRID_CLASSES}`}>
        {others.map((id) => (
          <li key={id} aria-hidden="true">
            <ProductItemPlaceholder />
          </li>
        ))}
      </ul>
    </section>
  );
}
