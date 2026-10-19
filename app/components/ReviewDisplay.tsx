import {createContext, type ReactNode, use} from 'react';
import type {ProductReviewDisplayFragment} from 'storefrontapi.generated';

/**
 * How the merchant has products' ratings shown (`productReviewSettings`), read with a page's own data: whether product
 * cards show ratings (`ReviewDisplayProvider`) and a rating without reviews. The product page's reviews section asks
 * its own settings beside these (`REVIEWS_SECTION_DISPLAY_FRAGMENT`, B-441).
 */
export const PRODUCT_REVIEW_DISPLAY_FRAGMENT = `#graphql
  fragment ProductReviewDisplay on ProductReviewSettings {
    hideRatingWithoutReviews
    showRatingInLists
  }
` as const;

/** How the merchant has products' ratings shown (`productReviewSettings`), as a page read it with its own data. */
const ReviewDisplayContext = createContext<ProductReviewDisplayFragment | null>(null);

/**
 * Gives the product cards inside it the merchant's rating settings. Each page that shows cards reads
 * `productReviewSettings` in its own query (`...ProductReviewDisplay`): without them, the cards show no rating.
 */
export function ReviewDisplayProvider({
  value,
  children,
}: {
  value: ProductReviewDisplayFragment | null | undefined;
  children: ReactNode;
}) {
  return <ReviewDisplayContext value={value ?? null}>{children}</ReviewDisplayContext>;
}

/** Whether a product's rating is shown: always once it has reviews, and without any unless the merchant hides it then. */
export function showsRating(summary: {totalCount: number}, display: ProductReviewDisplayFragment | null): boolean {
  return summary.totalCount > 0 || display?.hideRatingWithoutReviews === false;
}

/**
 * Whether every product card shows a rating row, whatever its product: ratings in lists, also without reviews. A card's
 * place while it loads keeps the row then (`ProductItemPlaceholder`).
 */
export function useEveryCardRated(): boolean {
  const display = use(ReviewDisplayContext);
  return Boolean(display?.showRatingInLists && display.hideRatingWithoutReviews === false);
}

/**
 * Whether a product card shows the product's rating: only when the merchant shows ratings in product lists
 * (`showRatingInLists`), and then as on the product page (`showsRating`).
 */
export function useCardRating(summary: {totalCount: number} | null | undefined): boolean {
  const display = use(ReviewDisplayContext);
  return Boolean(summary && display?.showRatingInLists && showsRating(summary, display));
}
