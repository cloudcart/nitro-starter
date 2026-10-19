import {Suspense, useState, useSyncExternalStore} from 'react';
import {Await, useFetcher, useRouteLoaderData} from 'react-router';
import type {PolicyConsentRequestFragment} from 'storefrontapi.generated';
import type {RootLoader} from '~/root';
import type {action} from '~/routes/account_.policy-consent';
import {Dialog} from '~/components/Dialog';
import {FormStatus, PolicyCheckboxes} from '~/components/FormFields';
import {POLICY_FRAGMENT} from '~/lib/fragments';
import {useTranslation} from '@cloudcart/nitrogen';
import {RichText} from '@cloudcart/nitrogen-react';
import {Button} from '~/components/ui/Button';

/** Where "Not now" is remembered: for this browser session, as the platform asks again on the next visit. */
const DISMISSED_KEY = 'policy-consent-request-dismissed';

/**
 * The store's request that a signed-in customer accept its policies — the GDPR
 * app's "request for consent for registered users after login". The API says
 * whether there is anything to ask (`Customer.policyConsentRequest`), so this
 * only shows it and sends what the customer accepts.
 */
export function PolicyConsentRequest() {
  const root = useRouteLoaderData<RootLoader>('root');

  return (
    <Suspense>
      <Await resolve={root?.policyConsentRequest} errorElement={null}>
        {(request) => (request ? <PolicyConsentDialog request={request} /> : null)}
      </Await>
    </Suspense>
  );
}

function PolicyConsentDialog({request}: {request: PolicyConsentRequestFragment}) {
  const {t} = useTranslation();
  const fetcher = useFetcher<typeof action>();
  // "Not now" from earlier in this browser session lives in sessionStorage, which the server
  // cannot read: the server and the hydrating render say "dismissed", the browser's answer follows.
  const dismissedEarlier = useSyncExternalStore(neverChanges, readDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);

  const hidden = dismissedEarlier || dismissedNow || Boolean(fetcher.data?.accepted);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage may be unavailable; the request then shows again on the next page load.
    }
    setDismissedNow(true);
  };

  return (
    <Dialog open={!hidden} onClose={dismiss} heading={t('policyConsent.title')}>
      <div className="px-5 pb-5">
        {request.text && (
          <RichText data={request.text} headingStart={3} className="prose prose-tokens mt-3 max-w-none" />
        )}
        <fetcher.Form method="post" action="/account/policy-consent" className="mt-4 flex flex-col gap-4">
          <PolicyCheckboxes policies={request.policies} form="POLICIES_POPUP" errors={fetcher.data?.errors} />
          <FormStatus errors={fetcher.data?.errors} fields={['acceptedPolicyIds']} />
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={dismiss}>
              {t('policyConsent.later')}
            </Button>
            <Button type="submit" loading={fetcher.state !== 'idle'}>
              {t('policyConsent.accept')}
            </Button>
          </div>
        </fetcher.Form>
      </div>
    </Dialog>
  );
}

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export const POLICY_CONSENT_REQUEST_FRAGMENT = `#graphql
  fragment PolicyConsentRequest on CustomerPolicyConsentRequest {
    text
    policies {
      ...FormPolicy
    }
  }
  ${POLICY_FRAGMENT}
` as const;

/** sessionStorage tells no one when it changes; this tab changes it only through `dismiss`. */
function neverChanges() {
  return () => {};
}
