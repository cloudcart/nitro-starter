import {Link, useNavigate} from 'react-router';
import {VariantSelector, ProductPrice, Money} from '@cloudcart/nitrogen-react';
import {AddToCartButton} from './AddToCartButton';
import {OptionSwatch} from './OptionSwatch';

interface ProductFormProps {
  product: any;
  selectedVariant: any;
}

export function ProductForm({product, selectedVariant}: ProductFormProps) {
  const variant = selectedVariant;
  const hasMultiplePrices =
    product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount;
  const isOnSale = variant?.compareAtPrice &&
    parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);

  return (
    <div>
      {/* Price */}
      <div className="flex items-baseline gap-2 text-xl font-semibold my-3 [&_s]:text-gray-400 [&_s]:font-normal [&_s]:text-base" aria-live="polite">
        {variant ? (
          <>
            <ProductPrice price={variant.price} compareAtPrice={variant.compareAtPrice} />
            {isOnSale && variant.compareAtPrice && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 py-0.5 px-2 rounded">
                Save {Math.round((1 - parseFloat(variant.price.amount) / parseFloat(variant.compareAtPrice.amount)) * 100)}%
              </span>
            )}
          </>
        ) : hasMultiplePrices ? (
          <span>From <Money data={product.priceRange.minVariantPrice} /></span>
        ) : (
          <Money data={product.priceRange.minVariantPrice} />
        )}
      </div>

      {/* Stock */}
      {variant && <StockIndicator variant={variant} />}

      {/* Variant Selector */}
      <VariantSelector product={product}>
        {(options) =>
          options.map(({name, values}) => {
            const optionMeta = getOptionMeta(product, name);
            const optionType = optionMeta.type;
            const activeValue = values.find((v) => v.isActive);

            return (
              <fieldset key={name} className="border-none p-0 mb-5">
                <legend className="p-0 text-[0.85rem] font-semibold mb-2 text-dark">
                  {name}
                  {activeValue && <span className="font-normal text-gray-500">: {activeValue.value}</span>}
                </legend>

                {optionType === 'select' ? (
                  <OptionSelect name={name} values={values} />
                ) : (
                  <div className={`flex flex-wrap gap-2${optionType === 'color' ? ' gap-2.5' : ''}`}>
                    {values.map((o) => {
                      const valueMeta = optionMeta.values[o.value];
                      return (
                        <OptionSwatch
                          key={o.value}
                          option={o}
                          type={optionType}
                          color={valueMeta?.color}
                          swatchUrl={valueMeta?.swatchUrl}
                        />
                      );
                    })}
                  </div>
                )}
              </fieldset>
            );
          })
        }
      </VariantSelector>

      {/* Add to Cart */}
      {variant && (
        <AddToCartButton
          merchandiseId={variant.id}
          disabled={!variant.availableForSale}
          className="flex items-center justify-center w-full py-4 px-8 mt-2 bg-dark text-light border-none rounded-[10px] text-base font-semibold tracking-wide transition-[background,transform] duration-150 hover:bg-gray-900 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {variant.availableForSale ? 'Add to Cart' : 'Sold Out'}
        </AddToCartButton>
      )}
    </div>
  );
}

function StockIndicator({variant}: {variant: any}) {
  if (!variant.availableForSale) {
    return (
      <div className="mb-5 text-xs font-medium">
        <span className="text-red-600">Out of stock</span>
      </div>
    );
  }

  if (variant.currentlyNotInStock) {
    return (
      <div className="mb-5 text-xs font-medium">
        <span className="text-brand">Available for pre-order</span>
      </div>
    );
  }

  if (variant.quantityAvailable != null && variant.quantityAvailable > 0 && variant.quantityAvailable <= 5) {
    return (
      <div className="mb-5 text-xs font-medium">
        <span className="text-orange-600">Only {variant.quantityAvailable} left!</span>
      </div>
    );
  }

  return (
    <div className="mb-5 text-xs font-medium">
      <span className="text-green-600 before:content-[''] before:inline-block before:size-1.5 before:rounded-full before:bg-current before:mr-1.5 before:align-middle">In stock</span>
    </div>
  );
}

function OptionSelect({name, values}: {name: string; values: any[]}) {
  const navigate = useNavigate();
  const activeValue = values.find((v) => v.isActive);

  return (
    <select
      className="form-select w-full max-w-xs py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm text-dark cursor-pointer transition-[border-color] duration-150 hover:border-gray-400 focus:border-dark focus:ring-0"
      value={activeValue?.value ?? ''}
      aria-label={name}
      onChange={(e) => {
        const selected = values.find((v) => v.value === e.target.value);
        if (selected) {
          navigate(selected.to, {replace: true, preventScrollReset: true});
        }
      }}
    >
      {values.map((o) => (
        <option key={o.value} value={o.value} disabled={!o.available}>
          {o.value}{!o.available ? ' (Sold out)' : ''}
        </option>
      ))}
    </select>
  );
}

function getOptionMeta(product: any, optionName: string) {
  const values: Record<string, {color?: string; swatchUrl?: string}> = {};
  let type: string | undefined;

  for (const variant of product.variants.nodes) {
    for (const so of variant.selectedOptions) {
      if (so.name !== optionName) continue;
      if (so.type && !type) type = so.type;
      if (!values[so.value]) {
        values[so.value] = {
          color: so.color || undefined,
          swatchUrl: so.swatchUrl || undefined,
        };
      }
    }
  }

  return {type, values};
}
