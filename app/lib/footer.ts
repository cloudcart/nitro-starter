/*
 * The footer's settings, kept in code: the platform keeps neither for a headless storefront.
 */

/**
 * The embedded subscribe form the footer's sign-up shows — its id in Marketing Suite → Subscribers → Forms. Its
 * title and description are the sign-up's heading and text. Empty: the footer has no sign-up.
 */
export const FOOTER_SUBSCRIBE_FORM_ID = '';

/**
 * The store's social media, in the order the footer lists them. On the platform they belong to the theme, so the
 * storefront keeps its own, e.g. `{name: 'Instagram', url: 'https://www.instagram.com/<your-account>'}`.
 */
export const SOCIAL_LINKS: Array<{name: string; url: string}> = [];
