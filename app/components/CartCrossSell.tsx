import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {getCartUserErrors} from '@cloudcart/nitrogen';
import {CartOfferDialog, OFFER_ROUTE} from '~/components/CartOfferDialog';
import type {action as offerAction, loader as offerLoader} from '~/routes/cart.offer';

/**
 * The store's cross-sell on the cart page, read once per visit, as the store's own cart page shows it: a `POPUP`
 * offer opens with its products to add; an `ADD_TO_CART` offer's products are put into the cart, and shown when
 * the merchant asks (`showAddedProducts`).
 */
export function CartCrossSell({hasLines}: {hasLines: boolean}) {
  const reader = useFetcher<typeof offerLoader>();
  const applier = useFetcher<typeof offerAction>();
  const appliedRef = useRef<string | null>(null);
  const [closed, setClosed] = useState(false);
  const offer = reader.data?.offer ?? null;

  // Read once the cart has lines; a change to the cart does not read it again.
  useEffect(() => {
    if (hasLines && reader.state === 'idle' && !reader.data) void reader.load(OFFER_ROUTE);
  }, [hasLines, reader]);

  // An offer that adds its products does so once, as the page shows it.
  useEffect(() => {
    if (offer?.display !== 'ADD_TO_CART' || appliedRef.current === offer.id) return;
    appliedRef.current = offer.id;
    void applier.submit({intent: 'apply', offerId: offer.id}, {method: 'post', action: OFFER_ROUTE});
  }, [offer, applier]);

  if (!offer || closed) return null;

  if (offer.display === 'ADD_TO_CART') {
    const applied = applier.state === 'idle' && applier.data != null && getCartUserErrors(applier.data).length === 0;
    if (!offer.showAddedProducts || !applied) return null;
    return <CartOfferDialog offer={offer} added onClose={() => setClosed(true)} />;
  }

  return <CartOfferDialog offer={offer} onClose={() => setClosed(true)} />;
}
