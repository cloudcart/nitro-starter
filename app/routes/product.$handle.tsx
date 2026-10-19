import {type ComponentProps, type ReactNode, useState} from 'react';
import {data, type ShouldRevalidateFunction, useLoaderData, useRouteLoaderData} from 'react-router';
import {
  Analytics,
  analyticsInputFromRequest,
  generateProductJsonLd,
  getAdjacentAndFirstAvailableVariants,
  getMarketingPixels,
  hashEmail,
  getProductOptions,
  getSelectedProductOptions,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@cloudcart/nitrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import type {Route} from './+types/product.$handle';
import type {loader as reviewsLoader} from './product';
import {errorMeta, metaTranslator, seoMeta, storeName, storeOrigin} from '~/lib/meta';
import {Breadcrumbs, breadcrumbJsonLd, type Crumb} from '~/components/Breadcrumbs';
import {collectionCrumbs} from '~/components/CollectionView';
import {buyerUserAgent, type FormError} from '~/components/FormFields';
import {RelatedProducts} from '~/components/ProductExtras';
import {ProductGallery} from '~/components/ProductGallery';
import {SwipeablePage} from '~/components/SwipeablePage';
import {LinkedProducts} from '~/components/LinkedProducts';
import {ProductInfo} from '~/components/ProductInfo';
import type {ProductFormResult} from '~/components/ProductRequestForms';
import {ProductReviews, splitReviewsSearch} from '~/components/ProductReviews';
import {RecentlyViewed} from '~/components/RecentlyViewed';
import {ReviewDisplayProvider, showsRating} from '~/components/ReviewDisplay';
import {CART_USER_ERROR_FRAGMENT, FORM_USER_ERROR_FRAGMENT} from '~/lib/fragments';
import {productPath} from '~/lib/urls';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, formFields, integerOf, payloadOf} from '~/lib/action';
import {skipCartAndWishlistRevalidation} from '~/lib/cart';
import {loadProductPageSettings} from '~/lib/product-page';
import {useListingNeighbours} from '~/lib/listing-context';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

export const meta: Route.MetaFunction = ({data, error, matches}) => {
  if (error || !data) return errorMeta(matches);
  const {product} = data;
  // The canonical URL has no options, so every variant URL (`?Color=Red`) points search engines at the product.
  const url = `${storeOrigin(matches)}${productPath(product.handle)}`;

  return seoMeta(matches, {
    title: product.seo.title || product.title,
    description:
      product.seo.description ||
      product.description.slice(0, 160) ||
      metaTranslator(matches)('seo.product', {product: product.title, store: storeName(matches)}),
    url,
    type: 'product',
    image: product.featuredImage ?? undefined,
    jsonLd: [
      generateProductJsonLd(
        {
          ...product,
          statusType: product.selectedOrFirstAvailableVariant?.statusType,
          images: product.media.flatMap((media) =>
            media.mediaContentType === 'IMAGE' && media.previewImage ? [media.previewImage] : [],
          ),
          // Marked up only where the page shows it (Google's structured-data policies).
          reviewSummary:
            product.reviewSummary && showsRating(product.reviewSummary, data.settings.productReviewSettings)
              ? product.reviewSummary
              : null,
        },
        url,
      ),
      breadcrumbJsonLd(storeOrigin(matches), productCrumbs(product), metaTranslator(matches)('navigation.home')),
    ],
  });
};

/** The product's breadcrumb: its main category's path, then the product. */
function productCrumbs(product: {handle: string; title: string; collections: ProductFragment['collections']}): Crumb[] {
  const category = product.collections.nodes[0];
  return [...(category ? collectionCrumbs(category) : []), {title: product.title, to: productPath(product.handle)}];
}

/**
 * After a cart's form or a heart's, the root alone (`skipCartAndWishlistRevalidation`). An address that changes only
 * the reviews' page or star filter asks nothing here: the reviews are the parent route's (`routes/product.tsx`, B-376).
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  const {formMethod, currentUrl, nextUrl} = args;
  const onlyReviews =
    !formMethod &&
    currentUrl.href !== nextUrl.href &&
    currentUrl.pathname === nextUrl.pathname &&
    splitReviewsSearch(currentUrl).rest === splitReviewsSearch(nextUrl).rest;
  return onlyReviews ? false : skipCartAndWishlistRevalidation(args);
};

export async function loader(args: Route.LoaderArgs) {
  // The store's settings, which the first screen's forms follow.
  const settings = loadProductPageSettings(args);

  // Start the data below the fold first — it needs nothing from the product query, so it runs beside it…
  const deferredData = loadDeferredData(args);

  // …and wait only for what the first screen needs.
  const criticalData = await loadCriticalData(args, settings);

  return {...deferredData, ...criticalData};
}

async function loadCriticalData(
  {context, params, request}: Route.LoaderArgs,
  pageSettings: ReturnType<typeof loadProductPageSettings>,
) {
  const {handle} = params;
  const {storefront, customerAccount} = context;
  const buyer = await customerAccount.getBuyer();

  const [{product, errors}, settings] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request), buyer},
    }),
    pageSettings,
  ]);

  if (!product?.id) throw missingResource(errors, null);

  return {product, settings, isLoggedIn: Boolean(buyer)};
}

/**
 * Credit plans and store stock: the page renders without them if they fail. The credit plans are for the variant the
 * URL's options pick, asked on that variant in the same query. The reviews are the parent route's (`routes/product.tsx`):
 * they do not follow the variant (B-376). "You may also like" asks for itself as the visitor nears it (T-550).
 */
function loadDeferredData({context, params, request}: Route.LoaderArgs) {
  const {storefront, customerAccount} = context;
  const {handle} = params;

  const extras = customerAccount
    .getBuyer()
    .then((buyer) =>
      storefront.query(PRODUCT_EXTRAS_QUERY, {
        variables: {
          handle,
          selectedOptions: getSelectedProductOptions(request),
          buyer,
        },
      }),
    )
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {extras};
}

/**
 * The product page's forms: a review, a customer's answer to one, "notify me", a question about a product sold on
 * request, and the fast order. Each sends `intent`.
 */
export async function action({request, context}: Route.ActionArgs) {
  const {storefront, customerAccount} = context;
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const {text, optional} = formFields(form);
  const acceptedPolicyIds = form.getAll('acceptedPolicyIds').map(String);
  const buyer = await customerAccount.getBuyer();
  const answer = (result: Omit<ProductFormResult, 'intent'>) => data({intent, ...result});
  const failed = (errors: FormError[] | undefined) => !errors || errors.length > 0;
  // The API refused the whole form (B-202): said in the store's words, the API's messages logged.
  const refused = () => answer({ok: false, errors: [API_ERROR]});

  switch (intent) {
    case 'review': {
      const productReviewCreate = payloadOf(
        await storefront.mutate(REVIEW_CREATE_MUTATION, {
          variables: {
            buyer,
            input: {
              productId: String(form.get('productId')),
              // Anything but a whole number is sent as 0, which sf refuses with its own message.
              rating: integerOf(form.get('rating')) ?? 0,
              title: text('title'),
              comment: text('comment'),
              authorName: optional('authorName'),
              authorEmail: optional('authorEmail'),
            },
          },
        }),
        'productReviewCreate',
      );
      if (!productReviewCreate) return refused();
      const errors = productReviewCreate.userErrors;
      return answer({ok: !failed(errors), message: productReviewCreate.message, errors});
    }
    case 'reviewAnswer': {
      // Only a signed-in customer may answer, while the merchant takes answers: sf checks both.
      const productReviewAnswerCreate = payloadOf(
        await storefront.mutate(REVIEW_ANSWER_MUTATION, {
          variables: {buyer, input: {reviewId: String(form.get('reviewId')), comment: text('comment')}},
        }),
        'productReviewAnswerCreate',
      );
      if (!productReviewAnswerCreate) return refused();
      const errors = productReviewAnswerCreate.userErrors;
      return answer({ok: !failed(errors), message: productReviewAnswerCreate.message, errors});
    }
    case 'backInStock': {
      const productBackInStockSubscribe = payloadOf(
        await storefront.mutate(BACK_IN_STOCK_MUTATION, {
          variables: {
            buyer,
            input: {
              productId: String(form.get('productId')),
              variantId: optional('variantId'),
              firstName: text('firstName'),
              lastName: text('lastName'),
              email: optional('email'),
              phone: optional('phone'),
              acceptedPolicyIds,
              buyerUserAgent: buyerUserAgent(request),
            },
          },
        }),
        'productBackInStockSubscribe',
      );
      if (!productBackInStockSubscribe) return refused();
      const errors = productBackInStockSubscribe.userErrors;
      return answer({ok: productBackInStockSubscribe.subscribed, message: productBackInStockSubscribe.message, errors});
    }
    case 'inquiry': {
      const contactFormSubmit = payloadOf(
        await storefront.mutate(CONTACT_FORM_MUTATION, {
          variables: {
            buyer,
            input: {
              productId: optional('productId'),
              variantId: optional('variantId'),
              subject: text('subject'),
              message: text('message'),
              firstName: optional('firstName'),
              lastName: optional('lastName'),
              email: optional('email'),
              phone: optional('phone'),
              acceptedPolicyIds,
              buyerUserAgent: buyerUserAgent(request),
            },
          },
        }),
        'contactFormSubmit',
      );
      if (!contactFormSubmit) return refused();
      const errors = contactFormSubmit.userErrors;
      return answer({ok: !failed(errors), message: contactFormSubmit.message, errors});
    }
    case 'fastOrder': {
      // Placed straight from the product, without a cart: the buyer's cart is left as it is.
      const email = buyer ? undefined : optional('email');
      const fastOrderSubmit = payloadOf(
        await storefront.mutate(FAST_ORDER_SUBMIT_MUTATION, {
          variables: {
            buyer,
            attemptToken: String(form.get('attemptToken')),
            input: {
              line: {
                merchandiseId: String(form.get('merchandiseId')),
                quantity: Math.max(1, integerOf(form.get('quantity')) ?? 1),
              },
              // A signed-in customer orders under their account's e-mail.
              email,
              phone: optional('phone'),
              firstName: optional('firstName'),
              lastName: optional('lastName'),
              acceptedConsentIds: form.getAll('acceptedConsentIds').map(String),
              attribution: attributionFrom(form.get('attribution')),
              // The buyer's device, for the store's analytics: this request comes from the storefront's server.
              userAgent: request.headers.get('User-Agent') ?? undefined,
              // Their consent, page and ad cookies, for the purchase's report to the merchant's ad vendors.
              analytics: analyticsInputFromRequest(request, {
                pixels: await getMarketingPixels({storefront}).catch(() => null),
                customerEmailHash: customerAccount.getEmailHash(),
              }),
            },
          },
        }),
        'fastOrderSubmit',
      );
      if (!fastOrderSubmit) return refused();
      const errors = fastOrderSubmit.userErrors;
      const order = fastOrderSubmit.order;
      return answer({
        ok: fastOrderSubmit.status === 'COMPLETED',
        orderNumber: order?.orderNumber,
        errors,
        // For the browser's pixels (`fast_order_completed`), under the id the API reported the purchase with.
        purchase:
          order && fastOrderSubmit.analyticsEventId
            ? {
                eventId: fastOrderSubmit.analyticsEventId,
                order: {
                  id: order.id,
                  total: order.totalPrice,
                  lines: order.lineItems.nodes.flatMap(({quantity, discountedUnitPrice, variant}) =>
                    variant
                      ? [
                          {
                            id: variant.product.id,
                            title: variant.product.title,
                            vendor: variant.product.vendor,
                            price: discountedUnitPrice.amount,
                            variantId: variant.id,
                            variantTitle: variant.title,
                            sku: variant.sku,
                            barcode: variant.barcode,
                            quantity,
                          },
                        ]
                      : [],
                  ),
                },
                // For Google Ads' enhanced conversions: a hash, never the e-mail.
                emailHash: buyer ? customerAccount.getEmailHash() : email ? await hashEmail(email) : undefined,
              }
            : undefined,
      });
    }
    default:
      throw new Response('Unknown form', {status: 400});
  }
}

/**
 * Where the buyer came from, as the fast order form sends it (`getAttribution()`
 * in the browser). Only its known text fields are passed on.
 */
function attributionFrom(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const field = (key: string) => {
      const entry = (parsed as Record<string, unknown>)[key];
      return typeof entry === 'string' && entry ? entry : undefined;
    };
    return {landingUrl: field('landingUrl'), referrer: field('referrer'), visitorId: field('visitorId')};
  } catch {
    return undefined;
  }
}

/** The route's data, as the page reads it. */
type ProductPageData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Product() {
  const data = useLoaderData<typeof loader>();
  const {product, settings, isLoggedIn} = data;
  // From the parent route, which a variant change does not reload (B-376).
  const reviews = useRouteLoaderData<typeof reviewsLoader>('routes/product')?.reviews;

  // Shows the variant the visitor picks at once, before the page reloads it.
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Puts the chosen options in the URL without a navigation, when the URL has none.
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // The products before and after this one in the listing it was opened from: on a phone the page is swiped to them.
  const neighbours = useListingNeighbours(productPath(product.handle));

  return (
    <ReviewDisplayProvider value={settings.productReviewSettings}>
      <SwipeablePage
        data={data}
        neighbours={neighbours}
        preview={(ahead) => <ProductPreview data={ahead as ProductPageData} />}
        className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md"
      >
        <ProductTop data={data} selectedVariant={selectedVariant}>
          <LinkedProducts key={product.handle} handle={product.handle} />
        </ProductTop>

        <div className="mt-16 flex flex-col gap-16">
          {settings.productReviewSettings && reviews && (
            <ProductReviews
              reviews={reviews}
              display={settings.productReviewSettings}
              productId={product.id}
              isLoggedIn={isLoggedIn}
            />
          )}
          {/* The category's products: none for a product without a category. */}
          {product.collections.nodes.length > 0 && <RelatedProducts key={product.handle} handle={product.handle} />}
          <RecentlyViewed productId={product.id} />
        </div>

        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.title,
                price: selectedVariant?.price.amount || '0',
                vendor: product.vendor,
                variantId: selectedVariant?.id || '',
                variantTitle: selectedVariant?.title || '',
                sku: selectedVariant?.sku,
                barcode: selectedVariant?.barcode,
                quantity: 1,
              },
            ],
          }}
        />
      </SwipeablePage>
    </ReviewDisplayProvider>
  );
}

/**
 * The top of a product page — its breadcrumbs, gallery and info — on the page, and ahead of a swipe to it
 * (`ProductPreview`), so the page that slides in is the one that opens.
 */
function ProductTop({
  data: {product, settings, isLoggedIn, extras},
  selectedVariant,
  children,
}: {
  data: ProductPageData;
  selectedVariant: ComponentProps<typeof ProductInfo>['selectedVariant'];
  /** The end of the info column, the page's alone: a preview loads nothing below the first screen (T-550). */
  children?: ReactNode;
}) {
  const productOptions = getProductOptions({...product, selectedOrFirstAvailableVariant: selectedVariant});
  // A piece of a quantity tier the buyer chose another variant for shows in the gallery, until the page's variant
  // changes (T-545).
  const [piece, setPiece] = useState<{
    forVariant?: string;
    variant: ComponentProps<typeof ProductGallery>['variant'];
  } | null>(null);
  const pieceVariant = piece && piece.forVariant === selectedVariant?.id ? piece.variant : null;
  return (
    <>
      <Breadcrumbs items={productCrumbs(product)} />
      {/* One column as wide as the page below 990 px: nothing in it — a title's long word, say — widens it (B-358). */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        {/* On a phone the gallery runs from edge to edge of the screen, outside the page's gutters; on a desktop it
            stays in view beside the info column until that column ends. */}
        <div data-page-photo className="-mx-gutter md:mx-0 lg:sticky lg:top-sticky-top lg:self-start">
          <ProductGallery media={product.media} variant={pieceVariant ?? selectedVariant} title={product.title} />
        </div>
        <ProductInfo
          product={product}
          selectedVariant={selectedVariant}
          productOptions={productOptions}
          settings={settings}
          extras={extras}
          isLoggedIn={isLoggedIn}
          onPieceShown={(variant) => setPiece({forVariant: selectedVariant?.id, variant})}
        >
          {children}
        </ProductInfo>
      </div>
    </>
  );
}

/** A neighbour's product page as it will open, rendered ahead from its loaded data: the variant it opens with. */
function ProductPreview({data}: {data: ProductPageData}) {
  return (
    <ReviewDisplayProvider value={data.settings.productReviewSettings}>
      <ProductTop data={data} selectedVariant={data.product.selectedOrFirstAvailableVariant} />
    </ReviewDisplayProvider>
  );
}

/** A variant as the product page shows it. */
const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantMoney on MoneyV2 {
    amount
    currencyCode
    formatted
  }
  fragment ProductVariant on ProductVariant {
    availableForSale
    barcode
    currentlyNotInStock
    statusType
    statusName
    quantityAvailable
    minimumQuantity
    compareAtPrice {
      ...ProductVariantMoney
    }
    id
    image {
      url
      altText
      width
      height
    }
    # The media the merchant linked to the variant: the gallery shows them alone (B-388).
    mediaIds
    price {
      ...ProductVariantMoney
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      ...ProductVariantMoney
    }
    unitPriceMeasurement {
      referenceValue
      referenceUnit
    }
  }
` as const;

/** A quantity tier of the chosen variant as its card shows it (`QuantityTiers`); with `PRODUCT_VARIANT_FRAGMENT`'s money. */
const PRODUCT_QUANTITY_TIER_FRAGMENT = `#graphql
  fragment ProductQuantityTier on ProductQuantityDiscount {
    minQuantity
    maxQuantity
    percentOff
    price {
      ...ProductVariantMoney
    }
    totalPrice {
      ...ProductVariantMoney
    }
    compareAtTotalPrice {
      ...ProductVariantMoney
    }
    totalSaving {
      ...ProductVariantMoney
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    # The main category, for the breadcrumb.
    collections(first: 1) {
      nodes {
        id
        title
        onlineStoreUrl
        breadcrumb {
          id
          title
          onlineStoreUrl
        }
      }
    }
    descriptionHtml
    descriptionTitle
    tabs {
      id
      title
      contentHtml
    }
    description
    shortDescription
    freeShipping
    encodedVariantExistence
    encodedVariantAvailability
    vendorDetails {
      title
      handle
      image {
        url
        altText
        width
        height
      }
    }
    featuredImage {
      url
      width
      height
      altText
    }
    media(first: 20) {
      id
      mediaContentType
      alt
      previewImage {
        url
        altText
        width
        height
      }
      embedUrl
      frames {
        url
        width
        height
      }
    }
    labels {
      name
      color
      textColor
    }
    discount {
      endsAt
      countdownOnDetail
      hideDiscountPrice
    }
    reviewSummary {
      averageRating
      totalCount
    }
    options {
      name
      # How the store presents it: a select, buttons or swatches (B-377).
      type
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
      # The chosen variant's only: the form offers them (T-544).
      quantityDiscounts {
        ...ProductQuantityTier
      }
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    customizations {
      id
      type
      label
      required
      multiple
      sortOrder
      valueSymbol
      minSquare
      percentage
      price {
        ...ProductVariantMoney
      }
      values {
        id
        label
        percentage
        image
        price {
          ...ProductVariantMoney
        }
      }
      fileUpload {
        maxFileSize
        allowedExtensions
        allowedMimeTypes
      }
    }
    bundle {
      priceType
      discountPercent
      compareAtPrice {
        ...ProductVariantMoney
      }
      products {
        quantity
        showDetails
        showPrice
        hideThumbnail
        priceInBundle {
          ...ProductVariantMoney
        }
        product {
          id
          handle
          title
          shortDescription
          featuredImage {
            url
            altText
            width
            height
          }
          variants(first: 100) {
            nodes {
              id
              title
              availableForSale
            }
          }
        }
      }
    }
    properties {
      name
      values
    }
    dimensions {
      length
      width
      height
      unit
    }
    files(first: 20) {
      nodes {
        id
        name
        url
        fileSize
      }
    }
    energyClass {
      label
      imageUrl
      documentUrl
      productSheetUrl
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
  ${PRODUCT_QUANTITY_TIER_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const PRODUCT_EXTRAS_QUERY = `#graphql
  query ProductExtras(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $buyer: BuyerInput
  ) @inContext(buyer: $buyer) {
    product(handle: $handle) {
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        creditOffers {
          provider {
            handle
            title
            imageUrl
          }
          plans {
            months
            monthlyPayment {
              amount
              currencyCode
              formatted
            }
          }
        }
      }
      stockByStore {
        store {
          id
          name
          urlHandle
          city
        }
      }
    }
  }
` as const;

const REVIEW_CREATE_MUTATION = `#graphql
  mutation ProductReviewCreate($input: ProductReviewCreateInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewCreate(input: $input) {
      message
      userErrors {
        ...FormUserErrorFields
      }
    }
  }
  ${FORM_USER_ERROR_FRAGMENT}
` as const;

const REVIEW_ANSWER_MUTATION = `#graphql
  mutation ProductReviewAnswerCreate($input: ProductReviewAnswerCreateInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productReviewAnswerCreate(input: $input) {
      message
      userErrors {
        ...FormUserErrorFields
      }
    }
  }
  ${FORM_USER_ERROR_FRAGMENT}
` as const;

const BACK_IN_STOCK_MUTATION = `#graphql
  mutation ProductBackInStockSubscribe($input: ProductBackInStockInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productBackInStockSubscribe(input: $input) {
      subscribed
      message
      userErrors {
        field
        message
        code
      }
    }
  }
` as const;

const CONTACT_FORM_MUTATION = `#graphql
  mutation ProductInquiry($input: ContactFormInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    contactFormSubmit(input: $input) {
      message
      userErrors {
        ...FormUserErrorFields
      }
    }
  }
  ${FORM_USER_ERROR_FRAGMENT}
` as const;

const FAST_ORDER_SUBMIT_MUTATION = `#graphql
  mutation FastOrderSubmit($attemptToken: String!, $input: FastOrderInput!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    fastOrderSubmit(attemptToken: $attemptToken, input: $input) {
      status
      # The purchase's id for the browser's pixels, the one the API reported it under server-side.
      analyticsEventId
      order {
        id
        orderNumber
        totalPrice {
          amount
          currencyCode
        }
        lineItems(first: 10) {
          nodes {
            quantity
            # What a piece was paid, as the server's purchase report under the same event id gives it (B-391).
            discountedUnitPrice {
              amount
            }
            variant {
              id
              sku
              barcode
              title
              product {
                id
                title
                vendor
              }
            }
          }
        }
      }
      userErrors {
        ...CartUserErrorFields
      }
    }
  }
  ${CART_USER_ERROR_FRAGMENT}
` as const;
