import {Analytics, useTranslation} from '@cloudcart/nitrogen';
import type {CollectionQuery, ProductReviewDisplayFragment} from 'storefrontapi.generated';
import {collectionPath} from '~/lib/urls';
import type {Crumb} from './Breadcrumbs';
import {ListingHeader} from './ListingHeader';
import {ProductListing} from './ProductListing';
import {ReviewDisplayProvider} from './ReviewDisplay';
import {ListingDescription} from './ListingDescription';
import {listedProducts} from '~/lib/analytics';

type Collection = NonNullable<CollectionQuery['collection']>;

type CrumbCollection = {id: string; title: string; onlineStoreUrl?: string | null};

/** The breadcrumb of a category: its parents, then itself — on its own page, and above a product it is the main one of. */
export function collectionCrumbs(collection: CrumbCollection & {breadcrumb: CrumbCollection[]}): Crumb[] {
  const parents = collection.breadcrumb.filter((item) => item.id !== collection.id);
  return [
    ...parents.map((item) => ({title: item.title, to: collectionPath(item)})),
    {title: collection.title, to: collectionPath(collection)},
  ];
}

/** A category or smart collection: its header with the subcategories that have products, then its products. */
export function CollectionView({
  collection,
  reviewDisplay,
}: {
  collection: Collection;
  reviewDisplay: ProductReviewDisplayFragment | null;
}) {
  const {t} = useTranslation();
  // Every child, as the platform's category page lists them: it does not hide one without products (B-212).
  const children = collection.children.nodes;

  return (
    <div className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md">
      <ListingHeader
        crumbs={collectionCrumbs(collection)}
        title={collection.title}
        links={children.map((child) => ({title: child.title, to: collectionPath(child)}))}
        linksLabel={t('listing.subcategories')}
      />
      <ReviewDisplayProvider value={reviewDisplay}>
        <ProductListing
          products={collection.products}
          after={<ListingDescription html={collection.descriptionHtml} className="mt-16" />}
        />
      </ReviewDisplayProvider>
      <Analytics.CollectionView
        data={{
          collection: {id: collection.id, handle: collection.handle, title: collection.title},
          products: listedProducts(collection.products.nodes),
        }}
      />
    </div>
  );
}
