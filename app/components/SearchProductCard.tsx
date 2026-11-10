import {Fragment} from 'react';
import {searchHighlights} from '@cloudcart/nitrogen';
import {Image, KeptLink} from '@cloudcart/nitrogen-react';
import type {SearchProductFragment} from 'storefrontapi.generated';
import {StockStatus} from '~/components/StockStatus';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import {Price} from '~/components/ui/Price';
import type {SearchLook} from '~/lib/search';
import {getVariantUrl} from '~/lib/variants';

/** What the search shows of a product: its picture (the variant's when it has one), title and price, and its stock when it cannot be bought. */
export const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    id
    title
    handle
    featuredImage {
      url
      altText
      width
      height
    }
    selectedOrFirstAvailableVariant(selectedOptions: [], ignoreUnknownOptions: true) {
      availableForSale
      statusType
      statusName
      currentlyNotInStock
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
        formatted
      }
      # Shown beside the price where the merchant's Aura Search shows the price before the discount (T-645).
      compareAtPrice {
        amount
        currencyCode
        formatted
      }
      # The link opens the variant the card shows: the one the search words name (T-645).
      selectedOptions {
        name
        value
      }
    }
  }
` as const;

/**
 * The widths a search card's picture is offered in: the card is at most about 160 px wide, so 200 to 600 px cover
 * 1× to 3× screens. The CDN makes each; no larger copy is ever shrunk by the browser.
 */
const CARD_IMAGE_WIDTHS = {intervals: 3, startingWidth: 200, incrementSize: 200, placeholderWidth: 100};

/** A search card's place while its product loads: the picture's box, the title's two lines and the price's (B-436). */
export function SearchProductCardPlaceholder() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <span className="block aspect-card bg-surface" />
      <span className="h-[2lh] w-3/4 bg-surface" />
      <span className="h-lh w-1/3 bg-surface" />
    </div>
  );
}

/** The standard search's card: the price alone, no marked words. */
const STANDARD_LOOK = {highlightMatches: false, showPrice: true, showCompareAtPrice: false};

/**
 * A product in the search: its picture whole in the card's frame (`aspect-card`, as every product card), the title on
 * two lines at most and the price — and, when none of its variants can be bought, its stock status as the product page
 * says it (B-429); following it opens the variant it shows and calls `onNavigate`, which closes the search. On a store
 * with Aura Search the merchant's settings decide the marked words of `query` and the prices (T-645).
 */
export function SearchProductCard({
  product,
  onNavigate,
  query = '',
  look = STANDARD_LOOK,
  onOpen,
}: {
  product: SearchProductFragment;
  onNavigate: () => void;
  /** The words searched for, marked in the title when `look.highlightMatches`. */
  query?: string;
  look?: Pick<SearchLook, 'highlightMatches' | 'showPrice' | 'showCompareAtPrice'>;
  /** Called as the product opens: the search's click report. */
  onOpen?: () => void;
}) {
  const variant = product.selectedOrFirstAvailableVariant;
  const image = variant?.image ?? product.featuredImage;

  return (
    <KeptLink
      to={getVariantUrl({
        handle: product.handle,
        searchParams: new URLSearchParams(),
        selectedOptions: variant?.selectedOptions,
      })}
      onClick={() => {
        onOpen?.();
        onNavigate();
      }}
      className="group flex flex-col gap-2 hover:no-underline"
    >
      <span className="block aspect-card overflow-hidden">
        {image ? (
          <Image
            data={image}
            alt=""
            sizes="(min-width: 750px) 10rem, 45vw"
            srcSetOptions={CARD_IMAGE_WIDTHS}
            className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </span>
      <span className="line-clamp-2 group-hover:underline">
        <SearchText text={product.title} query={look.highlightMatches ? query : ''} />
      </span>
      {variant && look.showPrice && (
        <Price price={variant.price} compareAtPrice={look.showCompareAtPrice ? variant.compareAtPrice : null} />
      )}
      {variant && !variant.availableForSale && <StockStatus variant={variant} />}
    </KeptLink>
  );
}

/** A text with the words of `query` marked, by Aura Search's rule (`searchHighlights`); as it is for no query. */
export function SearchText({text, query}: {text: string; query: string}) {
  if (!query.trim()) return text;

  const pieces = searchHighlights(text, query);
  // Each piece keyed by where it starts in the text.
  const starts = pieces.map((_, i) => pieces.slice(0, i).reduce((length, piece) => length + piece.text.length, 0));

  return pieces.map((piece, i) =>
    piece.match ? (
      <mark key={starts[i]} className="bg-transparent font-medium text-foreground">
        {piece.text}
      </mark>
    ) : (
      <Fragment key={starts[i]}>{piece.text}</Fragment>
    ),
  );
}
