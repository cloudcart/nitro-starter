import type {PrivacyBannerProps} from '@cloudcart/nitrogen-react';
import {BUTTON_BASE, BUTTON_VARIANTS} from '~/components/ui/Button';

/**
 * The store's look for Nitrogen's unstyled `<PrivacyBanner>`: the bar along the
 * bottom of the page, and the preference center as a dialog over a backdrop
 * that covers the page — which is what makes the merchant's "wall" block the
 * store until the visitor chooses. Its texts are the store's, from the API.
 */
export const PRIVACY_BANNER_CLASSES: NonNullable<PrivacyBannerProps['classNames']> = {
  bar: 'fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 border-t border-border bg-background px-gutter py-4 pr-12 shadow-overlay md:flex-row md:items-center md:gap-6 md:px-gutter-md md:pr-14',
  barText: 'prose prose-tokens max-w-none md:flex-1',
  barActions: 'flex flex-wrap items-center gap-3',
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4',
  dialog:
    'relative flex max-h-full w-full max-w-form-page flex-col overflow-hidden rounded-card bg-background text-foreground shadow-dialog outline-none',
  dialogHeader: 'border-b border-border px-6 py-4 pr-12',
  dialogTitle: 'text-h4',
  tabs: 'flex flex-wrap items-center gap-1 border-b border-border px-4 py-2',
  tabList: 'flex flex-wrap items-center gap-1',
  tab: 'rounded-button px-3 py-1.5 text-small text-muted hover:bg-surface aria-selected:bg-surface aria-selected:font-medium aria-selected:text-foreground',
  panel: 'flex-1 overflow-y-auto px-6 py-4 [&_h3]:text-h5',
  panelText: 'prose prose-tokens mt-2 max-w-none',
  switch: 'mt-2 inline-flex items-center [&>input]:size-5 [&>input]:accent-foreground',
  cookies: 'mt-4 text-small [&_h4]:font-medium [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-5',
  dialogFooter: 'flex flex-wrap justify-end gap-3 border-t border-border px-6 py-4',
  // The accept button gets `button` and `primaryButton` both. Of two classes setting one property, the one later in
  // the stylesheet wins, not the one later in the attribute: so `button` sets no colour that `primaryButton` changes,
  // and the outlined button's hover leaves the primary one out.
  button: `${BUTTON_BASE} border border-foreground [&:not(.cc-privacy-primary-button)]:hover:bg-surface`,
  primaryButton: BUTTON_VARIANTS.primary,
  link: 'text-small underline',
  close:
    'absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full text-h4 leading-none text-muted hover:bg-surface hover:text-foreground',
};
