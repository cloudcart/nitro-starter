import {Suspense} from 'react';
import {Await} from 'react-router';
import {getPrivacyBanner, type SubscribeFormData, useTranslation} from '@cloudcart/nitrogen';
import {SubscribeForm, type SubscribeFormPart, KeptNavLink} from '@cloudcart/nitrogen-react';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {StoreContact} from '~/components/StoreContact';
import {TextPlaceholder} from '~/components/ui/TextPlaceholder';
import {buttonClass} from '~/components/ui/Button';
import {controlClass} from '~/components/ui/Field';
import {FOOTER_SUBSCRIBE_FORM_ID, SOCIAL_LINKS} from '~/lib/footer';
import {subscribeFormLabels} from '~/lib/subscribe-forms';
import {pagePath, storefrontLink} from '~/lib/urls';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
  /** Whether the store asks visitors for cookie consent, so the footer offers the cookie settings. */
  hasCookieConsent: boolean;
  /** The forms `getSubscribeForms` read, the footer's embedded one among them. */
  subscribeForms: Promise<SubscribeFormData[] | null> | SubscribeFormData[] | null;
  /** The sign-up's form; `FOOTER_SUBSCRIBE_FORM_ID` by default. */
  subscribeFormId?: string;
  /** `SOCIAL_LINKS` by default. */
  socialLinks?: typeof SOCIAL_LINKS;
}

/**
 * The footer: the sign-up (the embedded Marketing Suite form `FOOTER_SUBSCRIBE_FORM_ID` names, with its title and
 * description), the footer menu and the store's contact; then the utility row — the copyright, the policies and
 * the social links.
 */
export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
  hasCookieConsent,
  subscribeForms,
  subscribeFormId = FOOTER_SUBSCRIBE_FORM_ID,
  socialLinks = SOCIAL_LINKS,
}: FooterProps) {
  const {t} = useTranslation();
  const {shop} = header;

  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto grid max-w-page gap-10 px-gutter py-12 md:grid-cols-2 md:px-gutter-md lg:grid-cols-[2fr_1fr_1fr]">
        <SubscribeForm
          forms={subscribeForms}
          id={subscribeFormId}
          titleAs="h2"
          policyUrl={pagePath}
          labels={subscribeFormLabels(t)}
          classNames={SIGN_UP_CLASSES}
        />
        <Suspense
          fallback={
            // The menu's and the contacts' places while they load, a few lines each (B-420).
            <>
              <TextPlaceholder lines={5} className="gap-2" />
              <TextPlaceholder lines={4} className="gap-1" />
            </>
          }
        >
          <Await resolve={footerPromise}>
            {(footer) => (
              <>
                {footer?.menu && (
                  <FooterMenu
                    menu={footer.menu}
                    primaryDomainUrl={shop.primaryDomain.url}
                    publicStoreDomain={publicStoreDomain}
                  />
                )}
                {footer?.shop && <StoreContact name={shop.name} contact={footer.shop.contact} />}
              </>
            )}
          </Await>
        </Suspense>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-page flex-col gap-4 px-gutter py-6 text-small text-muted md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:px-gutter-md">
          <p>{t('footer.copyright', {year: new Date().getFullYear(), shop: shop.name})}</p>
          <Suspense>
            <Await resolve={footerPromise}>
              {(footer) => (
                <FooterPolicies
                  policies={footer?.policies ?? []}
                  hasCookieConsent={hasCookieConsent}
                  takesPrivacyRequests={Boolean(footer?.shop.gdprRequestTypes.length)}
                />
              )}
            </Await>
          </Suspense>
          <SocialLinks links={socialLinks} />
        </div>
      </div>
    </footer>
  );
}

// The sign-up in the storefront's look: the merchant's texts, the pill input of the design tokens.
const SIGN_UP_CLASSES: Partial<Record<SubscribeFormPart, string>> = {
  root: 'flex flex-col gap-4',
  success: 'flex flex-col gap-3 outline-none',
  title: 'text-heading',
  description: 'mt-2 whitespace-pre-line text-muted',
  form: 'flex max-w-narrow flex-col gap-3',
  field: 'flex flex-col gap-1 border-0 p-0',
  label: 'text-small text-muted',
  input: `h-11 w-full ${controlClass({pill: true})} [&:is(textarea)]:h-auto [&:is(textarea)]:rounded-input [&:is(textarea)]:py-2`,
  choice: 'flex items-center gap-2 [&_input]:accent-accent',
  policy: 'flex items-start gap-2 text-small [&_a]:inline-link [&_input]:mt-1 [&_input]:accent-accent',
  fieldError: 'text-small text-error',
  errors: 'text-small text-error',
  button: `${buttonClass('primary')} self-start`,
};

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: NonNullable<FooterQuery['menu']>;
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  const {t} = useTranslation();
  const links = menu.items.flatMap((item) => [item, ...item.items]).filter((item) => item.url);
  if (!links.length) return null;

  return (
    <nav aria-label={t('footer.menu')}>
      <ul className="flex flex-col gap-2">
        {links.map((item) => {
          const to = storefrontLink(item.url!, {primaryDomainUrl, publicStoreDomain});
          return (
            <li key={item.id}>
              {/^https?:\/\//.test(to) ? (
                <a href={to} rel="noopener noreferrer" target="_blank" className="text-muted hover:text-foreground">
                  {item.title}
                </a>
              ) : (
                // The merchant's "open in a new tab" for a page of the store, as the main menu keeps it (B-441).
                <KeptNavLink
                  end
                  to={to}
                  {...(item.openInNewTab ? {target: '_blank', rel: 'noreferrer'} : {})}
                  className="text-muted hover:text-foreground"
                >
                  {item.title}
                </KeptNavLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The store's policies — the pages the merchant attached to forms in the GDPR app — the privacy request form, and
 * the cookie settings.
 */
function FooterPolicies({
  policies,
  hasCookieConsent,
  takesPrivacyRequests,
}: {
  policies: FooterQuery['policies'];
  hasCookieConsent: boolean;
  takesPrivacyRequests: boolean;
}) {
  const {t} = useTranslation();
  if (!policies.length && !hasCookieConsent && !takesPrivacyRequests) return null;

  return (
    <nav aria-label={t('footer.policies')}>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {policies.map(({id, page}) => (
          <li key={id}>
            <KeptNavLink to={pagePath(page.handle)} className="hover:text-foreground">
              {page.title}
            </KeptNavLink>
          </li>
        ))}
        {takesPrivacyRequests && (
          <li>
            <KeptNavLink to="/gdpr/request" className="hover:text-foreground">
              {t('footer.privacyRequest')}
            </KeptNavLink>
          </li>
        )}
        {hasCookieConsent && (
          <li>
            <button
              type="button"
              onClick={() => getPrivacyBanner()?.showPreferences()}
              className="hover:text-foreground"
            >
              {t('footer.cookieSettings')}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}

/** The social links kept in code (`SOCIAL_LINKS`). */
function SocialLinks({links}: {links: typeof SOCIAL_LINKS}) {
  const {t} = useTranslation();
  if (!links.length) return null;

  return (
    <ul aria-label={t('footer.social')} className="flex flex-wrap gap-x-4 gap-y-2 md:ml-auto">
      {links.map((link) => (
        <li key={link.url}>
          <a href={link.url} rel="noopener noreferrer" target="_blank" className="hover:text-foreground">
            {link.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
