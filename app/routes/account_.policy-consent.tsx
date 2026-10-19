import type {Route} from './+types/account_.policy-consent';
import {buyerUserAgent, type FormError} from '~/components/FormFields';
import {RouteErrorBoundary} from '~/components/RouteError';
import {API_ERROR, payloadOf} from '~/lib/action';
import {CUSTOMER_USER_ERROR_FRAGMENT} from '~/lib/fragments';

/** An action's error shows inside the store's layout, translated (B-201). */
export const ErrorBoundary = RouteErrorBoundary;

/** Only posted to: an address to open is not a page, so it answers the store's 404, never an empty page (B-438). */
export function loader({url}: Route.LoaderArgs) {
  throw new Response(`${url.pathname} not found`, {status: 404});
}

/**
 * Sends the policies a signed-in customer accepted in answer to the store's
 * consent request (`<PolicyConsentRequest>`). A resource route outside the
 * account layout: it has no page.
 */
export async function action({request, context}: Route.ActionArgs): Promise<{accepted: boolean; errors: FormError[]}> {
  const form = await request.formData();

  const customerPolicyConsentAccept = payloadOf(
    await context.customerAccount.mutate(POLICY_CONSENT_ACCEPT_MUTATION, {
      variables: {
        acceptedPolicyIds: form.getAll('acceptedPolicyIds').map(String),
        buyerUserAgent: buyerUserAgent(request),
      },
    }),
    'customerPolicyConsentAccept',
  );

  // A call the API refused is not an acceptance (B-202).
  const errors: FormError[] = customerPolicyConsentAccept
    ? customerPolicyConsentAccept.customerUserErrors
    : [API_ERROR];
  return {accepted: errors.length === 0, errors};
}

const POLICY_CONSENT_ACCEPT_MUTATION = `#graphql
  mutation PolicyConsentAccept($customerAccessToken: String!, $acceptedPolicyIds: [ID!]!, $buyerUserAgent: String) {
    customerPolicyConsentAccept(customerAccessToken: $customerAccessToken, acceptedPolicyIds: $acceptedPolicyIds, buyerUserAgent: $buyerUserAgent) {
      customerUserErrors {
        ...CustomerUserErrorFields
      }
    }
  }
  ${CUSTOMER_USER_ERROR_FRAGMENT}
` as const;
