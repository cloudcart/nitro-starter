import {Suspense} from 'react';
import {Await} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {ProductItemFragment, ProductReviewDisplayFragment} from 'storefrontapi.generated';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {ReviewDisplayProvider} from '~/components/ReviewDisplay';

/**
 * "You may also like": products like the cart's first one, as they arrive, `placeholders` cards' places until then
 * (B-410). Nothing for an empty cart.
 */
export function CartRecommendations({
  recommendations,
  placeholders,
}: {
  recommendations: Promise<{products: ProductItemFragment[]; reviewDisplay: ProductReviewDisplayFragment | null}>;
  placeholders: number;
}) {
  const {t} = useTranslation();

  return (
    <Suspense
      fallback={
        placeholders > 0 && <ProductGridPlaceholder title={t('cart.alsoLike')} count={placeholders} className="mt-16" />
      }
    >
      <Await resolve={recommendations} errorElement={null}>
        {({products, reviewDisplay}) =>
          products.length > 0 && (
            <ReviewDisplayProvider value={reviewDisplay}>
              <ProductGrid title={t('cart.alsoLike')} products={products} className="mt-16" />
            </ReviewDisplayProvider>
          )
        }
      </Await>
    </Suspense>
  );
}
