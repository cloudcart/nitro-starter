import type {TranslationKey} from '@cloudcart/nitrogen';

/**
 * The announcement bar's messages, in order. Edit them here: each text is in `app/locales` under its key (with
 * `{shop}` for the store's name), and `to` makes it a link. An empty list hides the bar.
 */
export const ANNOUNCEMENTS: Array<{text: TranslationKey; to?: string}> = [
  {text: 'announcements.welcome'},
  {text: 'announcements.newArrivals', to: '/products'},
];
