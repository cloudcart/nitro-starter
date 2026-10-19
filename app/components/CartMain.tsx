import {useState} from 'react';
import {useFetcher} from 'react-router';
import {useOptimisticCart, useTranslation} from '@cloudcart/nitrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {CartActionMessages} from '~/components/CartActionMessages';
import {useAside} from '~/components/Aside';
import {CartBundle, CartLineItem, type CartLine} from '~/components/CartLineItem';
import {ButtonLink} from '~/components/ui/Button';
import {ADD_TO_CART_FETCHER_KEY} from '~/lib/cart';
import {CartSummary} from './CartSummary';
import {EmptyState} from '~/components/ui/EmptyState';
import {CartIcon} from '~/components/ui/icons';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

/** How many lines (or bundles) the cart page shows on its first screen. */
const FIRST_SCREEN_LINES = 3;

/**
 * The cart's lines and summary, on the /cart page and in the cart drawer: in the drawer the lines scroll and the
 * summary stays at the bottom; on the page the summary sits beside the lines.
 *
 * A bundle's products are separate lines that share `bundle.id`; they are shown together under the bundle's title.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  const {t} = useTranslation();
  // Applies pending cart actions, so the buyer sees each change at once.
  const cart = useOptimisticCart(originalCart);
  const lines = cart?.lines?.nodes ?? [];
  const page = layout === 'page';

  const list = lines.length > 0 && (
    <ul
      aria-label={t('cart.lines')}
      className={
        page
          ? 'divide-y divide-border border-y border-border'
          : 'min-h-0 flex-1 divide-y divide-border overflow-y-auto px-5'
      }
    >
      {groupBundles(lines).map((group, index) => {
        // The cart page's first lines are its first screen: their pictures load at once (B-443). The panel's load when
        // it opens.
        const loading = page && index < FIRST_SCREEN_LINES ? 'eager' : 'lazy';
        return group.bundle ? (
          <CartBundle
            key={group.bundle.id}
            bundle={group.bundle}
            lines={group.lines}
            layout={layout}
            loading={loading}
          />
        ) : (
          <CartLineItem key={group.lines[0]!.id} line={group.lines[0]!} layout={layout} loading={loading} />
        );
      })}
    </ul>
  );

  if (!page) {
    return (
      // `group/cart`: while a line's change is on its way, the totals shimmer (`CartSummary`).
      <div className="group/cart flex h-full flex-col">
        <CartAddRefusal layout={layout} />
        {list || <CartEmpty layout={layout} />}
        {lines.length > 0 && <CartSummary cart={cart} layout={layout} />}
      </div>
    );
  }

  return (
    // The summary's column only beside lines: an empty cart takes the whole row.
    <div
      // `minmax(0, …)`: the columns are the page's width, not their content's — an auto column grew to its widest line
      // and pushed the page past a phone's right gutter (B-248).
      className={`group/cart grid grid-cols-1 gap-10 lg:items-start ${lines.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_var(--container-cart-summary)]' : ''}`}
    >
      <div>
        <CartAddRefusal layout={layout} />
        {list || <CartEmpty layout={layout} />}
      </div>
      {lines.length > 0 && <CartSummary cart={cart} layout={layout} />}
    </div>
  );
}

/** The lines in cart order, a bundle's members gathered where its first member is. */
function groupBundles(lines: CartLine[]) {
  const groups: Array<{bundle: CartLine['bundle']; lines: CartLine[]}> = [];
  const byBundle = new Map<string, CartLine[]>();

  for (const line of lines) {
    const bundleId = line.bundle?.id;
    if (!bundleId) {
      groups.push({bundle: null, lines: [line]});
    } else if (byBundle.has(bundleId)) {
      byBundle.get(bundleId)!.push(line);
    } else {
      const members = [line];
      byBundle.set(bundleId, members);
      groups.push({bundle: line.bundle, lines: members});
    }
  }

  return groups;
}

/**
 * What the store answered the last add with: why it refused (a merchant's cart limit, stock, a product no longer
 * sold) or what it did not quite do. A bundle's add opens the drawer on click and a card's quick add on the answer,
 * so this is where the buyer is looking. The answer shown when the drawer closes is not shown again, so an old answer
 * does not greet the next visit.
 *
 * The fetcher itself is left alone: a card's answer lands while the drawer is still closed and the cart is reloading,
 * and resetting the fetcher then aborted that reload — the drawer kept the old cart — and left the router expecting a
 * fetcher it had dropped, so the next link threw "Expected fetcher" and went nowhere (B-383).
 */
function CartAddRefusal({layout}: {layout: CartLayout}) {
  const fetcher = useFetcher({key: ADD_TO_CART_FETCHER_KEY});
  const {type} = useAside();
  const data = fetcher.state !== 'submitting' ? fetcher.data : null;
  const open = layout === 'page' || type === 'cart';
  const [wasOpen, setWasOpen] = useState(open);
  const [dismissed, setDismissed] = useState<unknown>(null);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setDismissed(data);
  }

  return (
    <CartActionMessages data={data === dismissed ? null : data} className={layout === 'aside' ? 'mx-5 mt-4' : 'mb-4'} />
  );
}

function CartEmpty({layout}: {layout: CartLayout}) {
  const {t} = useTranslation();
  const {close} = useAside();

  return (
    <EmptyState
      icon={CartIcon}
      title={t('cart.empty')}
      text={t('cart.emptyText')}
      className={layout === 'aside' ? 'm-5' : 'mt-2'}
      action={
        <ButtonLink to="/categories" onClick={close} prefetch="viewport" variant="secondary">
          {t('cart.continueShopping')}
        </ButtonLink>
      }
    />
  );
}
