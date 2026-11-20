import {useId, useRef, useState} from 'react';
import {type AffinityCart, useTranslation} from '@cloudcart/nitrogen';
import {useAffinityProducts, useAutoLoad} from '@cloudcart/nitrogen-react';
import {useAside} from '~/components/Aside';
import {forYouProducts} from '~/components/ForYou';
import {ProductRow} from '~/components/ProductRow';
import {askForYou} from '~/lib/affinity';

/** How many products the panel shows under the cart's lines. */
const SHOWN = 4;

/**
 * The cart panel's recommendations (T-669, T-679): up to four products for this cart from Affinity's lists — the
 * cart's categories and brands, and the visitor's — one row each under the cart's lines: picture, title, price and a
 * round add, as the product page's linked products. Asked as the panel shows them. Following one closes the panel.
 * Nothing until there is an answer, and nothing when it is empty. Give it the cart's products as its `key`, so a
 * changed cart is asked again.
 */
export function CartPanelRecommendations({cart}: {cart: AffinityCart}) {
  const {t} = useTranslation();
  const titleId = useId();
  const {close} = useAside();
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useAutoLoad(ref, {load: () => setNear(true), limit: 1, paused: near});
  const affinity = useAffinityProducts({shown: SHOWN, cart, request: askForYou, paused: !near});
  const products = forYouProducts(affinity, SHOWN);

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
