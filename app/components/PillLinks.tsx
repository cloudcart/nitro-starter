/**
 * A row of links as pills, such as a category's subcategories, the blog's categories or the pages a search found,
 * named by `label`. The link to `current` is filled and marked as the current page.
 */
export function PillLinks({
  label,
  links,
  current,
}: {
  label: string;
  links: Array<{title: string; to: string}>;
  current?: string;
}) {
  if (!links.length) return null;

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const isCurrent = link.to === current;
          return (
            <li key={link.to}>
              <KeptLink
                to={link.to}
                aria-current={isCurrent ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-button border px-4 text-small hover:no-underline ${isCurrent ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'}`}
              >
                {link.title}
              </KeptLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
import {KeptLink} from '@cloudcart/nitrogen-react';
