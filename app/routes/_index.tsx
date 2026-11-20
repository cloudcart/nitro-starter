import {Suspense} from 'react';
import {Await, useLoaderData, useRouteLoaderData} from 'react-router';
import {Analytics, generateOrganizationJsonLd, mergeAffinityLists, useTranslation} from '@cloudcart/nitrogen';
import {
  keptPageLoader,
  AffinityWhyProvider,
  useAffinityProducts,
  useOrderByInterest,
  type UseAffinityProductsResult,
} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/_index';
import {metaTranslator, rootData, seoMeta, storeOrigin} from '~/lib/meta';
import type {CollectionCardFragment, HomeProductsQuery, ProductItemFragment} from 'storefrontapi.generated';
import {COLLECTION_CARD_FRAGMENT, CollectionGrid} from '~/components/CollectionGrid';
import {Hero} from '~/components/Hero';
import {FOR_YOU_SHOWN, ForYouGrid} from '~/components/ForYou';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {VENDOR_CARD_FRAGMENT, VendorGrid} from '~/components/VendorCard';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {HOME_PRODUCT_GRIDS, type HomeProductList} from '~/lib/home';
import {askHomeLists} from '~/lib/affinity';
import type {AffinityProductsAnswer} from '~/routes/affinity-products';
import type {RootLoader} from '~/root';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT, ReviewDisplayProvider} from '~/components/ReviewDisplay';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({data, matches}) => {
  const shop = rootData(matches)?.header.shop;
  const url = `${storeOrigin(matches)}/`;
  const logo = shop?.brand?.logo?.image ?? undefined;
  // The home page's own SEO, as the merchant set it on its SEO tab; the store's name and description without it, and
  // without a description a sentence of our own, as every page has (B-405).
  const seo = data?.homePageSeo;
  const t = metaTranslator(matches);
  return seoMeta(matches, {
    title: seo?.title || shop?.name || t('navigation.home'),
    description:
      seo?.description || shop?.description?.slice(0, 160) || (shop ? t('seo.home', {store: shop.name}) : undefined),
    url,
    image: logo,
    jsonLd: shop ? [generateOrganizationJsonLd({...shop, logo, contact: data?.contact}, url)] : undefined,
  });
};

export const shouldRevalidate = skipCartAndWishlistRevalidation;

export async function loader(args: Route.LoaderArgs) {
  // Start the data below the fold without holding up the first byte…
  const deferredData = loadDeferredData(args);

  // …and wait only for what the first screen needs.
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/** The categories at the top of the page. If they fail, the page fails. */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {collections, shop} = await context.storefront.query(HOME_COLLECTIONS_QUERY);

  // The top-level categories with products, in the merchant's order: the first of the store's categories page. The
  // home page's SEO is for its title and description, the store's contact for its Organization markup.
  return {collections: collections.nodes, homePageSeo: shop.homePageSeo, contact: shop.contact};
}

/** The product rows below the fold. The page renders without them if they fail. */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;

  // Prices are the signed-in customer's own: their customer group's prices and discounts.
  const products = customerAccount
    .getBuyer()
    .then((buyer) => storefront.query(HOME_PRODUCTS_QUERY, {variables: {buyer}}))
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {products};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');
  const shop = root?.header.shop;
  // The visitor's lists, built in their browser (T-679): "For you" and "New" in their order, one request.
  const affinity = useAffinityProducts({shown: FOR_YOU_SHOWN, request: askHomeLists});

  return (
    <div>
      <Hero shopName={shop?.name ?? ''} />
      {/* The visitor's own list first, under the hero: nothing while the browser knows none of their interests. */}
      <ForYouGrid affinity={affinity} className="mx-auto max-w-page px-gutter pt-14 md:px-gutter-md" />
      <HomeCategories collections={data.collections} />
      <ProductGrids products={data.products} affinity={affinity} />
      <Analytics.HomeView />
    </div>
  );
}

const collectionId = (collection: {id: string}) => collection.id;

/**
 * "Shop by category": the top-level categories in the visitor's order of interest (T-670) — a category whose
 * subcategories they met first — the merchant's order on the server and for a visitor the browser knows nothing about.
 * Up to 50 come with the page, the same for every visitor; the grid shows the first 8.
 */
function HomeCategories({collections}: {collections: CollectionCardFragment[]}) {
  const {t} = useTranslation();
  const ordered = useOrderByInterest(collections, 'category', collectionId);

  return (
    // Each category's place and why, while the Affinity overlay is on (T-682).
    <AffinityWhyProvider value={{interest: {dimension: 'category', ids: ordered.map(collectionId)}}}>
      <CollectionGrid
        title={t('home.collections')}
        collections={[...ordered]}
        to="/categories"
        className="mx-auto max-w-page px-gutter pt-14 md:px-gutter-md"
      />
    </AffinityWhyProvider>
  );
}

/**
 * A home list in the visitor's order: "New" from their own lists newest first — the strongest list's first — then the
 * store's newest after them; the store's own list for a visitor the browser knows nothing about (T-679).
 */
function listFor(
  list: HomeProductList,
  store: ProductItemFragment[],
  affinity: UseAffinityProductsResult<AffinityProductsAnswer>,
): ProductItemFragment[] {
  if (list !== 'newest' || affinity.state !== 'ready' || !affinity.answer) return store;
  return mergeAffinityLists([...affinity.answer.newest, store], {leaveOut: affinity.leaveOut, first: store.length});
}

function ProductGrids({
  products,
  affinity,
}: {
  products: Promise<HomeProductsQuery | null>;
  affinity: UseAffinityProductsResult<AffinityProductsAnswer>;
}) {
  const {t} = useTranslation();

  return (
    <Suspense
      fallback={
        // The grids' places while they load (B-410).
        <div className="mx-auto flex max-w-page flex-col gap-16 px-gutter py-14 md:px-gutter-md">
          {HOME_PRODUCT_GRIDS.map(({list, title, to}) => (
            <ProductGridPlaceholder key={list} title={t(title)} to={to} />
          ))}
        </div>
      }
    >
      <Await resolve={products}>
        {(response) =>
          response ? (
            <ReviewDisplayProvider value={response.productReviewSettings}>
              <div className="mx-auto flex max-w-page flex-col gap-16 px-gutter py-14 md:px-gutter-md">
                {/* "Shop by brand", in the visitor's order of interest (T-670); none for a store without brands. */}
                <VendorGrid title={t('home.vendors')} vendors={response.vendors.nodes} to="/vendors" />
                {HOME_PRODUCT_GRIDS.map(({list, title, to}) => {
                  const grid = (
                    <ProductGrid
                      key={list}
                      title={t(title)}
                      products={listFor(list, response[list].nodes, affinity)}
                      to={to}
                    />
                  );
                  // "New" in the visitor's order: each card says why while the Affinity overlay is on (T-681).
                  return list === 'newest' && affinity.state === 'ready' ? (
                    <AffinityWhyProvider key={list} value={{input: affinity.input}}>
                      {grid}
                    </AffinityWhyProvider>
                  ) : (
                    grid
                  );
                })}
              </div>
            </ReviewDisplayProvider>
          ) : null
        }
      </Await>
    </Suspense>
  );
}

const HOME_COLLECTIONS_QUERY = `#graphql
  query HomeCollections {
    shop {
      homePageSeo {
        title
        description
      }
      contact {
        email
        phone
        companyName
        vatNumber
        registrationNumber
        address {
          address1
          city
          zip
          countryCodeV2
        }
      }
    }
    # Up to 50, so the visitor's order of interest can bring forward a category past the merchant's first 8 (T-670).
    collections(first: 50, topLevel: true, withProducts: true, sortKey: MANUAL) {
      nodes {
        ...CollectionCard
      }
    }
  }
  ${COLLECTION_CARD_FRAGMENT}
` as const;

const HOME_PRODUCTS_QUERY = `#graphql
  query HomeProducts($buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    featured: products(first: 8, filters: [{isFeatured: true}]) {
      nodes {
        ...ProductItem
      }
    }
    newest: products(first: 8, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...ProductItem
      }
    }
    # The brands, ordered in the browser by the visitor's interest (T-670): one page for every visitor.
    vendors: vendorsConnection(first: 100) {
      nodes {
        ...VendorCard
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
  ${VENDOR_CARD_FRAGMENT}
` as const;
