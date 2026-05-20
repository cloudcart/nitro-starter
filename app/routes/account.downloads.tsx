import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.downloads';
import {getContext} from '~/lib/context';
import {getSeoMeta} from '@cloudcart/nitrogen';
import {ArrowDownTrayIcon, DocumentIcon, ChevronRightIcon} from '@heroicons/react/24/outline';

export const meta: Route.MetaFunction = () => getSeoMeta({title: 'Downloads | Nitrogen'});

export async function loader({context, request}: Route.LoaderArgs) {
  const ctx = await getContext(context, request);
  ctx.customerAccount.handleAuthStatus();
  const downloads = await ctx.customerAccount.getDownloads(50);
  return {downloads};
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Downloads() {
  const {downloads} = useLoaderData<typeof loader>();
  const items = downloads.nodes;

  if (items.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4">Downloads</h2>
        <div className="py-16 text-center">
          <ArrowDownTrayIcon className="size-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 mb-1 font-medium">No downloads available</p>
          <p className="text-sm text-gray-400 mb-4">Digital files from your completed orders will appear here.</p>
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
        <h2 className="text-lg font-bold">Downloads</h2>
        <span className="text-sm text-gray-400">
          {downloads.totalCount} {downloads.totalCount === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
              <th className="py-3 px-4 text-left font-medium">File</th>
              <th className="py-3 px-4 text-left font-medium">Product</th>
              <th className="py-3 px-4 text-left font-medium">Order</th>
              <th className="py-3 px-4 text-right font-medium">Size</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {items.map((d, i) => (
              <tr
                key={d.id}
                className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="size-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-dark truncate max-w-xs" title={d.fileName}>
                      {d.fileName}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-gray-600">
                  {d.productHandle ? (
                    <Link to={`/products/${d.productHandle}`} className="text-gray-600 hover:text-brand">
                      {d.productTitle}
                    </Link>
                  ) : d.productTitle}
                  {d.vendor && <div className="text-xs text-gray-400">{d.vendor}</div>}
                </td>
                <td className="py-3.5 px-4">
                  <Link
                    to={`/account/orders/${encodeURIComponent(`gid://cloudcart/Order/${d.orderNumber}`)}`}
                    className="text-brand text-xs hover:underline"
                  >
                    #{d.orderNumber}
                  </Link>
                  <div className="text-xs text-gray-400">
                    {new Date(d.orderedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right text-gray-500 text-xs font-mono">
                  {formatBytes(d.fileSize)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <a
                    href={d.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 py-1.5 px-3 text-xs font-medium text-white bg-brand rounded-lg hover:opacity-90 transition-opacity hover:no-underline"
                  >
                    <ArrowDownTrayIcon className="size-3.5" />
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((d) => (
          <div key={d.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900">
              <DocumentIcon className="size-3.5 text-gray-400" />
              <span className="text-xs font-medium text-white truncate">{d.fileName}</span>
            </div>
            <div className="px-4 py-3">
              <div className="text-sm">
                {d.productHandle ? (
                  <Link to={`/products/${d.productHandle}`} className="font-medium text-dark hover:text-brand hover:no-underline">
                    {d.productTitle}
                  </Link>
                ) : (
                  <span className="font-medium text-dark">{d.productTitle}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <Link
                  to={`/account/orders/${encodeURIComponent(`gid://cloudcart/Order/${d.orderNumber}`)}`}
                  className="text-brand hover:underline"
                >
                  #{d.orderNumber}
                </Link>
                <span>{new Date(d.orderedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                {d.fileSize > 0 && <span className="font-mono">{formatBytes(d.fileSize)}</span>}
              </div>
            </div>
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
              <a
                href={d.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium text-white bg-brand rounded-lg hover:opacity-90 transition-opacity hover:no-underline"
              >
                <ArrowDownTrayIcon className="size-3.5" />
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
