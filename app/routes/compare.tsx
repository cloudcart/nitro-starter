import {useEffect} from 'react';
import {Link, useLoaderData, useNavigate} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import {Price} from '~/components/ui/Price';
import type {Route} from './+types/compare';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {comparePath} from '~/components/CompareButton';
import {COMPARE, useProductList} from '~/lib/product-lists';
import {COMPARE_ENABLED} from '~/lib/features';
import {productPath} from '~/lib/urls';
import {shownCompareAtPrice} from '~/lib/variants';
import {EmptyState} from '~/components/ui/EmptyState';
import {ButtonLink} from '~/components/ui/Button';
import {CompareIcon} from '~/components/ui/icons';

export const meta: Route.MetaFunction = ({matches}) => privateMeta(metaTranslator(matches)('compare.title'));

/**
 * /compare — the products the visitor chose, side by side, property by property (at most three). Not found while the
 * store has comparison off (`COMPARE_ENABLED`).
 */
export async function loader({url, context}: Route.LoaderArgs) {
  if (!COMPARE_ENABLED) throw new Response(null, {status: 404});
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  if (!ids.length) return {ids, comparison: null};

  const {productComparison} = await context.storefront.query(COMPARE_QUERY, {
    variables: {ids, buyer: await context.customerAccount.getBuyer()},
  });

  return {ids, comparison: productComparison};
}

export default function Compare() {
  const {t} = useTranslation();
  const {ids, comparison} = useLoaderData<typeof loader>();
  const list = useProductList(COMPARE);
  const navigate = useNavigate();

  // Opened without products in the address: show the ones the browser kept.
  useEffect(() => {
    if (!ids.length && list.ids.length) void navigate(comparePath(list.ids), {replace: true});
  }, [ids.length, list.ids, navigate]);

  const products = comparison?.products ?? [];

  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-gutter py-10 md:px-gutter-md">
      <h1 className="text-title">{t('compare.title')}</h1>
      {!products.length ? (
        <EmptyState
          icon={CompareIcon}
          text={t('compare.none')}
          action={
            <ButtonLink to="/categories" variant="secondary">
              {t('compare.browse')}
            </ButtonLink>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-compare-table table-fixed border-collapse text-small">
            <caption className="sr-only">{t('compare.title')}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-48">
                  <span className="sr-only">{t('compare.property')}</span>
                </th>
                {products.map((product) => (
                  <th key={product.id} scope="col" className="p-3 text-left align-top font-normal">
                    <Link to={productPath(product.handle)} className="block hover:no-underline">
                      {product.featuredImage && (
                        <Image
                          data={product.featuredImage}
                          // The title is in the same link: the picture adds nothing for a screen reader (B-444).
                          alt=""
                          aspectRatio="1/1"
                          width={240}
                          // The table's head, on the first screen (B-443).
                          loading="eager"
                          className="mb-2 aspect-square w-full rounded-card object-contain"
                        />
                      )}
                      <span className="font-medium">{product.title}</span>
                    </Link>
                    <Price
                      price={product.selectedOrFirstAvailableVariant?.price}
                      compareAtPrice={shownCompareAtPrice(
                        product.selectedOrFirstAvailableVariant?.compareAtPrice,
                        product.discount,
                      )}
                      className="mt-1 block font-medium"
                    />
                    <button
                      type="button"
                      className="mt-2 min-h-9 text-small text-muted underline hover:text-foreground"
                      onClick={() => {
                        list.remove(product.id);
                        void navigate(comparePath(ids.filter((id) => id !== product.id)), {replace: true});
                      }}
                    >
                      {t('compare.remove')}
                      <span className="sr-only">: {product.title}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparison?.rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="p-3 text-left font-medium text-muted">
                    {row.name}
                  </th>
                  {products.map((product) => {
                    const cell = row.cells.find((candidate) => candidate.productId === product.id);
                    return (
                      <td key={product.id} className="p-3 align-top">
                        {cell?.values.length ? cell.values.join(t('format.list')) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const COMPARE_QUERY = `#graphql
  query Compare($ids: [ID!]!, $buyer: BuyerInput) @inContext(buyer: $buyer) {
    productComparison(productIds: $ids) {
      products {
        id
        title
        handle
        featuredImage {
          url
          width
          height
        }
        discount {
          hideDiscountPrice
        }
        selectedOrFirstAvailableVariant(selectedOptions: [], ignoreUnknownOptions: true) {
          price {
            amount
            currencyCode
            formatted
          }
          compareAtPrice {
            amount
            currencyCode
            formatted
          }
        }
      }
      rows {
        name
        cells {
          productId
          values
        }
      }
    }
  }
` as const;
