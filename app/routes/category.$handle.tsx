import {useLoaderData} from 'react-router';
import {generateCollectionJsonLd} from '@cloudcart/nitrogen';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/category.$handle';
import {listingUrl, metaTranslator, seoMeta, storeName, storeOrigin} from '~/lib/meta';
import {breadcrumbJsonLd} from '~/components/Breadcrumbs';
import {collectionCrumbs, CollectionView} from '~/components/CollectionView';
import {loadCollection} from '~/lib/collection';
import {collectionPath} from '~/lib/urls';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  // A page that throws is titled by the root's `meta`.
  if (!data) return [];
  const {collection} = data;
  const origin = storeOrigin(matches);
  const url = listingUrl(matches, collectionPath(collection), location.search);

  return seoMeta(matches, {
    title: collection.seo.title || collection.title,
    description:
      collection.seo.description ||
      collection.description?.slice(0, 160) ||
      metaTranslator(matches)('seo.collection', {collection: collection.title, store: storeName(matches)}),
    url,
    image: collection.image ?? undefined,
    jsonLd: [
      // Without the collection's picture, which the page does not show (B-456); it stays the shared picture.
      generateCollectionJsonLd({title: collection.title, description: collection.description}, url),
      breadcrumbJsonLd(origin, collectionCrumbs(collection), metaTranslator(matches)('navigation.home')),
    ],
  });
};

export const shouldRevalidate = skipCartAndWishlistRevalidation;

/** /category/{handle} — a category of the store, with facets, sorting and pages. */
export async function loader(args: Route.LoaderArgs) {
  return loadCollection(args, 'category');
}

export default function Category() {
  const {collection, reviewDisplay} = useLoaderData<typeof loader>();
  return <CollectionView collection={collection} reviewDisplay={reviewDisplay} />;
}
