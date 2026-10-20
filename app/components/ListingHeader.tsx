import type {ReactNode} from 'react';
import {Breadcrumbs, BreadcrumbsPlaceholder, type Crumb} from '~/components/Breadcrumbs';
import {PillLinks} from '~/components/PillLinks';

/**
 * The head of a listing page: the breadcrumb, the title (after an image, such as a vendor's logo), and links into
 * the listing, such as a category's subcategories. The merchant's description goes under the products
 * (`ListingDescription`). The title wraps, a long word too, and never passes the screen's edge; on a phone an image
 * stands alone, the title kept for screen readers (the user, 2026-10-19, T-567: the logo and the name did not fit).
 */
export function ListingHeader({
  crumbs,
  title,
  media,
  links = [],
  linksLabel,
  currentLink,
}: {
  crumbs: Crumb[];
  title: string;
  /** An image that names the page, as the title does: a vendor's logo. */
  media?: ReactNode;
  links?: Array<{title: string; to: string}>;
  /** Names the links for assistive technology. */
  linksLabel?: string;
  /** The link to this page among `links`, marked as current. */
  currentLink?: string;
}) {
  return (
    <header className="pb-8">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-6">
          {media}
          <h1 className={`min-w-0 text-title wrap-break-word ${media ? 'max-md:sr-only' : ''}`}>{title}</h1>
        </div>
        <PillLinks label={linksLabel ?? title} links={links} current={currentLink} />
      </div>
    </header>
  );
}

/** The head of a listing being opened (`PendingPage`): the title its link gave, the breadcrumb's line until it loads. */
export function ListingHeaderPlaceholder({title}: {title?: string}) {
  return (
    <header className="pb-8">
      <BreadcrumbsPlaceholder />
      {title ? (
        <h1 className="min-w-0 text-title wrap-break-word">{title}</h1>
      ) : (
        <span aria-hidden="true" className="block h-lh w-1/2 bg-surface text-title" />
      )}
    </header>
  );
}
