import {KeptNavLink} from '@cloudcart/nitrogen-react';
import {Form} from 'react-router';
import {type TranslationKey, useTranslation} from '@cloudcart/nitrogen';
import {useSubmission} from '~/lib/action';

type AccountLink = {to: string; label: TranslationKey; end?: boolean};

const LINKS: AccountLink[] = [
  {to: '/account', label: 'account.nav.profile', end: true},
  {to: '/account/orders', label: 'account.nav.orders'},
  {to: '/account/returns', label: 'account.nav.returns'},
  {to: '/account/address/shipping', label: 'account.nav.shippingAddresses'},
  {to: '/account/address/billing', label: 'account.nav.billingAddresses'},
  {to: '/account/wishlist', label: 'account.nav.wishlist'},
  {to: '/account/files', label: 'account.nav.downloads'},
  {to: '/account/payments', label: 'account.nav.payments'},
];

/** The privacy pages, listed while the store runs the GDPR app. */
const PRIVACY_LINKS: AccountLink[] = [
  {to: '/account/gdpr', label: 'account.nav.policies'},
  {to: '/account/gdpr-requests', label: 'account.nav.privacyRequests'},
  {to: '/gdpr', label: 'account.nav.yourData'},
];

/**
 * The account's sections, the current one marked, and "Sign out". From 990 px a column beside the page; below, one
 * row that scrolls sideways.
 */
export function AccountSidebar({hasPrivacyPages}: {hasPrivacyPages: boolean}) {
  const {t} = useTranslation();
  const links = hasPrivacyPages ? [...LINKS, ...PRIVACY_LINKS] : LINKS;
  const signingOut = useSubmission('/auth/logout') !== null;

  return (
    <nav
      aria-label={t('account.nav.label')}
      // The row scrolls on a phone, so its links' focus rings are drawn inside them (B-194).
      className="scrollbar-none -mx-gutter overflow-x-auto px-gutter md:-mx-gutter-md md:px-gutter-md lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {links.map((link) => (
          <li key={link.to} className="shrink-0">
            <KeptNavLink
              to={link.to}
              end={link.end}
              className={({isActive}) =>
                `block rounded-button px-4 py-2 whitespace-nowrap hover:bg-surface hover:no-underline focus-visible:-outline-offset-2 ${isActive ? 'bg-surface font-medium text-foreground' : 'text-muted'}`
              }
            >
              {t(link.label)}
            </KeptNavLink>
          </li>
        ))}
        <li className="shrink-0">
          <Form method="post" action="/auth/logout">
            <button
              type="submit"
              aria-busy={signingOut || undefined}
              onClick={signingOut ? (event) => event.preventDefault() : undefined}
              className="busy flex w-full items-center gap-2 rounded-button px-4 py-2 text-left whitespace-nowrap text-muted hover:bg-surface hover:text-foreground focus-visible:-outline-offset-2"
            >
              {t('account.nav.signOut')}
            </button>
          </Form>
        </li>
      </ul>
    </nav>
  );
}
