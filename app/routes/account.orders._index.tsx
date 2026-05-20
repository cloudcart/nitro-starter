import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {Money} from '@cloudcart/nitrogen-react';
import {ShoppingBagIcon, ChevronRightIcon} from '@heroicons/react/24/outline';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Orders | Nitrogen'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  const orders = await ctx.customerAccount.getOrders(50);
  return {orders};
}

const fulfillBadge: Record<string, string> = {
  fulfilled: 'bg-emerald-600 text-white',
  unfulfilled: 'bg-amber-500 text-white',
  partial: 'bg-sky-500 text-white',
};
const payBadge: Record<string, string> = {
  paid: 'bg-emerald-600 text-white',
  pending: 'bg-amber-500 text-white',
  refunded: 'bg-red-500 text-white',
};

export default function Orders() {
  const {orders} = useLoaderData<typeof loader>();

  if (!orders.length) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4">Orders</h2>
        <div className="py-16 text-center">
          <ShoppingBagIcon className="size-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 mb-1 font-medium">No orders yet</p>
          <p className="text-sm text-gray-400 mb-4">When you place an order, it will appear here.</p>
          <Link to="/collections" className="inline-flex items-center gap-1 text-sm text-brand font-medium hover:underline">
            Start shopping →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-bold mb-4">Orders</h2>

      {/* Desktop table — hidden on mobile */}
      <div className="hidden md:block overflow-hidden border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
              <th className="py-3 px-4 text-left font-medium">Order</th>
              <th className="py-3 px-4 text-left font-medium">Date</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
              <th className="py-3 px-4 text-left font-medium">Payment</th>
              <th className="py-3 px-4 text-right font-medium">Total</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => {
              const fColor = fulfillBadge[order.fulfillmentStatus?.toLowerCase()] ?? 'bg-gray-500 text-white';
              const pColor = payBadge[order.financialStatus?.toLowerCase()] ?? 'bg-gray-500 text-white';
              return (
                <tr key={order.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-3.5 px-4 font-semibold text-dark">#{order.orderNumber}</td>
                  <td className="py-3.5 px-4 text-gray-500">
                    {new Date(order.processedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block py-0.5 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider ${fColor}`}>
                      {order.fulfillmentStatus?.toLowerCase() ?? '—'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block py-0.5 px-2.5 rounded text-[0.65rem] font-bold uppercase tracking-wider ${pColor}`}>
                      {order.financialStatus?.toLowerCase() ?? '—'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold"><Money data={order.totalPrice} /></td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to={`/account/orders/${encodeURIComponent(order.id)}`} className="text-brand text-xs font-medium hover:underline">View →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — hidden on desktop */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => {
          const fColor = fulfillBadge[order.fulfillmentStatus?.toLowerCase()] ?? 'bg-gray-500 text-white';
          const pColor = payBadge[order.financialStatus?.toLowerCase()] ?? 'bg-gray-500 text-white';
          return (
            <Link
              key={order.id}
              to={`/account/orders/${encodeURIComponent(order.id)}`}
              className="block border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow hover:no-underline"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
                <span className="text-sm font-bold text-white">#{order.orderNumber}</span>
                <span className="text-xs text-gray-400">
                  {new Date(order.processedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                </span>
              </div>
              <div className="px-4 py-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1.5">
                    <span className={`py-0.5 px-2 rounded text-[0.6rem] font-bold uppercase tracking-wider ${fColor}`}>
                      {order.fulfillmentStatus?.toLowerCase() ?? '—'}
                    </span>
                    <span className={`py-0.5 px-2 rounded text-[0.6rem] font-bold uppercase tracking-wider ${pColor}`}>
                      {order.financialStatus?.toLowerCase() ?? '—'}
                    </span>
                  </div>
                  <ChevronRightIcon className="size-4 text-gray-300" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-dark"><Money data={order.totalPrice} /></span>
                  <span className="text-xs text-gray-400">{order.lineItems?.nodes?.length ?? 0} items</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
