import type {ComponentType, ReactNode} from 'react';
import type {IconProps} from '~/components/ui/icons';

/**
 * What a list or a page shows with nothing in it: an icon, a title, a line of text and the way on, centred in one
 * quiet panel — the empty cart, wishlist, comparison, orders and reviews, and a search that found nothing.
 */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className = '',
}: {
  icon?: ComponentType<IconProps>;
  title?: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-12 text-center ${className}`}>
      {Icon && <Icon className="size-8 text-muted" />}
      {title && <p className="text-subheading">{title}</p>}
      {text && <p className="max-w-narrow text-small text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
