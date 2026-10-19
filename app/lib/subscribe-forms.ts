import type {Translate} from '@cloudcart/nitrogen';
import type {SubscribeFormLabels, SubscribePopupPart} from '@cloudcart/nitrogen-react';

/** The subscribe forms' own words, pop-up and embedded, in the store's language; the merchant writes the rest. */
export function subscribeFormLabels(t: Translate): Partial<SubscribeFormLabels> {
  return {
    dialog: t('subscribe.title'),
    open: t('subscribe.open'),
    submit: t('subscribe.submit'),
    close: t('actions.close'),
    choose: t('subscribe.choose'),
    acceptPolicy: t('subscribe.acceptPolicy'),
    policyNotAccepted: (title) => t('subscribe.policyNotAccepted', {title}),
    notSent: t('subscribe.notSent'),
    fields: {
      EMAIL: t('subscribe.email'),
      PHONE: t('subscribe.phone'),
      FIRST_NAME: t('subscribe.firstName'),
      LAST_NAME: t('subscribe.lastName'),
    },
  };
}

/**
 * What the starter adds to the store's pop-up subscribe forms. Their look — layout, colours, fonts and the button — is
 * the merchant's design, which Nitrogen applies inline; the states the design does not carry are added here.
 */
export const SUBSCRIBE_POPUP_CLASSES: Partial<Record<SubscribePopupPart, string>> = {
  button: 'transition-opacity hover:opacity-85 disabled:cursor-not-allowed',
};
