import {Link, useFetcher} from 'react-router';
import type {CartLine} from '@cloudcart/nitrogen';
import {Money, Image} from '@cloudcart/nitrogen-react';
import {PlusIcon, MinusIcon, TrashIcon} from '@heroicons/react/24/outline';

interface CartLineItemProps {
  line: CartLine;
  layout?: 'drawer' | 'page';
}

export function CartLineItem({line, layout = 'page'}: CartLineItemProps) {
  const updateFetcher = useFetcher({key: `update-${line.id}`});
  const removeFetcher = useFetcher({key: `remove-${line.id}`});

  if (removeFetcher.state !== 'idle') return null;

  const pendingQty = updateFetcher.formData
    ? Number(updateFetcher.formData.get('quantity'))
    : null;
  const quantity = pendingQty ?? line.quantity;
  if (quantity <= 0) return null;

  const image = line.merchandise.image ?? line.merchandise.product.featuredImage;
  const isDrawer = layout === 'drawer';

  return (
    <li className={isDrawer ? 'flex gap-3 py-4 border-b border-gray-100' : 'flex gap-4 py-5 border-b border-gray-200 items-start'}>
      {image && (
        <Link to={`/products/${line.merchandise.product.handle}`} prefetch="intent">
          <Image
            data={image}
            alt={line.merchandise.product.title}
            width={isDrawer ? 64 : 80}
            height={isDrawer ? 64 : 80}
            className={isDrawer ? 'size-16 rounded-md object-cover shrink-0' : 'w-20 h-20 rounded-lg object-cover bg-gray-100'}
          />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <Link to={`/products/${line.merchandise.product.handle}`} prefetch="intent" className="hover:no-underline">
          <strong className={isDrawer ? 'text-[0.85rem] block' : 'text-[0.95rem]'}>{line.merchandise.product.title}</strong>
        </Link>
        {line.merchandise.selectedOptions.length > 0 && (
          <div className="text-xs text-gray-500">
            {line.merchandise.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(', ')}
          </div>
        )}
        <div className={isDrawer ? 'text-[0.85rem] font-semibold mt-1' : ''}>
          <Money data={line.cost.totalAmount} />
        </div>
        {updateFetcher.data?.errors?.[0]?.message && (
          <div className="text-red-600 text-xs mt-1">{updateFetcher.data.errors[0].message}</div>
        )}
      </div>
      <CartLineQuantity line={line} quantity={quantity} layout={layout} />
    </li>
  );
}

function CartLineQuantity({line, quantity, layout}: {line: CartLine; quantity: number; layout: string}) {
  const updateFetcher = useFetcher({key: `update-${line.id}`});
  const removeFetcher = useFetcher({key: `remove-${line.id}`});
  const isDrawer = layout === 'drawer';

  const btnClass = isDrawer
    ? 'size-7 border border-gray-200 rounded bg-light flex items-center justify-center hover:border-gray-400 transition-[border-color] duration-150'
    : 'size-8 border border-gray-200 rounded-md bg-light flex items-center justify-center transition-[border-color] duration-150 hover:border-dark';

  return (
    <div className={isDrawer ? 'flex flex-col items-end gap-2' : 'flex items-center gap-2'}>
      <div className="flex items-center gap-1">
        <updateFetcher.Form method="post" action="/cart">
          <input type="hidden" name="action" value="UPDATE_CART" />
          <input type="hidden" name="lineId" value={line.id} />
          <input type="hidden" name="quantity" value={Math.max(0, quantity - 1)} />
          <button type="submit" aria-label="Decrease quantity" className={btnClass}>
            <MinusIcon className="size-3.5" />
          </button>
        </updateFetcher.Form>
        <span className={isDrawer ? 'text-xs min-w-5 text-center' : 'text-sm min-w-5 text-center'}>{quantity}</span>
        <updateFetcher.Form method="post" action="/cart">
          <input type="hidden" name="action" value="UPDATE_CART" />
          <input type="hidden" name="lineId" value={line.id} />
          <input type="hidden" name="quantity" value={quantity + 1} />
          <button type="submit" aria-label="Increase quantity" className={btnClass}>
            <PlusIcon className="size-3.5" />
          </button>
        </updateFetcher.Form>
      </div>
      <removeFetcher.Form method="post" action="/cart">
        <input type="hidden" name="action" value="REMOVE_FROM_CART" />
        <input type="hidden" name="lineId" value={line.id} />
        <button
          type="submit"
          aria-label="Remove item"
          className="text-gray-400 hover:text-red-500 transition-colors duration-150 p-0.5"
        >
          <TrashIcon className="size-4" />
        </button>
      </removeFetcher.Form>
    </div>
  );
}
