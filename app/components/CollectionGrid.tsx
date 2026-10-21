import {useId} from 'react';
import {Image, KeptLink} from '@cloudcart/nitrogen-react';
import type {CollectionCardFragment} from 'storefrontapi.generated';
import {SectionHeading} from '~/components/SectionHeading';
import {collectionPath} from '~/lib/urls';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';

/** What a collection card shows, for the queries of the pages that list collections. */
export const COLLECTION_CARD_FRAGMENT = `#graphql
  fragment CollectionCard on Collection {
    id
    title
    onlineStoreUrl
    image {
      url
      width
      height
    }
  }
` as const;

/** How many cards a collection grid shows: two rows of four on a desktop. */
const MAX_COLLECTIONS = 8;

/**
 * A collection card's picture width in the page, for the browser to pick its size (B-393): the grid's two columns, four
 * from 990 px, with 1rem gaps in the page box (90rem, gutters of 2.5rem from 750 px and 1.25rem below).
 */
const COLLECTION_CARD_SIZES =
  '(min-width: 1440px) 328px, (min-width: 990px) calc(25vw - 32px), (min-width: 750px) calc(50vw - 48px), calc(50vw - 28px)';

/** A category or smart collection: its image at 4:3 (a picture sign without one) and its title under it. */
export function CollectionCard({
  collection,
  loading = 'lazy',
  sizes = COLLECTION_CARD_SIZES,
}: {
  collection: CollectionCardFragment;
  loading?: 'eager' | 'lazy';
  /** The image's width in the page, for the browser to pick its size: a quarter of it by default. */
  sizes?: string;
}) {
  return (
    <KeptLink to={collectionPath(collection)} className="group flex flex-col gap-3 hover:no-underline">
      <div className="aspect-[4/3] overflow-hidden rounded-card bg-surface">
        {collection.image ? (
          <Image
            data={collection.image}
            // The title is in the same link: the picture adds nothing for a screen reader (B-444).
            alt=""
            aspectRatio="4/3"
            sizes={sizes}
            loading={loading}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      <span className="text-card group-hover:underline">{collection.title}</span>
    </KeptLink>
  );
}

/**
 * A titled grid of collection cards: two on a phone, four from 990 px; at most eight. With `to`, "View all" beside
 * the title. Nothing when there are no collections.
 */
export function CollectionGrid({
  title,
  collections,
  to,
  className = '',
}: {
  title: string;
  collections: CollectionCardFragment[];
  to?: string;
  className?: string;
}) {
  const titleId = useId();
  if (!collections.length) return null;

  return (
    <section aria-labelledby={titleId} className={className}>
      <SectionHeading id={titleId} title={title} to={to} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
        {collections.slice(0, MAX_COLLECTIONS).map((collection, index) => (
          <li key={collection.id}>
            <CollectionCard collection={collection} loading={index < 4 ? 'eager' : 'lazy'} />
          </li>
        ))}
      </ul>
    </section>
  );
}
