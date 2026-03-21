import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Image, ProductPrice, RichText, VariantSelector, useOptimisticVariant} from '@cloudcart/nitro-react';
import {AddToCartButton} from '~/components/AddToCartButton';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({
  title: d?.product ? `${d.product.title} | Nitro` : 'Product | Nitro',
  description: d?.product?.description,
  type: 'product',
  ...(d?.product?.featuredImage ? {image: {url: d.product.featuredImage.url, width: d.product.featuredImage.width, height: d.product.featuredImage.height}} : {}),
});

export async function loader({params, context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  const product = await ctx.storefront.getProduct(params.handle);
  if (!product) throw data('Product not found', {status: 404});
  return {product};
}

export default function ProductPage() {
  const {product} = useLoaderData<typeof loader>();
  const first = product.variants.nodes[0];
  const {selectedVariant} = useOptimisticVariant(product, first);
  const variant = selectedVariant ?? first;

  return (
    <div className="product-page">
      <div className="product-image">
        <Image data={variant?.image ?? product.featuredImage} alt={product.title} loading="eager" />
      </div>

      <div className="product-info">
        <h1>{product.title}</h1>

        {variant && (
          <div className="product-price-display">
            <ProductPrice price={variant.price} compareAtPrice={variant.compareAtPrice} />
          </div>
        )}

        <VariantSelector product={product}>
          {(options) => options.map(({name, values}) => (
            <fieldset key={name} className="product-options">
              <legend>{name}</legend>
              <div className="option-values">
                {values.map((o) => (
                  <Link
                    key={o.value}
                    to={o.to}
                    replace
                    preventScrollReset
                    prefetch="intent"
                    className={`option-value${o.isActive ? ' selected' : ''}${!o.available ? ' unavailable' : ''}`}
                  >
                    {o.value}
                  </Link>
                ))}
              </div>
            </fieldset>
          ))}
        </VariantSelector>

        {variant && (
          <AddToCartButton
            merchandiseId={variant.id}
            disabled={!variant.availableForSale}
            className="add-to-cart-btn"
          >
            {variant.availableForSale ? 'Add to Cart' : 'Sold Out'}
          </AddToCartButton>
        )}

        <RichText data={product.descriptionHtml} className="product-description" />
      </div>
    </div>
  );
}
