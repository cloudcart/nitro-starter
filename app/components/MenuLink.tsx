import {KeptNavLink} from '@cloudcart/nitrogen-react';
import type {HeaderQuery} from 'storefrontapi.generated';

/** A top item of the main menu, with its children. */
export type ParentMenuItem = NonNullable<HeaderQuery['menu']>['items'][number];
/** Any item of the main menu. */
export type MenuItem = ParentMenuItem | ParentMenuItem['items'][number];

/** A menu item: an in-app link to the store's own pages, a plain link elsewhere, and its title alone when it has no address. */
export function MenuLink({
  item,
  toPath,
  onClick,
  className,
  children,
}: {
  item: MenuItem;
  toPath: (url: string) => string;
  onClick?: () => void;
  className?: string;
  /** What the link shows, when not the item's title ("View all"). */
  children?: React.ReactNode;
}) {
  const label = children ?? item.title;
  if (!item.url) return <span className={className}>{label}</span>;

  const to = toPath(item.url);
  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} className={className} {...(item.openInNewTab ? {target: '_blank', rel: 'noreferrer'} : {})}>
        {label}
      </a>
    );
  }

  return (
    <KeptNavLink
      end
      onClick={onClick}
      to={to}
      {...(item.openInNewTab ? {target: '_blank', rel: 'noreferrer'} : {})}
      className={({isActive}) => `${className ?? ''} ${isActive ? 'font-medium' : ''}`}
    >
      {label}
    </KeptNavLink>
  );
}
