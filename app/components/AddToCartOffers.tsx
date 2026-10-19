import {useEffect, useState} from 'react';
import {type CartApiUpSellOffer, getCartUserErrors, type OptimisticCartLineInput} from '@cloudcart/nitrogen';
import {useAddToCart} from '@cloudcart/nitrogen-react';
import {useAside} from '~/components/Aside';
import {CartActionMessages} from '~/components/CartActionMessages';
import {CartOfferDialog, OfferAnswer, showsOfferAnswer} from '~/components/CartOfferDialog';
import type {action as cartAction} from '~/routes/cart';

/**
 * The store's answer to an add that asked for the up-sell (`upSell="check"`), read from the add's fetcher, as the
 * platform answers any add, a listing's included (`AddToCartRequest`'s `up_sell` rule):
 * - an up-sell: its dialog, which stays until the merchant's chain of offers ends; declining adds the line as it was
 *   (B-193);
 * - the line added: the cross-sell the add answered with, or the cart;
 * - a refusal: under the button (`refusals="here"`), or in the cart, which says why (`refusals="cart"`).
 * The product page and a card's quick add share it (B-213). `onSettled` runs once the answer is dealt with.
 */
export function AddToCartOffers({
  fetcherKey,
  line,
  refusals,
  onSettled,
}: {
  fetcherKey: string;
  line: OptimisticCartLineInput | null | undefined;
  refusals: 'here' | 'cart';
  onSettled?: () => void;
}) {
  const {open} = useAside();
  const {add, fetcher} = useAddToCart<typeof cartAction>({fetcherKey});
  // The store's answer as soon as it is in, not after the page's data reloads; never the last one while an add is on its way.
  const answer = fetcher.state !== 'submitting' ? fetcher.data : undefined;
  const [offers, setOffers] = useState<{upSell: CartApiUpSellOffer | null; answer: typeof answer}>({
    upSell: null,
    answer,
  });
  if (answer !== offers.answer) {
    setOffers((current) => ({upSell: answer && 'upSellOffer' in answer ? answer.upSellOffer : current.upSell, answer}));
  }
  const added = answer && 'cart' in answer && answer.cart && getCartUserErrors(answer).length === 0 ? answer : null;
  const refused = answer && !added && !offers.upSell && !('upSellOffer' in answer) ? answer : null;
  const crossSell = added && !offers.upSell && showsOfferAnswer(added.crossSellOffer) ? added.crossSellOffer : null;
  useEffect(() => {
    if (offers.upSell || crossSell) return;
    if (added || (refused && refusals === 'cart')) {
      open('cart');
      onSettled?.();
    }
  }, [added, refused, crossSell, offers.upSell, refusals, open, onSettled]);

  return (
    <>
      {refusals === 'here' && answer && !offers.upSell && <CartActionMessages data={answer} />}
      {offers.upSell && line && (
        <CartOfferDialog
          offer={offers.upSell}
          onDecline={() => add([line], {upSell: 'skip'})}
          onClose={({took}) => {
            setOffers((current) => ({...current, upSell: null}));
            if (took) {
              open('cart');
              onSettled?.();
            }
          }}
        />
      )}
      <OfferAnswer
        offer={crossSell}
        onClose={() => {
          open('cart');
          onSettled?.();
        }}
      />
    </>
  );
}
