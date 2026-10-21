import {Suspense} from 'react';
import {Await, useLoaderData, useRouteLoaderData} from 'react-router';
import {Analytics, generateOrganizationJsonLd, useTranslation} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/_index';
import {metaTranslator, rootData, seoMeta, storeOrigin} from '~/lib/meta';
import type {HomeProductsQuery} from 'storefrontapi.generated';
import {COLLECTION_CARD_FRAGMENT, CollectionGrid} from '~/components/CollectionGrid';
import {Hero} from '~/components/Hero';
import {ProductGrid, ProductGridPlaceholder} from '~/components/ProductGrid';
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {HOME_PRODUCT_GRIDS} from '~/lib/home';
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
  const {t} = useTranslation();
  const data = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');
  const shop = root?.header.shop;

  return (
    <div>
      <Hero shopName={shop?.name ?? ''} />
      <CollectionGrid
        title={t('home.collections')}
        collections={data.collections}
        to="/categories"
        className="mx-auto max-w-page px-gutter pt-14 md:px-gutter-md"
      />
      <ProductGrids products={data.products} />
      <Analytics.HomeView />
    </div>
  );
}

function ProductGrids({products}: {products: Promise<HomeProductsQuery | null>}) {
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
                {HOME_PRODUCT_GRIDS.map(({list, title, to}) => (
                  <ProductGrid key={list} title={t(title)} products={response[list].nodes} to={to} />
                ))}
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
    collections(first: 8, topLevel: true, withProducts: true, sortKey: MANUAL) {
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
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;
