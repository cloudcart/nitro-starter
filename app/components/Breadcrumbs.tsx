import type {CSSProperties} from 'react';
import {Link} from 'react-router';
import {generateBreadcrumbJsonLd, useTranslation} from '@cloudcart/nitrogen';

export type Crumb = {title: string; to?: string};

/**
 * Where the page sits in the catalogue: Home › Parent › Page, on one line (`crumbs`). What does not fit is cut short
 * with an ellipsis: the page's own title first, which its heading repeats; the parents only when they alone do not fit.
 */
export function Breadcrumbs({items}: {items: Crumb[]}) {
  const {t} = useTranslation();
  const all: Crumb[] = [{title: t('navigation.home'), to: '/'}, ...items];

  return (
    // First on its page, below the page's top padding (`py-8`): raised by half of it, it stands as far below the header
    // as above what follows (the user, T-542).
    <nav aria-label={t('navigation.breadcrumb')} className="-mt-4 mb-4 text-small text-muted">
      <ol
        className="crumbs grid items-center gap-1.5 whitespace-nowrap"
        style={{'--crumbs': all.length - 1} as CSSProperties}
      >
        {all.map((crumb, index) => {
          const current = index === all.length - 1;
          return (
            <li key={crumb.to ?? crumb.title} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="shrink-0">
                  ›
                </span>
              )}
              {crumb.to && !current ? (
                <Link to={crumb.to} title={crumb.title} className="truncate hover:text-foreground">
                  {crumb.title}
                </Link>
              ) : (
                <span
                  aria-current={current ? 'page' : undefined}
                  className={`truncate ${current ? 'text-foreground' : ''}`}
                >
                  {crumb.title}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The breadcrumb's place on a page being opened (`PendingPage`): its line, until the page knows where it sits. */
export function BreadcrumbsPlaceholder() {
  return (
    <div aria-hidden="true" className="-mt-4 mb-4 text-small">
      <span className="block h-lh w-48 max-w-full bg-surface" />
    </div>
  );
}

/** The breadcrumb as JSON-LD, for search results; `home` names the first crumb, as the visible one does. */
export function breadcrumbJsonLd(origin: string, items: Crumb[], home: string) {
  return generateBreadcrumbJsonLd([
    {name: home, url: `${origin}/`},
    ...items.filter((item) => item.to).map((item) => ({name: item.title, url: `${origin}${item.to}`})),
  ]);
}
