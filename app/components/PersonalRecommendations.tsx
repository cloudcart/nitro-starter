import {type RefObject, useEffect, useRef, useState} from 'react';
import {useAutoLoad, useKeptRecommendations, useAffinity} from '@cloudcart/nitrogen-react';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {ReviewDisplayProvider} from '~/components/ReviewDisplay';
import type {RecommendationsAnswer} from '~/routes/recommendations';

type PersonalIntent = 'PERSONALIZED' | 'CART';

/**
 * A personal list for a block (T-667), from what the visitor's browser keeps: the answer made ahead
 * (`usePrepareRecommendations` in the root) at once, then `/recommendations` asked again as the visitor nears the
 * element `ref` is on; null until the first answer. `PersonalRecommendations` and the cart panel's list
 * (`CartPanelRecommendations`, T-669) both show it.
 */
export function usePersonalRecommendations<T extends HTMLElement>(
  intent: PersonalIntent,
  cartProductIds?: readonly string[],
): {answer: RecommendationsAnswer | null; viewedProductIds: string[]; ref: RefObject<T | null>} {
  const kept = useKeptRecommendations<RecommendationsAnswer>(intent);
  const {viewedProductIds, context} = useAffinity();
  const [fresh, setFresh] = useState<RecommendationsAnswer | null>(null);
  const [asked, setAsked] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const load = () => {
    setAsked(true);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    void fetch('/recommendations', {
      method: 'POST',
      headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
      body: JSON.stringify({intent, context: context({cartProductIds})}),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? (response.json() as Promise<RecommendationsAnswer>) : null))
      .then((answer) => {
        if (answer) setFresh(answer);
      })
      .catch(() => {
        // The kept answer, or nothing, stays.
      });
  };
  useEffect(() => () => requestRef.current?.abort(), []);

  const ref = useRef<T>(null);
  useAutoLoad(ref, {load, limit: 1, paused: asked});

  return {answer: fresh ?? kept, viewedProductIds, ref};
}

/**
 * A list of products for this visitor, from what their browser keeps (T-667): `PERSONALIZED` on the home page, `CART`
 * with the cart's products. Shown at once from an answer made ahead, then asked again as the visitor nears it; until
 * the first answer, `placeholders` cards hold its place. Nothing when the answer has no products. `title` names the
 * list: personal or not, as the answer says. Give it the cart as its `key` where it follows the cart, so a changed
 * cart is asked again.
 */
export function PersonalRecommendations({
  intent,
  cartProductIds,
  title,
  placeholders,
  className = '',
}: {
  intent: PersonalIntent;
  cartProductIds?: readonly string[];
  title: (personal: boolean) => string;
  placeholders: number;
  className?: string;
}) {
  const {answer, viewedProductIds, ref} = usePersonalRecommendations<HTMLDivElement>(intent, cartProductIds);
  if (answer && answer.products.length === 0) return null;

  return (
    <div ref={ref} className={className}>
      {answer ? (
        <ReviewDisplayProvider value={answer.reviewDisplay}>
          <ProductGrid title={title(answer.personal)} products={answer.products} />
        </ReviewDisplayProvider>
      ) : (
        placeholders > 0 && <ProductGridPlaceholder title={title(viewedProductIds.length > 0)} count={placeholders} />
      )}
    </div>
  );
}
