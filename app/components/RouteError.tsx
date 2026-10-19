import {isRouteErrorResponse, useRouteError} from 'react-router';
import {useTranslation} from '@cloudcart/nitrogen';
import {NotFound} from '~/components/NotFound';
import {ButtonLink} from '~/components/ui/Button';

/**
 * The page a route shows for its error, inside the store's header and footer: a missing page, or the store's own words
 * for any other error. Exported as `ErrorBoundary` by every route with an `action`: an action's error stops at the
 * nearest boundary, and without the route's own it reaches the root, whose loader is then not run — no store data, no
 * translations (B-201).
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  return <ErrorView status={isRouteErrorResponse(error) ? error.status : 500} message={errorMessage(error)} />;
}

/**
 * An account page's error, in the account's column under the account's own `h1`: an `h2` and the way on, without the
 * full page's large status and featured products (B-433).
 */
export function AccountRouteErrorBoundary() {
  const {t} = useTranslation();
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  const message = errorMessage(error);

  return (
    <section className="flex flex-col items-start gap-4">
      <h2 className="text-heading">{missing ? t('notFound.title') : t('error.title')}</h2>
      <p className="text-muted">{missing ? t('notFound.text') : t('error.text')}</p>
      {import.meta.env.DEV && !missing && message && (
        <pre className="text-small whitespace-pre-wrap text-muted">{message}</pre>
      )}
      <ButtonLink to={missing ? '/categories' : '/'} variant="secondary">
        {missing ? t('notFound.continue') : t('error.home')}
      </ButtonLink>
    </section>
  );
}

/** An error's message, as a developer reads it. */
function errorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) return String(error.data?.message ?? error.data ?? '');
  return error instanceof Error ? error.message : '';
}

/**
 * An error other than a missing page: its status, the store's own words for it, and the way home. The error's message
 * is a developer's — it can hold a server's detail or text the request sent — so it shows only in development (B-201).
 */
function ErrorView({status, message}: {status: number; message: string}) {
  const {t} = useTranslation();

  return (
    <div className="mx-auto flex max-w-reading flex-col items-center gap-4 px-gutter py-24 text-center md:px-gutter-md">
      {/* Light, yet at 3:1 as large text, as the missing page's (B-432). */}
      <p aria-hidden="true" className="text-h1 text-control">
        {status}
      </p>
      <h1 className="text-title">{t('error.title')}</h1>
      <p className="text-muted">{t('error.text')}</p>
      {import.meta.env.DEV && message && <pre className="text-small whitespace-pre-wrap text-muted">{message}</pre>}
      <ButtonLink to="/" className="mt-2">
        {t('error.home')}
      </ButtonLink>
    </div>
  );
}
