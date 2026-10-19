import {data, useLoaderData} from 'react-router';
import {getPaginationVariables, useTranslation} from '@cloudcart/nitrogen';
import {PaginatedResourceSection} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/account.wishlist';
import {errorMeta, metaTranslator, privateMeta} from '~/lib/meta';
import type {AccountWishlistItemFragment} from 'storefrontapi.generated';
import {AccountSection} from '~/components/AccountSection';
import {ProductItem} from '~/components/ProductItem';
import {buttonClass} from '~/components/ui/Button';
import {CUSTOMER_USER_ERROR_FRAGMENT, PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';
import {PRODUCT_REVIEW_DISPLAY_FRAGMENT, ReviewDisplayProvider} from '~/components/ReviewDisplay';
import type {FormError} from '~/components/FormFields';
import {AccountRouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, payloadOf} from '~/lib/action';
import {EmptyState} from '~/components/ui/EmptyState';
import {ButtonLink} from '~/components/ui/Button';
import {HeartIcon} from '~/components/ui/icons';
import {missingResource} from '~/lib/missing';

/**
 * A card's picture in the wishlist: two columns, three from 990 px beside the account menu (14rem and a 3rem gap),
 * with 1rem gaps in the page box (90rem, gutters of 2.5rem from 750 px and 1.25rem below).
 */
const WISHLIST_CARD_SIZES =
  '(min-width: 1440px) 352px, (min-width: 990px) calc(33.34vw - 128px), (min-width: 750px) calc(50vw - 48px), calc(50vw - 28px)';

/** An error shows in the account's column, under its heading, translated (B-201, B-433). */
export const ErrorBoundary = AccountRouteErrorBoundary;

export const meta: Route.MetaFunction = ({error, matches}) =>
  error ? errorMeta(matches) : privateMeta(metaTranslator(matches)('account.nav.wishlist'));

/** /account/wishlist — the products the customer saved, newest first. */
export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {customer, productReviewSettings, errors} = await customerAccount.query(WISHLIST_QUERY, {
    variables: {...getPaginationVariables(request, {pageBy: 24}), buyer: await customerAccount.getBuyer()},
  });
  if (!customer) throw missingResource(errors, 'Customer not found');

  return {wishlist: customer.wishlist, reviewDisplay: productReviewSettings};
}

/**
 * Adds a product to the wishlist or removes it. The heart on every product
 * card posts here, from any page.
 */
export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;
  // A refusal by its code: no page shows it, as the heart already asks a guest to sign in (`wishlist.signIn`).
  if (!(await customerAccount.isLoggedIn()))
    return data({inWishlist: false, errors: [{field: null, message: '', code: 'UNAUTHENTICATED'}]}, {status: 401});

  const form = await request.formData();
  const productId = String(form.get('productId') ?? '');

  if (form.get('intent') === 'remove') {
    const removed = payloadOf(
      await customerAccount.mutate(WISHLIST_REMOVE_MUTATION, {variables: {productId}}),
      'customerWishlistRemove',
    );
    const errors: FormError[] = removed ? removed.customerUserErrors : [API_ERROR];
    return data({inWishlist: errors.length > 0, errors}, {status: errors.length ? 400 : 200});
  }

  const added = payloadOf(
    await customerAccount.mutate(WISHLIST_ADD_MUTATION, {variables: {productId}}),
    'customerWishlistAdd',
  );
  const errors: FormError[] = added ? added.customerUserErrors : [API_ERROR];
  return data({inWishlist: errors.length === 0, errors}, {status: errors.length ? 400 : 200});
}

export default function Wishlist() {
  const {t} = useTranslation();
  const {wishlist, reviewDisplay} = useLoaderData<typeof loader>();

  return (
    <AccountSection title={t('account.nav.wishlist')}>
      {wishlist.nodes.length ? (
        <ReviewDisplayProvider value={reviewDisplay}>
          <PaginatedResourceSection<AccountWishlistItemFragment>
            connection={wishlist}
            ariaLabel={t('account.nav.wishlist')}
            resourcesClassName="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3"
            paginationClassName={`${buttonClass('secondary')} mx-auto my-10 flex w-fit`}
            nextLabel={t('listing.loadMore')}
            previousLabel={t('listing.loadPrevious')}
            loadingLabel={t('listing.loading')}
          >
            {({node: item, index}) => (
              <ProductItem
                key={item.id}
                product={item.product}
                loading={index < 6 ? 'eager' : 'lazy'}
                sizes={WISHLIST_CARD_SIZES}
              />
            )}
          </PaginatedResourceSection>
        </ReviewDisplayProvider>
      ) : (
        <EmptyState
          icon={HeartIcon}
          text={t('account.wishlist.none')}
          action={
            <ButtonLink to="/categories" variant="secondary">
              {t('account.wishlist.browse')}
            </ButtonLink>
          }
        />
      )}
    </AccountSection>
  );
}

const WISHLIST_QUERY = `#graphql
  fragment AccountWishlistItem on WishlistItem {
    id
    product {
      ...ProductItem
    }
  }
  query AccountWishlist(
    $customerAccessToken: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    productReviewSettings {
      ...ProductReviewDisplay
    }
    customer(customerAccessToken: $customerAccessToken) {
      wishlist(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...AccountWishlistItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
  ${PRODUCT_REVIEW_DISPLAY_FRAGMENT}
` as const;

const WISHLIST_ADD_MUTATION = `#graphql
  mutation AccountWishlistAdd($customerAccessToken: String!, $productId: ID!) {
    customerWishlistAdd(customerAccessToken: $customerAccessToken, productId: $productId) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;

const WISHLIST_REMOVE_MUTATION = `#graphql
  mutation AccountWishlistRemove($customerAccessToken: String!, $productId: ID!) {
    customerWishlistRemove(customerAccessToken: $customerAccessToken, productId: $productId) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;
