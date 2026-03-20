import {useLoaderData, data, Link} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitro';
import {Image, ProductPrice, AddToCartButton, RichText, VariantSelector, useOptimisticVariant} from '@cloudcart/nitro-react';

export const meta: Route.MetaFunction = ({data: d}) => getSeoMeta({title: d?.product ? d.product.title + ' | Nitro' : 'Product | Nitro', description: d?.product?.description});

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
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem',alignItems:'start'}}>
      <Image data={variant?.image ?? product.featuredImage} alt={product.title} />
      <div>
        <h1>{product.title}</h1>
        {variant && <div style={{fontSize:'1.25rem',margin:'0.5rem 0'}}><ProductPrice price={variant.price} compareAtPrice={variant.compareAtPrice} /></div>}
        <VariantSelector product={product}>
          {(options) => options.map(({name, values}) => (
            <div key={name} style={{margin:'1rem 0'}}>
              <strong>{name}</strong>
              <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                {values.map((o) => (
                  <Link key={o.value} to={o.to} replace preventScrollReset prefetch="intent"
                    style={{padding:'0.5rem 1rem',border:o.isActive?'2px solid #000':'1px solid #ccc',borderRadius:4,textDecoration:'none',color:'inherit',opacity:o.available?1:0.4}}>
                    {o.value}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </VariantSelector>
        {variant && <AddToCartButton merchandiseId={variant.id} disabled={!variant.availableForSale}>{variant.availableForSale ? 'Add to Cart' : 'Sold Out'}</AddToCartButton>}
        <RichText data={product.descriptionHtml} />
      </div>
    </div>
  );
}
