import {Image, KeptLink} from '@cloudcart/nitrogen-react';
import type {SearchProductFragment} from 'storefrontapi.generated';
import {StockStatus} from '~/components/StockStatus';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import {Price} from '~/components/ui/Price';
import {productPath} from '~/lib/urls';

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

/**
 * A product in the search: its picture whole in the card's frame (`aspect-card`, as every product card), the title on
 * two lines at most and the price — and, when none of its variants can be bought, its stock status as the product page
 * says it (B-429); following it calls `onNavigate`, which closes the search.
 */
export function SearchProductCard({product, onNavigate}: {product: SearchProductFragment; onNavigate: () => void}) {
  const variant = product.selectedOrFirstAvailableVariant;
  const image = variant?.image ?? product.featuredImage;

  return (
    <KeptLink
      to={productPath(product.handle)}
      onClick={onNavigate}
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
      <span className="line-clamp-2 group-hover:underline">{product.title}</span>
      {variant && <Price price={variant.price} />}
      {variant && !variant.availableForSale && <StockStatus variant={variant} />}
    </KeptLink>
  );
}
