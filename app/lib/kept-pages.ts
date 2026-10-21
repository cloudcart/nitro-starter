/**
 * The pages a step back or forward shows at once from the data this tab kept, and a link opens from the data it loaded
 * when the visitor showed the intent to open it (`KeptLink`): the pages the same for every visitor (`SHARED_PAGE`),
 * whose routes load through `keptPageLoader`. `scripts/check-kept-pages.mjs` checks the list against the routes.
 */
export const KEPT_PAGES = [
  '/',
  '/article/:handle',
  '/blog',
  '/blog/category/:handle',
  '/blog/tag/:handle',
  '/categories',
  '/category/:handle',
  '/contacts',
  '/page/:handle',
  '/product/:handle',
  '/products',
  '/selection/:handle',
  '/store/:handle',
  '/stores',
  '/tags/:handle',
  '/vendor/:handle',
  '/vendors',
];
