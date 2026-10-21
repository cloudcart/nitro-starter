import {type ComponentProps, type ReactNode, useState} from 'react';
import {Link} from 'react-router';
import {type MappedProductOptions, useTranslation} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import type {FormPolicyFragment, ProductFragment, ProductPageSettingsQuery} from 'storefrontapi.generated';
import {EnergyClass} from '~/components/EnergyClass';
import {BundleForm} from '~/components/BundleForm';
import {CompareButton} from '~/components/CompareButton';
import {COMPARE_ENABLED} from '~/lib/features';
import {ProductDetails} from '~/components/ProductDetails';
import {CreditOffers, type Extras, StoreAvailability} from '~/components/ProductExtras';
import {ProductForm, usePieceVariants} from '~/components/ProductForm';
import {StockStatus} from '~/components/StockStatus';
import {BackInStockForm, FastOrderForm, ProductInquiryForm} from '~/components/ProductRequestForms';
import {showsRating} from '~/components/ReviewDisplay';
import {StarRating} from '~/components/StarRating';
import {Countdown} from '~/components/ui/Countdown';
import {Price} from '~/components/ui/Price';
import {WishlistButton} from '~/components/WishlistButton';
import {orderConsents} from '~/lib/fragments';
import {vendorPath} from '~/lib/urls';
import {NO_PIECES, type PieceChoice, tierChoices, tierPieces} from '~/lib/quantity-tiers';
import {quantityWithin, shownCompareAtPrice} from '~/lib/variants';
import {ProductLabel} from '~/components/ProductLabel';
import {PRODUCT_TITLE, PRODUCT_VENDOR} from '~/components/ProductLayout';

type Variant = ProductFragment['selectedOrFirstAvailableVariant'];

/**
 * The product's info column: who makes it, its title and short description, rating and labels; the price with the discount's
 * countdown; the variant buttons, the customizations, the quantity and the add to cart (or a bundle's parts);
 * what the buyer can do when it is not in stock; fast order; buying in instalments; the store's own shops;
 * comparing, when the store turns it on (`COMPARE_ENABLED`); the merchant's details, each opening in place; and what the
 * page adds after them (`children`: the linked products' carousel, T-550 — not in a neighbour's preview).
 */
export function ProductInfo({
  product,
  selectedVariant,
  productOptions,
  settings,
  extras,
  isLoggedIn,
  onPieceShown,
  children,
}: {
  product: ProductFragment;
  selectedVariant: Variant;
  productOptions: MappedProductOptions[];
  settings: ProductPageSettingsQuery;
  extras: Extras;
  isLoggedIn: boolean;
  /** Shows a piece's variant in the gallery when the buyer chooses it (T-545). */
  onPieceShown?: ComponentProps<typeof ProductForm>['onPieceShown'];
  children?: ReactNode;
}) {
  const {t} = useTranslation();
  // The quantity chosen in the product form, which the fast order also orders (B-209).
  const [quantity, setQuantity] = useState(1);
  // The variants chosen for the pieces of a quantity tier (T-545, T-547): fast order takes one variant.
  const [pieces, setPieces] = useState<PieceChoice>(NO_PIECES);
  const pieceVariants = usePieceVariants(product.handle).variants;
  const pieceIds = tierPieces(product, productOptions, selectedVariant, quantity, pieces, pieceVariants);
  const mixedPieces = Boolean(selectedVariant && pieceIds?.some((id) => id !== selectedVariant.id));
  const policiesFor = (form: string): FormPolicyFragment[] =>
    settings.policies.filter((policy) => policy.forms.some((entry) => entry.form === form));
  const status = selectedVariant?.statusType;
  const soldOut = selectedVariant && !selectedVariant.availableForSale;
  const {discount, reviewSummary} = product;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {/* The brand: its logo when the merchant uploaded one, its name otherwise; a link to its page. */}
        {product.vendorDetails ? (
          <Link
            to={vendorPath(product.vendorDetails.handle)}
            className="self-start text-small tracking-label text-muted uppercase hover:text-foreground"
          >
            {product.vendorDetails.image ? (
              // 40 px high from the image CDN, at most 160 px wide: a small picture offers only small sizes (B-402).
              <Image
                data={product.vendorDetails.image}
                alt={product.vendorDetails.title}
                width="auto"
                height={40}
                // Beside the gallery, on the first screen (B-443).
                loading="eager"
                className="h-10 w-auto max-w-40 object-contain object-left"
              />
            ) : (
              product.vendorDetails.title
            )}
          </Link>
        ) : (
          product.vendor && <p className={PRODUCT_VENDOR}>{product.vendor}</p>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className={PRODUCT_TITLE}>{product.title}</h1>
          <WishlistButton productId={product.id} place="page" />
        </div>
        {product.shortDescription && <p className="text-muted">{product.shortDescription}</p>}
        {reviewSummary && showsRating(reviewSummary, settings.productReviewSettings) && (
          <a href="#reviews" className="self-start">
            <StarRating rating={reviewSummary.averageRating} count={reviewSummary.totalCount} />
          </a>
        )}
        {product.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.labels.map((label) => (
              <ProductLabel key={label.name} label={label} className="border border-border" />
            ))}
          </div>
        )}
      </div>

      {/* Hidden while empty, so it takes no gap of the column's (B-374). */}
      <div className="flex flex-col gap-2 empty:hidden">
        {/* Where the form offers quantity tiers, their cards carry the prices (the user, T-544). */}
        {(product.bundle || !tierChoices(product, productOptions, selectedVariant, pieceVariants).length) && (
          <Price
            price={selectedVariant?.price}
            compareAtPrice={shownCompareAtPrice(selectedVariant?.compareAtPrice, discount)}
            unitPrice={selectedVariant?.unitPrice}
            unitPriceMeasurement={selectedVariant?.unitPriceMeasurement}
            className="text-h4"
          />
        )}
        <EnergyClass energyClass={product.energyClass} />
        {discount?.countdownOnDetail && discount.endsAt && (
          <Countdown
            endsAt={discount.endsAt}
            label={(time) => t('product.offerEndsIn', {time})}
            className="text-small font-medium"
          />
        )}
        {product.freeShipping && <p className="text-small text-success">{t('product.freeShipping')}</p>}
      </div>

      {product.bundle ? (
        <>
          <StockStatus variant={selectedVariant} />
          <BundleForm productId={product.id} bundle={product.bundle} />
        </>
      ) : (
        <ProductForm
          product={product}
          productOptions={productOptions}
          selectedVariant={selectedVariant}
          quantity={quantity}
          onQuantityChange={setQuantity}
          pieces={pieces}
          onPiecesChange={setPieces}
          onPieceShown={onPieceShown}
        />
      )}

      {soldOut && status === 'REQUEST' && (
        <ProductInquiryForm
          productId={product.id}
          variantId={selectedVariant.id}
          productTitle={product.title}
          policies={policiesFor('CONTACTS')}
          isLoggedIn={isLoggedIn}
        />
      )}
      {soldOut && status !== 'REQUEST' && (
        <BackInStockForm
          productId={product.id}
          variantId={selectedVariant.id}
          channels={settings.shop.backInStockChannels}
          policies={policiesFor('SEGMENT_SUBSCRIPTION_POPUP')}
        />
      )}
      {settings.fastOrderSettings &&
        selectedVariant?.availableForSale &&
        !product.bundle &&
        !product.customizations.some((customization) => customization.required) &&
        (mixedPieces ? (
          <p className="text-small text-muted">{t('product.tiers.fastOrderOneVariant')}</p>
        ) : (
          <FastOrderForm
            settings={settings.fastOrderSettings}
            consents={orderConsents(settings.checkoutSettings.legal)}
            merchandiseId={selectedVariant.id}
            product={{
              id: product.id,
              title: product.title,
              vendor: product.vendor,
              price: selectedVariant.price.amount,
              variantId: selectedVariant.id,
              variantTitle: selectedVariant.title,
              sku: selectedVariant.sku,
              barcode: selectedVariant.barcode,
            }}
            quantity={quantityWithin(selectedVariant, quantity).amount}
            isLoggedIn={isLoggedIn}
          />
        ))}

      <CreditOffers extras={extras} />
      <StoreAvailability extras={extras} />
      {COMPARE_ENABLED && <CompareButton productId={product.id} />}
      <ProductDetails product={product} />
      {children}
    </div>
  );
}
