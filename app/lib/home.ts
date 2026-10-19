import type {TranslationKey} from '@cloudcart/nitrogen';
import type {HomeProductsQuery, ProductItemFragment} from 'storefrontapi.generated';

/**
 * The home page's hero. Edit it here: the texts are in `app/locales` under their keys (with `{shop}` for the store's
 * name), and the image is any URL — a file in `public/` or an image on the store's CDN, with its size so the page
 * does not shift while it loads. `alt` describes a photo; leave it out for a decorative image.
 */
export const HERO: {
  image: {url: string; width: number; height: number; alt?: TranslationKey};
  heading: TranslationKey;
  text: TranslationKey;
  button: {label: TranslationKey; to: string};
} = {
  // A placeholder drawn for the starter: replace it with the store's own image.
  image: {url: '/hero.svg', width: 1600, height: 900},
  heading: 'home.hero.heading',
  text: 'home.hero.text',
  button: {label: 'home.hero.button', to: '/products'},
};

/**
 * A product list the home page's query (`HomeProducts`) reads, by its alias: a field whose nodes are product cards, so
 * the query can carry other below-the-fold data too (B-340).
 */
export type HomeProductList = {
  [K in keyof HomeProductsQuery]-?: HomeProductsQuery[K] extends {nodes: ProductItemFragment[]} ? K : never;
}[keyof HomeProductsQuery];

/**
 * The home page's product grids, in order: which list of `HomeProducts` each shows, its title, and where its
 * "View all" leads. A new list is a new alias in that query.
 */
export const HOME_PRODUCT_GRIDS: Array<{list: HomeProductList; title: TranslationKey; to: string}> = [
  {list: 'featured', title: 'home.featured', to: '/products?isFeatured=true'},
  {list: 'newest', title: 'home.newest', to: '/products?sort=created-desc'},
];
