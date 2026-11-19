import {useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {useAutoLoad} from '@cloudcart/nitrogen-react';
import type {LinkedProductsPageFragment} from 'storefrontapi.generated';
import {ChevronLeftIcon, ChevronRightIcon} from '~/components/ui/icons';
import {ProductRow} from '~/components/ProductRow';
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
            <ProductRow product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
