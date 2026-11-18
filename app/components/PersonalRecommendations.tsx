import {useEffect, useRef, useState} from 'react';
import {useAutoLoad, useKeptRecommendations, useVisitorSignals} from '@cloudcart/nitrogen-react';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {ReviewDisplayProvider} from '~/components/ReviewDisplay';
import type {RecommendationsAnswer} from '~/routes/recommendations';

/**
 * A list of products for this visitor, from what their browser keeps (T-667): `PERSONALIZED` on the home page, `CART`
 * with the cart's products. Shown at once from an answer made ahead (`usePrepareRecommendations` in the root), then
 * asked again as the visitor nears it; until the first answer, `placeholders` cards hold its place. Nothing when the
 * answer has no products. `title` names the list: personal or not, as the answer says. Give it the cart as its `key`
 * where it follows the cart, so a changed cart is asked again.
 */
export function PersonalRecommendations({
  intent,
  cartProductIds,
  title,
  placeholders,
  className = '',
}: {
  intent: 'PERSONALIZED' | 'CART';
  cartProductIds?: readonly string[];
  title: (personal: boolean) => string;
  placeholders: number;
  className?: string;
}) {
  const kept = useKeptRecommendations<RecommendationsAnswer>(intent);
  const {viewedProductIds, context} = useVisitorSignals();
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

  const sectionRef = useRef<HTMLDivElement>(null);
  useAutoLoad(sectionRef, {load, limit: 1, paused: asked});

  const answer = fresh ?? kept;
  if (answer && answer.products.length === 0) return null;

  return (
    <div ref={sectionRef} className={className}>
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
