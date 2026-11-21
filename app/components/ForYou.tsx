import {type AffinityCart, pickAffinityProducts, useTranslation} from '@cloudcart/nitrogen';
import {AffinityWhyProvider, useAffinityProducts, type UseAffinityProductsResult} from '@cloudcart/nitrogen-react';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {ReviewDisplayProvider} from '~/components/ReviewDisplay';
import {askForYou, describeProductItem} from '~/lib/affinity';
import type {AffinityProductsAnswer} from '~/routes/affinity-products';

/** How many products "For you" shows: two rows of four. */
export const FOR_YOU_SHOWN = 8;

/**
 * "For you" from an answer a page already asked for (`useAffinityProducts`): the visitor's lists' products ordered by
 * what of the visitor each matches — category, brand and price first (`pickAffinityProducts`) — without what they saw,
 * bought or have in the cart. Placeholders while it is asked for a visitor the browser
 * knows; nothing for one it does not know, nothing on the server, and nothing when no product is left.
 */
export function ForYouGrid({
  affinity,
  shown = FOR_YOU_SHOWN,
  title,
  className = '',
}: {
  affinity: UseAffinityProductsResult<AffinityProductsAnswer>;
  shown?: number;
  /** The grid's title: "Recommended for you" when not given. */
  title?: string;
  className?: string;
}) {
  const {t} = useTranslation();
  const heading = title ?? t('home.forYou');
  if (!forYouShown(affinity, shown)) return null;
  if (affinity.state === 'pending')
    return <ProductGridPlaceholder title={heading} count={shown} className={className} />;
  const products = forYouProducts(affinity, shown);
  if (!affinity.answer) return null;
  return (
    <ReviewDisplayProvider value={affinity.answer.reviewDisplay}>
      {/* Each card says why it is here while the Affinity overlay is on (T-681). */}
      <AffinityWhyProvider value={{input: affinity.input}}>
        <ProductGrid title={heading} products={products} className={className} />
      </AffinityWhyProvider>
    </ReviewDisplayProvider>
  );
}

/**
 * Whether "For you" shows anything: its placeholders while it is asked for a visitor the browser knows, or its
 * products once answered. The home page shows the merchant's "Featured" only when it does not (T-684).
 */
export function forYouShown(affinity: UseAffinityProductsResult<AffinityProductsAnswer>, shown: number) {
  if (affinity.state === 'pending') return affinity.lists.length > 0;
  return forYouProducts(affinity, shown).length > 0;
}

/** "For you"'s products from an answer: ordered for the visitor, without those left out; none before. */
export function forYouProducts(affinity: UseAffinityProductsResult<AffinityProductsAnswer>, shown: number) {
  return affinity.state === 'ready' && affinity.answer && affinity.input
    ? pickAffinityProducts(affinity.answer.forYou, affinity.input, describeProductItem, {
        leaveOut: affinity.leaveOut,
        first: shown,
      })
    : [];
}

/**
 * "For you" on a page of its own: the empty cart, a search with no results, the missing page, the account, an empty
 * wishlist — asked once the page has hydrated, for a visitor the browser knows.
 */
export function ForYou({
  className = '',
  shown = FOR_YOU_SHOWN,
  cart,
  title,
}: {
  className?: string;
  shown?: number;
  /** For a cart: its categories and brands lead, its products are left out. */
  cart?: AffinityCart;
  title?: string;
}) {
  const affinity = useAffinityProducts({shown, cart, request: askForYou});
  return <ForYouGrid affinity={affinity} shown={shown} title={title} className={className} />;
}
