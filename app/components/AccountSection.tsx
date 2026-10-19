import type {ReactNode} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {formatCount} from '~/lib/format';

/** A page of the account: its heading, with a count or an action beside it when given, and its content. */
export function AccountSection({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number | null;
  action?: ReactNode;
  children: ReactNode;
}) {
  const {language} = useTranslation();
  // One per account page, inside the page's `main`: not a landmark of its own (no name), since the table or list in it
  // names itself with the same words, and two landmarks of one name cannot be told apart (axe `landmark-unique`).
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">
          {title}
          {count ? <span className="ml-2 text-body text-muted">({formatCount(count, language)})</span> : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
