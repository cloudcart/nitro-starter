import type {ReactNode} from 'react';
import {Image} from '@cloudcart/nitrogen-react';
import type {ProductItemImageFragment} from 'storefrontapi.generated';
import {ImagePlaceholder} from '~/components/ui/ImagePlaceholder';

/**
 * A slide's width in the page, for the browser to pick the copy that fills it. From the product page's layout: the
 * page box (`max-w-page`, 90rem, and its gutters, 2.5rem from 750 px and 1.25rem below), the 7:5 grid with its 4rem gap
 * from 990 px, and beside the slide there the thumbnails' column (64 px and a 12 px gap); from 750 px to 990 px the slide
 * takes the box's width, and on a phone the screen's, edge to edge. The square is also capped by the screen's height,
 * which only a short screen reaches.
 */
export const SLIDE_SIZES = {
  withThumbnails:
    '(min-width: 1440px) 680px, (min-width: 990px) calc(58.34vw - 160px), (min-width: 750px) calc(100vw - 80px), 100vw',
  alone:
    '(min-width: 1440px) 756px, (min-width: 990px) calc(58.34vw - 84px), (min-width: 750px) calc(100vw - 80px), 100vw',
};

/** The gallery's square: as wide as its column, never taller than the screen; on a phone in whole pixels (B-356). */
export const GALLERY_STAGE = 'aspect-square max-h-sticky-height w-full max-md:h-photo-square';

/** The gallery's frame: the stage, and from 750 px the thumbnails — under it, then to its left from 990 px. */
export const GALLERY_FRAME = 'flex flex-col gap-3 lg:flex-row-reverse lg:items-start';

/** A product's title on its page, and on the page being opened. A word longer than the row breaks at its edge (B-358). */
export const PRODUCT_TITLE = 'min-w-0 text-product wrap-break-word';

/** A product's vendor by name, over its title. */
export const PRODUCT_VENDOR = 'text-small tracking-label text-muted uppercase';

/**
 * A product page's two columns, the gallery and the info — on the page, and on the page being opened (`PendingPage`).
 * One column as wide as the page below 990 px: nothing in it — a title's long word, say — widens it (B-358). On a phone
 * the gallery runs from edge to edge of the screen, outside the page's gutters; on a desktop it stays in view beside the
 * info column until that column ends.
 */
export function ProductColumns({gallery, info}: {gallery: ReactNode; info: ReactNode}) {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <div data-page-photo className="-mx-gutter md:mx-0 lg:sticky lg:top-sticky-top lg:self-start">
        {gallery}
      </div>
      {info}
    </div>
  );
}

/**
 * The gallery of a product page being opened, from its card: the picture the page opens on where the gallery shows
 * it — at once as the card showed it, and over it the gallery's own size of it, asked for now, which the gallery then
 * finds loaded — and from two pictures the thumbnails' room.
 */
export function GalleryPlaceholder({
  image,
  picture,
  pictures,
}: {
  image?: ProductItemImageFragment | null;
  /** The address the card's picture was loaded from. */
  picture?: string;
  pictures: number;
}) {
  return (
    <div aria-hidden="true" className={GALLERY_FRAME}>
      <div className="min-w-0 flex-1 max-md:@container">
        <div className={`relative flex ${GALLERY_STAGE}`}>
          {picture && <img src={picture} alt="" className="absolute inset-0 size-full object-contain" />}
          {image ? (
            <Image
              data={image}
              alt=""
              loading="eager"
              fetchPriority="high"
              sizes={pictures > 1 ? SLIDE_SIZES.withThumbnails : SLIDE_SIZES.alone}
              className="relative size-full object-contain"
            />
          ) : (
            !picture && <ImagePlaceholder />
          )}
        </div>
      </div>
      {pictures > 1 && (
        <div className="hidden shrink-0 gap-2 md:flex lg:flex-col">
          {Array.from({length: pictures}, (_, index) => (
            <span key={index} className="size-16 shrink-0 bg-surface" />
          ))}
        </div>
      )}
    </div>
  );
}
