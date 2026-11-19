import {useId} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {useAside} from '~/components/Aside';
import {usePersonalRecommendations} from '~/components/PersonalRecommendations';
import {ProductRow} from '~/components/ProductRow';

/**
 * The cart panel's recommendations (T-669): up to four products for this cart (`CART`, the cart page's list), one row
 * each under the cart's lines — picture, title, price and a round add, as the product page's linked products — loaded
 * as the panel shows them, at once when made ahead. Following one closes the panel. Nothing until there is an answer,
 * and nothing when it is empty. Give it the cart's products as its `key`, so a changed cart is asked again.
 */
export function CartPanelRecommendations({cartProductIds}: {cartProductIds: readonly string[]}) {
  const {t} = useTranslation();
  const titleId = useId();
  const {close} = useAside();
  const {answer, ref} = usePersonalRecommendations<HTMLElement>('CART', cartProductIds);
  const products = answer?.products ?? [];

  return (
    <section ref={ref} aria-labelledby={products.length > 0 ? titleId : undefined} className="px-5 pb-5">
      {products.length > 0 && (
        <>
          <h2 id={titleId} className="mb-3 text-subheading">
            {t('cart.alsoLike')}
          </h2>
          <ul className="flex flex-col gap-3">
            {products.map((product) => (
              <li key={product.id}>
                <ProductRow product={product} onOpen={close} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
