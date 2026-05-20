import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.payments';
import {getContext} from '~/lib/context';
import {getSeoMeta, extractId} from '@cloudcart/nitrogen';
import {CreditCardIcon} from '@heroicons/react/24/outline';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Payments | Nitrogen'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  const payments = await ctx.customerAccount.getPayments(50);
  return {payments};
}

function statusTone(status: string): 'green' | 'red' | 'amber' {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'authorized' || s === 'paid') return 'green';
  if (['refunded', 'cancelled', 'failed', 'voided', 'timeouted', 'chargebacked'].includes(s)) return 'red';
  return 'amber';
}

const toneClass: Record<'green' | 'red' | 'amber', string> = {
  green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
};

function StatusBadge({status, formatted}: {status: string; formatted: string}) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${toneClass[tone]}`}>
      {formatted || status}
    </span>
  );
}

export default function Payments() {
  const {payments} = useLoaderData<typeof loader>();
  const items = payments.nodes;

  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4">Payments</h2>
        <div className="py-16 text-center">
          <CreditCardIcon className="size-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 mb-1 font-medium">No payments yet</p>
          <p className="text-sm text-gray-400 mb-4">Payments from your orders will appear here.</p>
          <Link to="/collections" className="inline-flex items-center gap-1 text-sm text-brand font-medium hover:underline">
            Browse products →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Payments</h2>
        <span className="text-sm text-gray-400">
          {payments.totalCount} {payments.totalCount === 1 ? 'payment' : 'payments'}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
              <th className="py-3 px-4 text-left font-medium">Payment #</th>
              <th className="py-3 px-4 text-left font-medium">Provider</th>
              <th className="py-3 px-4 text-right font-medium">Amount</th>
              <th className="py-3 px-4 text-left font-medium">Order</th>
              <th className="py-3 px-4 text-left font-medium">Date</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr
                key={p.id}
                className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
              >
                <td className="py-3.5 px-4 font-mono text-xs text-gray-600">#{extractId(p.id)}</td>
                <td className="py-3.5 px-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="size-4 text-gray-400 shrink-0" />
                    <span className="truncate">{p.providerName}</span>
                  </div>
                  {p.referenceId && <div className="text-xs text-gray-400 font-mono ml-6 truncate" title={p.referenceId}>{p.referenceId}</div>}
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-dark">{p.amountFormatted}</td>
                <td className="py-3.5 px-4">
                  <Link
                    to={`/account/orders/${encodeURIComponent(p.orderId)}`}
                    className="text-brand text-xs hover:underline"
                  >
                    #{p.orderNumber}
                  </Link>
                </td>
                <td className="py-3.5 px-4 text-gray-500 text-xs">
                  {new Date(p.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={p.status} formatted={p.statusFormatted} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((p) => (
          <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-900">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCardIcon className="size-3.5 text-gray-400 shrink-0" />
                <span className="text-xs font-medium text-white truncate">{p.providerName}</span>
              </div>
              <span className="text-xs font-mono text-gray-300 shrink-0">#{extractId(p.id)}</span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-dark">{p.amountFormatted}</span>
                <StatusBadge status={p.status} formatted={p.statusFormatted} />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <Link
                  to={`/account/orders/${encodeURIComponent(p.orderId)}`}
                  className="text-brand hover:underline"
                >
                  Order #{p.orderNumber}
                </Link>
                <span>{new Date(p.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
              </div>
              {p.referenceId && (
                <div className="text-xs text-gray-400 font-mono mt-1 truncate" title={p.referenceId}>
                  Ref: {p.referenceId}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
