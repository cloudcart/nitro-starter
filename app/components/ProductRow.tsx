import {type ComponentProps, useState} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {AddToCartButton, Image, KeptLink} from '@cloudcart/nitrogen-react';
import {AddToCartOffers} from '~/components/AddToCartOffers';
import {CardPrice} from '~/components/CardPrice';
import {CartIcon} from '~/components/ui/icons';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import {ADD_TO_CART_FETCHER_KEY} from '~/lib/cart';
import {formatMeasure} from '~/lib/format';
import {quickAddOf} from '~/lib/quick-add';
import {productPath} from '~/lib/urls';

/** What a row renders and its add sends: the linked products' fragment and the card's (`ProductItem`) both give it. */
export type ProductRowProduct = {
  handle: string;
  title: string;
  availableForSale: boolean;
  productType?: string | null;
  options: {name: string; values: string[]}[];
  featuredImage?: ComponentProps<typeof Image>['data'] | null;
  priceRange: ComponentProps<typeof CardPrice>['priceRange'];
  discount?: {hideDiscountPrice: boolean} | null;
  selectedOrFirstAvailableVariant?:
    | (NonNullable<ComponentProps<typeof CardPrice>['variant']> & {
        id: string;
        availableForSale: boolean;
        minimumQuantity: number;
        unitPriceMeasurement?: Parameters<typeof formatMeasure>[0] | null;
      })
    | null;
};

/**
 * A product in a row: its picture, title and price, each a link to it, under them how much it holds when the store sells
 * it by a unit (the Units app: "360 ml"), and a round add on the right — the product page's linked products and the
 * cart panel's recommendations (T-669). `onOpen` runs when a link to the product is followed (the panel closes).
 */
export function ProductRow({product, onOpen}: {product: ProductRowProduct; onOpen?: () => void}) {
  const {language} = useTranslation();
  const url = productPath(product.handle);
  const image = product.featuredImage;
  const measure = product.selectedOrFirstAvailableVariant?.unitPriceMeasurement;
  return (
    <div className="flex items-center gap-4 rounded-card bg-surface p-4">
      <KeptLink to={url} onClick={onOpen} tabIndex={-1} aria-hidden="true" className="size-20 shrink-0">
        {image ? (
          <Image
            data={image}
            alt=""
            width={80}
            aspectRatio="1/1"
            sizes="80px"
            loading="lazy"
            className="size-full object-contain"
          />
        ) : (
          <ImagePlaceholder className="size-full" />
        )}
      </KeptLink>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <KeptLink to={url} onClick={onOpen} className="font-medium wrap-break-word">
          {product.title}
        </KeptLink>
        <p>
          <CardPrice
            priceRange={product.priceRange}
            variant={product.selectedOrFirstAvailableVariant}
            discount={product.discount}
          />
        </p>
        {measure && <p className="text-small text-muted">{formatMeasure(measure, language)}</p>}
      </div>
      <ProductRowAdd product={product} url={url} onOpen={onOpen} />
    </div>
  );
}

/**
 * The card's add, as the listing card's quick add: straight to the cart when nothing is left to choose, with the store's
 * up-sell asked first; otherwise a link to the product to choose there. None for a sold-out product.
 */
function ProductRowAdd({product, url, onOpen}: {product: ProductRowProduct; url: string; onOpen?: () => void}) {
  const {t} = useTranslation();
  // This card asked: its add's answer — the store's up-sell, a cross-sell, the cart — is this card's to show.
  const [asked, setAsked] = useState(false);
  const variant = product.selectedOrFirstAvailableVariant;
  if (!product.availableForSale || !variant?.availableForSale) return null;

  const {needsChoice, line} = quickAddOf(product, variant);
  // `busy`: while the store answers, a turning ring in the icon's place, as every button shows it (B-452).
  const round =
    'busy grid size-11 shrink-0 place-items-center rounded-full bg-background text-foreground hover:bg-border hover:no-underline';

  if (needsChoice) {
    return (
      <KeptLink to={url} onClick={onOpen} aria-label={t('product.chooseOptions')} className={round}>
        <CartIcon className="size-5" />
      </KeptLink>
    );
  }
  return (
    <>
      <AddToCartButton
        className={round}
        onClick={() => setAsked(true)}
        fetcherKey={ADD_TO_CART_FETCHER_KEY}
        upSell="check"
        showErrors={false}
        lines={[line]}
      >
        <CartIcon aria-hidden="true" className="size-5" />
        <span className="sr-only">{t('product.addToCart')}</span>
      </AddToCartButton>
      {asked && (
        <AddToCartOffers
          fetcherKey={ADD_TO_CART_FETCHER_KEY}
          line={line}
          refusals="cart"
          onSettled={() => setAsked(false)}
        />
      )}
    </>
  );
}
