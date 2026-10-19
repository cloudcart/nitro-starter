import {type ReactNode, useState} from 'react';
import {ChevronDownIcon} from '~/components/ui/icons';

/**
 * A section that opens and closes: the browser's own `<details>`, so it works by keyboard, by screen reader and
 * without JavaScript; its height animates where the browser can (every `<details>`, in `app.css`). Items with the
 * same `name` form a group in which one is open at a time. `defaultOpen` counts when the item mounts: after that it is
 * the visitor's, and a render with another `defaultOpen` neither opens nor closes it (B-292).
 */
export function AccordionItem({
  title,
  name,
  defaultOpen = false,
  className = '',
  children,
}: {
  title: ReactNode;
  /** The group this item belongs to: opening it closes the others of the same name. */
  name?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [openAtMount] = useState(defaultOpen);
  return (
    <details name={name} open={openAtMount} className={`group border-b border-border ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}
