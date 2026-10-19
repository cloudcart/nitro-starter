import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {MenuLink, type ParentMenuItem} from '~/components/MenuLink';
import {ProductItem, ProductItemPlaceholder} from '~/components/ProductItem';
import {ChevronDownIcon} from '~/components/ui/icons';
import type {loader as menuProductsLoader} from '~/routes/menu-products';
import {ReviewDisplayProvider} from '~/components/ReviewDisplay';

/**
 * A card's picture in the panel: four cards with 1.5rem gaps in three quarters of the page box (its 2.5rem gutters),
 * beside the links' column and a 2.5rem gap.
 */
/** How many products a mega-menu panel shows (`/menu-products`); the missing page shows the same four. */
export const MENU_PRODUCTS = 4;

const MENU_CARD_SIZES = '(min-width: 1440px) 230px, calc(18.75vw - 40px)';

/** How long the pointer rests on an item before its panel opens, or away before it closes. */
const HOVER_DELAY_MS = 150;

/**
 * The main menu on a desktop (from 990 px). A top item with children opens a panel under the header: its links in
 * columns, its own link as "View all", and products — those of the collection it links to, or the store's featured
 * ones — fetched when the panel first opens. Hovering opens a panel after a short rest; a click or Enter toggles it;
 * Escape, or focus or the pointer leaving it, closes it.
 */
export function MegaMenu({items, toPath}: {items: ParentMenuItem[]; toPath: (url: string) => string}) {
  const {t} = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <nav aria-label={t('menu.label')} className="hidden lg:block">
      <ul className="flex items-center gap-6">
        {items.map((item) =>
          item.items.length > 0 ? (
            <MegaMenuItem
              key={item.id}
              item={item}
              toPath={toPath}
              open={openId === item.id}
              setOpen={(open) => setOpenId((current) => (open ? item.id : current === item.id ? null : current))}
            />
          ) : (
            <li key={item.id}>
              <MenuLink item={item} toPath={toPath} className="flex h-16 items-center hover:no-underline" />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function MegaMenuItem({
  item,
  toPath,
  open,
  setOpen,
}: {
  item: ParentMenuItem;
  toPath: (url: string) => string;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const {t} = useTranslation();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const products = useFetcher<typeof menuProductsLoader>();

  const later = (next: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(next), HOVER_DELAY_MS);
  };

  // The products are fetched once, when the panel first opens.
  useEffect(() => {
    if (open && products.state === 'idle' && !products.data) {
      void products.load(`/menu-products?collection=${encodeURIComponent(item.resourceId ?? '')}`);
    }
  }, [open, products, item.resourceId]);

  // While it is open, Escape closes it and gives focus back to its button.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        setOpen(false);
        buttonRef.current?.focus();
      },
      {signal: controller.signal},
    );
    return () => controller.abort();
  }, [open, setOpen]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <li
      onPointerEnter={() => later(true)}
      onPointerLeave={() => later(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex h-16 items-center gap-1"
      >
        {item.title}
        <ChevronDownIcon className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="reveal absolute inset-x-0 top-full z-40 border-t border-b border-border bg-background shadow-overlay"
      >
        <div className="mx-auto grid max-w-page grid-cols-[minmax(var(--container-menu-column),1fr)_3fr] gap-10 px-gutter-md py-8">
          <ul className="flex flex-col gap-1">
            {item.url && (
              <li>
                <MenuLink
                  item={item}
                  toPath={toPath}
                  onClick={() => setOpen(false)}
                  className="block py-1.5 font-medium"
                >
                  {t('menu.viewAll')}
                </MenuLink>
              </li>
            )}
            {item.items.map((child) => (
              <li key={child.id}>
                <MenuLink item={child} toPath={toPath} onClick={() => setOpen(false)} className="block py-1.5" />
              </li>
            ))}
          </ul>
          {/* A category with no products: the panel is its links alone (B-437). */}
          <ReviewDisplayProvider value={products.data?.reviewDisplay}>
            <ul
              hidden={products.data?.products.length === 0}
              className="grid grid-cols-4 gap-6"
              aria-busy={products.state !== 'idle'}
            >
              {products.data
                ? products.data.products.map((product) => (
                    <li key={product.id}>
                      {/* In the header, before the page's h1: the titles are no headings (B-448). */}
                      <ProductItem product={product} loading="lazy" sizes={MENU_CARD_SIZES} titleAs="p" />
                    </li>
                  ))
                : // While they load, the panel keeps the cards' size.
                  Array.from({length: MENU_PRODUCTS}, (_, slot) => (
                    <li key={slot}>
                      <ProductItemPlaceholder />
                    </li>
                  ))}
            </ul>
          </ReviewDisplayProvider>
        </div>
      </div>
    </li>
  );
}
