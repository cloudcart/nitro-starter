import {useRouteLoaderData} from 'react-router';
import {formatDateTime, parseDateTime, useTranslation} from '@cloudcart/nitrogen';
import type {RootLoader} from '~/root';

/**
 * A date or time from the API, as `<time>`, in the visitor's language — the texts' around it, as every number on the
 * page (B-435) — and the store's time zone (`shop.ianaTimezone`),
 * so the day shown is the store's and the server and the browser render the same text (B-163). Nitrogen reads the
 * API's `DateTime` as UTC.
 */
export function DateText({
  value,
  options = {dateStyle: 'medium'},
  className,
}: {
  value: string | null | undefined;
  /** Defaults to `{dateStyle: 'medium'}`, as Nitrogen's `formatDateTime`; a `timeZone` here wins over the store's. */
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}) {
  const {language} = useTranslation();
  const header = useRouteLoaderData<RootLoader>('root')?.header;
  // Without the root's data (an error page), Nitrogen's UTC: never the runtime's own zone, which differs.
  const timeZone = header?.shop.ianaTimezone;
  const date = parseDateTime(value);
  if (!date) return null;

  return (
    <time className={className} dateTime={date.toISOString()}>
      {formatDateTime(value, language, {...(timeZone && {timeZone}), ...options})}
    </time>
  );
}
