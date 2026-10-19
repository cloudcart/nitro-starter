import {Suspense} from 'react';
import {Await, Link, useFetcher, useLocation, useRouteLoaderData} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import type {RootLoader} from '~/root';
import type {FormError} from '~/components/FormFields';
import {HeartFilledIcon, HeartIcon} from '~/components/ui/icons';
import {signInPath} from '~/lib/urls';

/**
 * The round button's look: a fixed circle that never gives way to a long title beside it. On the product page it
 * stands on the page, bordered; on a card it floats over the image.
 */
const BUTTON_CLASSES = {
  page: 'size-10 border border-border bg-background hover:border-foreground',
  card: 'size-9 bg-background/90 shadow-raised backdrop-blur-glass hover:bg-background',
} as const;

/** Where a refusal's message stands beside the heart: under it, towards the page's middle. */
const MESSAGE_SIDE = {page: 'right-0', card: 'left-0'} as const;

const buttonClass = (place: keyof typeof BUTTON_CLASSES) =>
  `flex shrink-0 items-center justify-center rounded-full text-foreground transition-colors disabled:opacity-60 ${BUTTON_CLASSES[place]}`;

/**
 * Adds a product to the signed-in customer's wishlist, or removes it. A
 * signed-out visitor is taken to sign in.
 */
export function WishlistButton({productId, place = 'card'}: {productId: string; place?: keyof typeof BUTTON_CLASSES}) {
  const {t} = useTranslation();
  const root = useRouteLoaderData<RootLoader>('root');
  // Signed in, the visitor comes back to this page (B-455).
  const location = useLocation();

  return (
    <Suspense fallback={<Heart filled={false} place={place} />}>
      <Await resolve={root?.wishlist} errorElement={<Heart filled={false} place={place} />}>
        {(wishlist) =>
          wishlist ? (
            <WishlistToggle productId={productId} inWishlist={wishlist.includes(productId)} place={place} />
          ) : (
            <Link
              to={signInPath(location.pathname + location.search)}
              aria-label={t('wishlist.signIn')}
              className={buttonClass(place)}
            >
              <HeartIcon className="size-5" />
            </Link>
          )
        }
      </Await>
    </Suspense>
  );
}

function WishlistToggle({
  productId,
  inWishlist,
  place,
}: {
  productId: string;
  inWishlist: boolean;
  place: keyof typeof BUTTON_CLASSES;
}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<{inWishlist?: boolean; errors?: FormError[]}>();
  // While the change is on its way, show its outcome.
  const pending = fetcher.formData?.get('intent');
  const filled = pending ? pending === 'add' : (fetcher.data?.inWishlist ?? inWishlist);
  // A refused change: the heart is back as it was, and says why (B-424).
  const refused = fetcher.state === 'idle' ? fetcher.data?.errors?.[0] : undefined;

  return (
    <fetcher.Form method="post" action="/account/wishlist" className="relative">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        name="intent"
        value={filled ? 'remove' : 'add'}
        aria-label={filled ? t('wishlist.remove') : t('wishlist.add')}
        className={buttonClass(place)}
        disabled={fetcher.state !== 'idle'}
      >
        {filled ? <HeartFilledIcon className="size-5" /> : <HeartIcon className="size-5" />}
      </button>
      {/* Always in the page, so a screen reader announces what fills it. */}
      <p
        role="status"
        className={
          refused
            ? `absolute top-full z-10 mt-2 w-max max-w-40 rounded-card bg-foreground px-3 py-2 text-small text-background shadow-overlay ${MESSAGE_SIDE[place]}`
            : 'sr-only'
        }
      >
        {refused && (refused.message || t('form.error'))}
      </p>
    </fetcher.Form>
  );
}

function Heart({filled, place}: {filled: boolean; place: keyof typeof BUTTON_CLASSES}) {
  return (
    <span className={buttonClass(place)} aria-hidden="true">
      {filled ? <HeartFilledIcon className="size-5" /> : <HeartIcon className="size-5" />}
    </span>
  );
}
