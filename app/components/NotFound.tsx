import {useEffect} from 'react';
import {useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {MENU_PRODUCTS} from '~/components/MegaMenu';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {ReviewDisplayProvider} from '~/components/ReviewDisplay';
import {ButtonLink} from '~/components/ui/Button';
import type {loader as menuProductsLoader} from '~/routes/menu-products';

/**
 * The page for an address the store does not have: the message, "Continue shopping", and four of the store's
 * featured products. An error boundary has no loader of its own, so the products are loaded once the page is in the
 * browser, from the same route the mega menu uses.
 */
export function NotFound() {
  const {t} = useTranslation();
  const products = useFetcher<typeof menuProductsLoader>();

  // `fetcher` is a new object on every render, but its `load` stays the same.
  const {load} = products;
  useEffect(() => {
    void load('/menu-products');
  }, [load]);

  return (
    <div className="mx-auto max-w-page px-gutter py-16 md:px-gutter-md">
      <div className="mx-auto flex max-w-column flex-col items-center gap-4 text-center">
        {/* Light, yet at 3:1 as large text: no check flags it (B-432). */}
        <p aria-hidden="true" className="text-h1 text-control">
          404
        </p>
        <h1 className="text-title">{t('notFound.title')}</h1>
        <p className="text-muted">{t('notFound.text')}</p>
        <ButtonLink to="/categories" className="mt-2">
          {t('notFound.continue')}
        </ButtonLink>
      </div>
      {/* While the products load, their places: the page does not grow under the visitor (B-436). */}
      {products.data ? (
        <ReviewDisplayProvider value={products.data.reviewDisplay}>
          <ProductGrid title={t('notFound.products')} products={products.data.products} className="mt-16" />
        </ReviewDisplayProvider>
      ) : (
        <ProductGridPlaceholder title={t('notFound.products')} count={MENU_PRODUCTS} className="mt-16" />
      )}
    </div>
  );
}
