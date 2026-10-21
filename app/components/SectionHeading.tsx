import {KeptLink} from '@cloudcart/nitrogen-react';
import {useTranslation} from '@cloudcart/nitrogen';

/**
 * A section's title, and "View all" beside it when the section shows part of a longer list (`to`). The link names
 * the section for screen readers. `id` lets the section be labelled by its title.
 */
export function SectionHeading({id, title, to}: {id: string; title: string; to?: string}) {
  const {t} = useTranslation();

  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-heading">
        {title}
      </h2>
      {to && (
        <KeptLink to={to} className="shrink-0 font-medium underline underline-offset-4">
          {t('actions.viewAll')}
          <span className="sr-only">: {title}</span>
        </KeptLink>
      )}
    </div>
  );
}
