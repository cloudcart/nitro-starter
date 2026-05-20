import {Link, useLoaderData, redirect} from 'react-router';
import type {Route} from './+types/account.orders.$id';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import type {MailingAddress} from '@cloudcart/nitrogen';
import {Money, Image} from '@cloudcart/nitrogen-react';
import {ArrowLeftIcon, TruckIcon, MapPinIcon, BuildingOfficeIcon, CreditCardIcon, ChatBubbleLeftIcon, TagIcon, DocumentTextIcon, CalendarIcon} from '@heroicons/react/24/outline';

export const meta: Route.MetaFunction = ({data}) =>
  getSeoMeta({title: data?.order ? `Order #${data.order.orderNumber}` : 'Order'});

export async function loader({context, request, params}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  if (!params.id) throw redirect('/account/orders');
  const order = await ctx.customerAccount.getOrder(decodeURIComponent(params.id));
  if (!order) throw redirect('/account/orders');
  return {order};
}

const statusColor: Record<string, string> = {
  fulfilled: 'bg-emerald-600 text-white',
  unfulfilled: 'bg-amber-500 text-white',
  partial: 'bg-sky-500 text-white',
  paid: 'bg-emerald-600 text-white',
  pending: 'bg-amber-500 text-white',
  refunded: 'bg-red-500 text-white',
};

export default function OrderDetail() {
  const {order} = useLoaderData<typeof loader>();
  const lineItems = order.lineItems?.nodes ?? [];
  const totals = (order as any).totals ?? [];
  const fulfillment = (order as any).fulfillment;
  const payments = (order as any).payments ?? [];
  const discounts = (order as any).discounts ?? [];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/account/orders" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand mb-3 hover:no-underline">
          <ArrowLeftIcon className="size-3" />
          Back to orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Order #{order.orderNumber}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(order.processedAt).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge value={order.fulfillmentStatus} />
            <Badge value={order.financialStatus} />
          </div>
        </div>
      </div>

      {/* Info cards — fluid wrap */}
      <div className="flex flex-wrap gap-4">
        {order.shippingAddress && (
          <InfoCard icon={MapPinIcon} title="Shipping address">
            <FormattedAddress address={order.shippingAddress} />
          </InfoCard>
        )}
        {order.billingAddress && (
          <InfoCard icon={BuildingOfficeIcon} title="Billing address">
            <FormattedAddress address={order.billingAddress} />
          </InfoCard>
        )}
        {(payments.length > 0 || order.paymentMethod) && (
          <InfoCard icon={CreditCardIcon} title="Payment">
            {payments.length > 0 ? payments.map((p: any, i: number) => (
              <div key={i} className={i > 0 ? 'mt-2 pt-2 border-t border-gray-100' : ''}>
                <p className="text-sm font-medium">{p.providerName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{p.amountFormatted}</span>
                  <span className={`py-0.5 px-1.5 rounded text-[0.6rem] font-bold uppercase ${statusColor[p.status?.toLowerCase()] ?? 'bg-gray-200 text-gray-600'}`}>
                    {p.statusFormatted || p.status}
                  </span>
                </div>
                {p.referenceId && <p className="text-[0.65rem] text-gray-400 mt-0.5 font-mono">Ref: {p.referenceId}</p>}
                <p className="text-[0.65rem] text-gray-400">{p.dateAdded}</p>
              </div>
            )) : (
              <p className="text-sm font-medium">{order.paymentMethod}</p>
            )}
          </InfoCard>
        )}
        {fulfillment && (
          <InfoCard icon={TruckIcon} title="Delivery">
            {fulfillment.shippingProvider && <p className="text-sm font-medium">{fulfillment.shippingProvider}</p>}
            {fulfillment.trackingNumber && (
              <p className="text-sm mt-1">
                {fulfillment.trackingUrl ? (
                  <a href={fulfillment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    Track: {fulfillment.trackingNumber} →
                  </a>
                ) : (
                  <span>Tracking: <span className="font-mono text-xs">{fulfillment.trackingNumber}</span></span>
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
              {fulfillment.expeditionDate && <span>Shipped: {fulfillment.expeditionDate}</span>}
              {fulfillment.deliveryDate && <span>ETA: {fulfillment.deliveryDate}</span>}
              {fulfillment.fulfilledAt && <span>Fulfilled: {fulfillment.fulfilledAt}</span>}
            </div>
          </InfoCard>
        )}
        {(order.invoiceNumber || order.shippingDate) && (
          <InfoCard icon={DocumentTextIcon} title="Details">
            {order.invoiceNumber && <p className="text-sm">Invoice: <span className="font-medium">{order.invoiceNumber}</span></p>}
            {order.shippingDate && <p className="text-sm mt-1">Delivery date: <span className="font-medium">{order.shippingDate}</span></p>}
          </InfoCard>
        )}
      </div>

      {/* Discounts */}
      {discounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {discounts.map((d: any, i: number) => (
            <div key={i} className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
              <TagIcon className="size-3.5" />
              <span className="font-medium">{d.name}</span>
              {d.code && <span className="font-mono bg-purple-100 px-1.5 py-0.5 rounded">{d.code}</span>}
              <span className="text-purple-500">
                {d.type === 'percent' ? `-${d.value}%` : d.type === 'shipping' ? 'Free shipping' : `-${d.value}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Customer note */}
      {order.note && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
          <ChatBubbleLeftIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Your note</p>
            <p className="text-sm text-amber-800">{order.note}</p>
          </div>
        </div>
      )}

      {/* Line items */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Items</h3>

        {/* Desktop */}
        <div className="hidden sm:block border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                <th className="py-2.5 px-4 text-left font-medium">Product</th>
                <th className="py-2.5 px-4 text-right font-medium">Price</th>
                <th className="py-2.5 px-4 text-right font-medium">Qty</th>
                <th className="py-2.5 px-4 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className={`border-t border-gray-100 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-3 px-4">
                    <LineItemContent item={item} />
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {item.variant ? <Money data={item.variant.price} /> : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {item.variant ? (
                      <Money data={{
                        amount: (parseFloat(item.variant.price.amount) * item.quantity).toFixed(2),
                        currencyCode: item.variant.price.currencyCode,
                      }} />
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden space-y-3">
          {lineItems.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="flex items-center gap-3 p-3">
                {item.image?.url ? (
                  <Image data={item.image} width={56} height={56} className="w-14 h-14 rounded-lg bg-gray-50 object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-gray-50 rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {item.productHandle ? (
                    <Link to={`/products/${item.productHandle}`} className="text-sm font-medium text-dark hover:text-brand hover:no-underline line-clamp-2">{item.title}</Link>
                  ) : (
                    <p className="text-sm font-medium text-dark line-clamp-2">{item.title}</p>
                  )}
                  {item.variant?.title && item.variant.title !== 'Default' && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.variant.title}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100 text-sm">
                <span className="text-gray-500">Qty: {item.quantity} × {item.variant ? <Money as="span" data={item.variant.price} /> : '—'}</span>
                <span className="font-semibold">
                  {item.variant ? (
                    <Money data={{
                      amount: (parseFloat(item.variant.price.amount) * item.quantity).toFixed(2),
                      currencyCode: item.variant.price.currencyCode,
                    }} />
                  ) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      {totals.length > 0 && (
        <div className="sm:ml-auto sm:max-w-xs">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {totals.map((total: any, i: number) => {
              const isTotal = total.group === 'total';
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    isTotal
                      ? 'bg-gray-900 text-white'
                      : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } ${i > 0 && !isTotal ? 'border-t border-gray-100' : ''}`}
                >
                  <span className={`text-sm ${isTotal ? 'font-bold' : 'text-gray-600'}`}>{total.name}</span>
                  <span className={`text-sm ${isTotal ? 'font-bold text-base' : 'font-medium'}`}>{total.priceFormatted}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Badge({value}: {value: string | null}) {
  if (!value) return null;
  const color = statusColor[value.toLowerCase()] ?? 'bg-gray-500 text-white';
  return (
    <span className={`inline-block py-1 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider ${color}`}>
      {value.toLowerCase()}
    </span>
  );
}

function InfoCard({icon: Icon, title, children}: {icon: React.ComponentType<{className?: string}>; title: string; children: React.ReactNode}) {
  return (
    <div className="flex-1 min-w-[220px] border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900">
        <Icon className="size-3.5 text-gray-400" />
        <h4 className="text-xs font-medium uppercase tracking-wider text-white">{title}</h4>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LineItemContent({item}: {item: any}) {
  const content = (
    <div className="flex items-start gap-3">
      {item.image?.url ? (
        <Image data={item.image} width={48} height={48} className="w-12 h-12 rounded-lg bg-gray-50 object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 bg-gray-50 rounded-lg shrink-0" />
      )}
      <div>
        <div className="font-medium text-dark">{item.title}</div>
        {item.variant?.title && item.variant.title !== 'Default' && (
          <div className="text-xs text-gray-400 mt-0.5">{item.variant.title}</div>
        )}
      </div>
    </div>
  );
  return item.productHandle ? (
    <Link to={`/products/${item.productHandle}`} className="hover:no-underline">{content}</Link>
  ) : content;
}

function FormattedAddress({address}: {address: MailingAddress}) {
  return (
    <div className="text-sm text-gray-600 leading-relaxed">
      <p className="font-medium text-dark">{[address.firstName, address.lastName].filter(Boolean).join(' ')}</p>
      {address.company && <p>{address.company}</p>}
      {(address as any).companyVat && <p className="text-xs text-gray-400">VAT: {(address as any).companyVat}</p>}
      {address.address1 && <p>{address.address1}</p>}
      {address.address2 && <p>{address.address2}</p>}
      <p>{[address.city, address.province, address.zip].filter(Boolean).join(', ')}</p>
      {address.country && <p>{address.country}</p>}
      {address.phone && <p className="text-gray-400 mt-1">{address.phone}</p>}
    </div>
  );
}
