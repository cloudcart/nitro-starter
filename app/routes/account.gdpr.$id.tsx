import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.gdpr.$id';
import {metaTranslator, privateMeta} from '~/lib/meta';
import {useTranslation} from '@cloudcart/nitrogen';
import {RichText} from '@cloudcart/nitrogen-react';
import {DateText} from '~/components/DateText';
import {missingResource} from '~/lib/missing';

export const meta: Route.MetaFunction = ({data, matches}) =>
  privateMeta(data?.acceptance.title ?? metaTranslator(matches)('account.nav.policies'));

/** /account/gdpr/{id} — one policy the customer accepted, as it read when they accepted it. */
export async function loader({params, context}: Route.LoaderArgs) {
  const {customer, errors} = await context.customerAccount.query(POLICY_ACCEPTANCE_QUERY, {
    variables: {id: `gid://cloudcart/PolicyAcceptance/${params.id}`},
  });
  if (!customer?.policyAcceptance) throw missingResource(errors, 'Not found');

  return {acceptance: customer.policyAcceptance};
}

export default function PolicyAcceptance() {
  const {t} = useTranslation();
  const {acceptance} = useLoaderData<typeof loader>();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to="/account/gdpr" className="text-small text-muted">
          <span aria-hidden="true">← </span>
          {t('account.policies.back')}
        </Link>
        <h2 className="text-heading">{acceptance.title}</h2>
        <p className="text-small text-muted">
          {t('account.policies.acceptedOn')}{' '}
          <DateText
            value={acceptance.acceptedAt}
            options={{
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            }}
          />
          {acceptance.form && (
            <>
              {t('format.separator')}
              {t(`gdpr.policyForm.${acceptance.form}`)}
            </>
          )}
        </p>
      </div>
      <RichText data={acceptance.contentHtml} headingStart={3} className="prose prose-tokens max-w-none" />
    </section>
  );
}

const POLICY_ACCEPTANCE_QUERY = `#graphql
  query AccountPolicyAcceptanceView($customerAccessToken: String!, $id: ID!) {
    customer(customerAccessToken: $customerAccessToken) {
      policyAcceptance(id: $id) {
        id
        title
        contentHtml
        form
        acceptedAt
      }
    }
  }
` as const;
