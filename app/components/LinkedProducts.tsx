import {useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {AddToCartButton, Image, useAutoLoad, KeptLink} from '@cloudcart/nitrogen-react';
import type {LinkedProductFragment, LinkedProductsPageFragment} from 'storefrontapi.generated';
import {AddToCartOffers} from '~/components/AddToCartOffers';
import {CardPrice} from '~/components/CardPrice';
import {CartIcon, ChevronLeftIcon, ChevronRightIcon} from '~/components/ui/icons';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';
import {ADD_TO_CART_FETCHER_KEY} from '~/lib/cart';
import {formatMeasure} from '~/lib/format';
import {quickAddOf} from '~/lib/quick-add';
import {productPath} from '~/lib/urls';
import type {loader as linkedProductsLoader} from '~/routes/linked-products';

/** How many linked products a request brings; the next ones come as the visitor reaches the last. */
export const LINKED_PAGE_SIZE = 10;

/** A page of the carousel: only what its card renders and its add sends. */
export const LINKED_PRODUCTS_FRAGMENT = `#graphql
  fragment LinkedProductMoney on MoneyV2 {
    amount
    currencyCode
    formatted
  }
  fragment LinkedProductImage on Image {
    altText
    url
    width
    height
  }
  fragment LinkedProduct on Product {
    id
    handle
    title
    availableForSale
    productType
    options {
      name
      values
    }
    featuredImage {
      ...LinkedProductImage
    }
    discount {
      hideDiscountPrice
    }
    priceRange {
      minVariantPrice {
        ...LinkedProductMoney
      }
      maxVariantPrice {
        ...LinkedProductMoney
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: [], ignoreUnknownOptions: true) {
      id
      availableForSale
      minimumQuantity
      price {
        ...LinkedProductMoney
      }
      compareAtPrice {
        ...LinkedProductMoney
      }
      image {
        ...LinkedProductImage
      }
      unitPriceMeasurement {
        quantityValue
        quantityUnit
      }
    }
  }
  fragment LinkedProductsPage on ProductConnection {
    nodes {
      ...LinkedProduct
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
` as const;

/**
 * The products the merchant linked to this one (`linkedProducts`), as a carousel at the end of the info column (the
 * user, T-550): its heading with "1/3" and two arrows, one card a slide, swiped on a touch screen. Nothing is asked
 * until the visitor nears it, and nothing shows until the store answers: most products have none, so no placeholder
 * comes and goes. The next ones load as the visitor reaches the last loaded. Nothing when there are none.
 */
export function LinkedProducts({handle}: {handle: string}) {
  const {t} = useTranslation();
  const titleId = useId();
  const fetcher = useFetcher<typeof linkedProductsLoader>();
  // The pages loaded, each added once as the fetcher brings it; `from` is the answer last added.
  const [loaded, setLoaded] = useState<{pages: LinkedProductsPageFragment[]; from: unknown}>({pages: [], from: null});
  if (fetcher.data && fetcher.data !== loaded.from) {
    const page = fetcher.data.linked;
    setLoaded({pages: page ? [...loaded.pages, page] : loaded.pages, from: fetcher.data});
  }

  const answered = loaded.from !== null;
  const products = loaded.pages.flatMap((page) => page.nodes);
  const last = loaded.pages.at(-1);
  const total = Math.max(last?.totalCount ?? 0, products.length);
  const busy = fetcher.state !== 'idle';
  const load = () => {
    const params = new URLSearchParams({handle});
    if (last?.pageInfo.endCursor) params.set('after', last.pageInfo.endCursor);
    void fetcher.load(`/linked-products?${params}`);
  };

  // Before the answer, a mark of no height where the carousel goes (its negative margin takes back the column's gap).
  const nearRef = useRef<HTMLDivElement>(null);
  useAutoLoad(nearRef, {load, limit: 1, paused: answered || busy});

  // The slide in view follows the track's scroll; the arrows scroll it a slide's width.
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const go = (to: number) => {
    const track = trackRef.current;
    track?.scrollTo({left: to * track.clientWidth});
  };

  if (!answered) return <div ref={nearRef} aria-hidden="true" className="-mt-6" />;
  if (!products.length) return null;

  return (
    <section aria-labelledby={titleId} aria-roledescription={t('gallery.carousel')}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-subheading">
          {t('product.related.complementary')}
        </h2>
        {total > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={t('product.related.previous')}
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:text-muted disabled:hover:bg-transparent"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span aria-hidden="true" className="min-w-8 text-center text-small tabular-nums">
              {index + 1}/{total}
            </span>
            <button
              type="button"
              aria-label={t('product.related.next')}
              disabled={index >= products.length - 1}
              onClick={() => go(index + 1)}
              className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:text-muted disabled:hover:bg-transparent"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        )}
      </div>
      <ul
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          const shown = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
          if (shown !== index) setIndex(shown);
          // The last loaded in view: the next ones.
          if (shown >= products.length - 1 && last?.pageInfo.hasNextPage && !busy) load();
        }}
        className="scrollbar-none mt-3 flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {products.map((product, at) => (
          <li
            key={product.id}
            aria-roledescription={t('gallery.slide')}
            aria-label={t('gallery.position', {index: at + 1, total})}
            className="w-full shrink-0 snap-start"
          >
            <LinkedProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A linked product: its picture, title and price, each a link to it, under them how much it holds when the store sells
 * it by a unit (the Units app: "360 ml"), and a round add on the right.
 */
function LinkedProductCard({product}: {product: LinkedProductFragment}) {
  const {language} = useTranslation();
  const url = productPath(product.handle);
  const image = product.featuredImage;
  const measure = product.selectedOrFirstAvailableVariant?.unitPriceMeasurement;
  return (
    <div className="flex items-center gap-4 rounded-card bg-surface p-4">
      <KeptLink to={url} tabIndex={-1} aria-hidden="true" className="size-20 shrink-0">
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
        <KeptLink to={url} className="font-medium wrap-break-word">
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
      <LinkedProductAdd product={product} url={url} />
    </div>
  );
}

/**
 * The card's add, as the listing card's quick add: straight to the cart when nothing is left to choose, with the store's
 * up-sell asked first; otherwise a link to the product to choose there. None for a sold-out product.
 */
function LinkedProductAdd({product, url}: {product: LinkedProductFragment; url: string}) {
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
      <KeptLink to={url} aria-label={t('product.chooseOptions')} className={round}>
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
