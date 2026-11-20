import {useId} from 'react';
import {AffinityWhy, AffinityWhyProvider, Image, KeptLink, useOrderByInterest} from '@cloudcart/nitrogen-react';
import type {VendorCardFragment} from 'storefrontapi.generated';
import {SectionHeading} from '~/components/SectionHeading';
import {vendorPath} from '~/lib/urls';

/** What a brand's card renders. */
export const VENDOR_CARD_FRAGMENT = `#graphql
  fragment VendorCard on Vendor {
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
  }
` as const;

/** A brand's card: its logo (or its first letter) and its name, a link to its page — the brands page and the home page. */
export function VendorCard({vendor, loading = 'lazy'}: {vendor: VendorCardFragment; loading?: 'eager' | 'lazy'}) {
  return (
    <KeptLink
      to={vendorPath(vendor.handle)}
      className="flex flex-col items-center gap-3 rounded-card border border-border p-4 text-center hover:border-foreground hover:no-underline"
    >
      <div className="flex h-16 w-full items-center justify-center">
        {vendor.image ? (
          <Image
            data={vendor.image}
            // The vendor's name is beside the logo, so the logo adds nothing to read.
            alt=""
            width={160}
            loading={loading}
            className="max-h-16 w-auto object-contain"
          />
        ) : (
          <span aria-hidden="true" className="text-h3 text-border">
            {vendor.title.slice(0, 1)}
          </span>
        )}
      </div>
      <span className="font-medium">{vendor.title}</span>
    </KeptLink>
  );
}

/** How many brands the home page's block shows: one row of six on a desktop. */
const MAX_VENDORS = 6;
const vendorId = (vendor: VendorCardFragment) => vendor.id;

/**
 * A titled row of brand cards in the visitor's order of interest (T-670): the brands they lean to first, then the
 * rest in the merchant's order — the merchant's alone on the server and for a visitor the browser knows nothing about.
 * With `to`, "View all" beside the title. Nothing when the store has no brands.
 */
export function VendorGrid({
  title,
  vendors,
  to,
  className = '',
}: {
  title: string;
  vendors: VendorCardFragment[];
  to?: string;
  className?: string;
}) {
  const titleId = useId();
  const ordered = useOrderByInterest(vendors, 'vendor', vendorId);
  if (!vendors.length) return null;

  return (
    <section aria-labelledby={titleId} className={className}>
      <SectionHeading id={titleId} title={title} to={to} />
      {/* Ordered by the visitor's interest: each brand's place and why, while the Affinity overlay is on (T-682). */}
      <AffinityWhyProvider value={{interest: {dimension: 'vendor', ids: ordered.map(vendorId)}}}>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {ordered.slice(0, MAX_VENDORS).map((vendor) => (
            <li key={vendor.id}>
              <VendorCard vendor={vendor} />
              <AffinityWhy entry={vendor.id} />
            </li>
          ))}
        </ul>
      </AffinityWhyProvider>
    </section>
  );
}
