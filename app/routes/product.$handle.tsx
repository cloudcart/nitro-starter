import {type ComponentProps, type ReactNode, useState} from 'react';
import {data, type ShouldRevalidateFunction, useLoaderData, useLocation, useRouteLoaderData} from 'react-router';
import {
  Analytics,
  analyticsInputFromRequest,
  generateProductJsonLd,
  getMarketingPixels,
  hashEmail,
  getProductOptions,
  isRouteDataRequest,
  mapSelectedProductOptionToObject,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@cloudcart/nitrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {keptPageLoader} from '@cloudcart/nitrogen-react';
import type {Route} from './+types/product.$handle';
import type {loader as reviewsLoader} from './product';
import {errorMeta, metaTranslator, seoMeta, storeName, storeOrigin} from '~/lib/meta';
import {loadProductExtras} from '~/lib/product-extras';
import {Breadcrumbs, breadcrumbJsonLd, type Crumb} from '~/components/Breadcrumbs';
import {collectionCrumbs} from '~/components/CollectionView';
import {buyerUserAgent, type FormError} from '~/components/FormFields';
import {type Extras, RelatedProducts, useProductExtras} from '~/components/ProductExtras';
import {ProductGallery} from '~/components/ProductGallery';
import {ProductColumns} from '~/components/ProductLayout';
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
import {loadProductPageSettings, loadSelectedOptions} from '~/lib/product-page';
import {productAsShown, variantsWhole} from '~/lib/product-variants';
import {useListingNeighbours} from '~/lib/listing-context';
import {openedPicture} from '~/lib/opening';
import {missingResource} from '~/lib/missing';
import {SHARED_PAGE} from '~/lib/page-cache';

/** The same page for every visitor: served from the page cache (`server.ts`). */
export const handle = SHARED_PAGE;

/** Shown from the data this tab kept on a step back, or loaded on a link's intent (`KEPT_PAGES`). */
export const clientLoader = (args: Route.ClientLoaderArgs) => keptPageLoader(args);

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

  // The credit plans and store stock, below the fold, only in a document, started first beside the product query: route
  // data — a link's hover, a swipe, a step — is the product alone, and the page asks its extras as it opens
  // (`useProductExtras`). They need nothing from the product query…
  const extras = isRouteDataRequest(args.request) ? undefined : loadProductExtras(args, args.params.handle);

  // …and the page waits only for what the first screen needs.
  const criticalData = await loadCriticalData(args, settings);

  return {extras, ...criticalData};
}

async function loadCriticalData(
  {context, params, request}: Route.LoaderArgs,
  pageSettings: ReturnType<typeof loadProductPageSettings>,
) {
  const {handle} = params;
  const {storefront, customerAccount} = context;
  // The variant the address names by its id, else only the product's options from the address (B-544, T-602).
  const [buyer, selectedOptions] = await Promise.all([
    customerAccount.getBuyer(),
    loadSelectedOptions({context, request}, handle),
  ]);

  const [{product, errors}, settings] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions, buyer},
    }),
    pageSettings,
  ]);

  if (!product?.id) throw missingResource(errors, null);

  return {product, settings, isLoggedIn: Boolean(buyer)};
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
                // The order's report to CloudCart Analytics, for the browser to send.
                cloudCartAnalytics: fastOrderSubmit.cloudCartAnalytics,
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

  // Shows the variant the visitor picks at once: one the page has whole with no loader (`resolved`), another before
  // the page reloads it.
  const wholeVariants = variantsWhole(product);
  const selectedVariant = useOptimisticVariant(product.selectedOrFirstAvailableVariant, wholeVariants);
  const shownProduct = productAsShown(product, selectedVariant, wholeVariants);

  // Puts the chosen options in the URL without a navigation, when the URL has none.
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // The products before and after this one in the listing it was opened from: on a phone the page is swiped to them.
  const neighbours = useListingNeighbours(productPath(product.handle));
  const location = useLocation();
  // Streamed with a document; else asked as the page opens, and for each variant chosen — by the shown variant's
  // options, not the address's: the page writes them into its address after it opens, so the address it is shown at
  // again (a step back or forward) asks what it asked before (B-556).
  const extras = useProductExtras(
    data.extras,
    product.handle,
    new URLSearchParams(mapSelectedProductOptionToObject(selectedVariant.selectedOptions)).toString(),
  );

  return (
    <ReviewDisplayProvider value={settings.productReviewSettings}>
      <SwipeablePage
        data={data}
        neighbours={neighbours}
        preview={(ahead, picture) => <ProductPreview data={ahead as ProductPageData} backdrop={picture} />}
        className="mx-auto max-w-page px-gutter py-8 md:px-gutter-md"
      >
        <ProductTop
          data={{...data, product: shownProduct, extras}}
          selectedVariant={selectedVariant}
          backdrop={openedPicture(location.pathname)}
        >
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
  backdrop,
  children,
}: {
  /** The route's data, its extras as the page has them (`useProductExtras`). */
  data: Omit<ProductPageData, 'extras'> & {extras: Extras};
  selectedVariant: ComponentProps<typeof ProductInfo>['selectedVariant'];
  /** The picture the page was opened from, under its first photograph until that loads (T-571). */
  backdrop?: string;
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
      <ProductColumns
        gallery={
          <ProductGallery
            media={product.media}
            variant={pieceVariant ?? selectedVariant}
            title={product.title}
            backdrop={backdrop}
          />
        }
        info={
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
        }
      />
    </>
  );
}

/**
 * A neighbour's product page as it will open, rendered ahead from its loaded data: the variant it opens with, over the
 * picture its card showed until its photograph loads.
 */
function ProductPreview({data, backdrop}: {data: ProductPageData; backdrop?: string}) {
  return (
    <ReviewDisplayProvider value={data.settings.productReviewSettings}>
      <ProductTop data={data} selectedVariant={data.product.selectedOrFirstAvailableVariant} backdrop={backdrop} />
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
    # As whole as the chosen variant: one of them is shown without the loader (T-597); in any case (B-543).
    adjacentVariants(selectedOptions: $selectedOptions, caseInsensitiveMatch: true) {
      ...ProductVariant
      quantityDiscounts {
        ...ProductQuantityTier
      }
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
      # The order's report to CloudCart Analytics, which the browser sends with fast_order_completed.
      cloudCartAnalytics {
        name
        body
      }
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
