# Nitrogen starter

A minimal storefront for a CloudCart store, built with
[Nitrogen](https://www.npmjs.com/package/@cloudcart/nitrogen) on
[React Router](https://reactrouter.com/): a working set of pages, components
and queries to build on, not a theme to configure.

## What's included

- React Router 7, Vite and TypeScript
- `@cloudcart/nitrogen` and `@cloudcart/nitrogen-react`
- Tailwind CSS 4
- GraphQL codegen: typed queries from the Storefront API schema
- ESLint

## Getting started

Requires Node.js 22 or 24.

```bash
npm install
cp .env.example .env    # then fill it in — see .env.example
npm run dev
```

With the CloudCart CLI, link the project to a storefront and pull its
variables instead of copying them:

```bash
cloudcart nitrogen link
cloudcart nitrogen env pull
cloudcart nitrogen dev
```

Deploy with `cloudcart nitrogen deploy`.

## Scripts

| Script              | What it does                                                                         |
| ------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`       | Development server                                                                   |
| `npm run build`     | Production build                                                                     |
| `npm run codegen`   | Types for every `#graphql` query (`storefrontapi.generated.d.ts`) and for the routes |
| `npm run typecheck` | Route types, then `tsc`                                                              |
| `npm run lint`      | ESLint, and Prettier's check of the formatting                                       |
| `npm run format`    | Formats the code with Prettier                                                       |
| `npm run check`     | Codegen, typecheck, lint and build: what the commit hook runs                        |

Run `npm run codegen` after changing a query.

`npm install` also installs a Git pre-commit hook. Before each commit it runs `npm run check`, and it fails when
the generated query types changed, so the committed ones always match the queries. It checks the files on disk, so
it stops while there are unstaged edits or new files the commit leaves out: add them, or set them aside with
`git stash push --keep-index --include-untracked`.

## Pages

The addresses are the store's own, so links, bookmarks and search results keep
working when a store moves to this storefront.

| Address                                                                       | Page                                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/`                                                                           | Home                                                                                      |
| `/product/{handle}`                                                           | Product: variants, bundles, customizations, reviews, fast order, back in stock, questions |
| `/categories`, `/category/{handle}`                                           | Categories and a category's products, with filters and sorting                            |
| `/selection/{handle}`                                                         | A smart collection                                                                        |
| `/products`                                                                   | All products                                                                              |
| `/vendors`, `/vendor/{handle}`                                                | Brands                                                                                    |
| `/tags/{handle}`                                                              | Products with a tag                                                                       |
| `/search?query=`                                                              | Search, with results as you type                                                          |
| `/compare`                                                                    | Product comparison, off by default (`app/lib/features.ts`)                                |
| `/cart`                                                                       | Cart; `/cart/discount:{code}` applies a discount link                                     |
| `/page/{handle}`                                                              | Content pages and policies                                                                |
| `/blog`, `/blog/category/{handle}`, `/blog/tag/{handle}`, `/article/{handle}` | Blog                                                                                      |
| `/stores`, `/store/{handle}`                                                  | Physical stores                                                                           |
| `/contacts`                                                                   | Contact form                                                                              |
| `/auth/login`, `/auth/register`, `/auth/logout`                               | Sign in with a code sent by e-mail, and sign up                                           |
| `/account`                                                                    | Profile, orders, returns, addresses, wishlist, downloads, payments                        |
| `/withdrawal`, `/withdrawal/{reference}`                                      | Returning items, and tracking a return                                                    |
| `/robots.txt`, `/llms.txt`                                                    | For crawlers and AI agents                                                                |

## How it works

- **Checkout is the store's own.** The cart sends the buyer to
  `cart.checkoutUrl`; payments, delivery and order e-mails stay on CloudCart.
- **Prices are the buyer's.** Catalogue queries run with
  `@inContext(buyer: …)`, so a signed-in customer sees their group's prices.
  Every amount is shown as the API formats it (`formatted`), which covers stores
  that must show two currencies.
- **Customers sign in with a code** sent to their e-mail; the access token is
  kept in the session cookie. `context.customerAccount.query()` and `.mutate()`
  fill in `$customerAccessToken`.
- **Sign-ups go to the store's Marketing Suite** through its subscribe forms,
  which open by the merchant's own rules.
- **Cookie consent and analytics** follow the store's GDPR settings.
- **The merchant's marketing pixels run as on their CloudCart storefront.**
  Google Analytics, Google Ads, Google Tag Manager, Meta and TikTok, as set up
  in the admin, load when their consent group is accepted — a group the
  merchant made accepted by default counts until the visitor refuses it, so
  its pixels load on the first visit, as on the CloudCart storefront — and every
  event reaches them and CloudCart's server-side reports under one event id
  (`Analytics.Provider`'s `pixels`). Their script hosts are allowed in
  `app/entry.server.tsx`; a Tag Manager container whose tags load scripts from
  other hosts needs those added there.
- **The sitemap is the store's.** On the store's own domain CloudCart serves
  `/sitemap.xml` itself.
- Recently viewed products and the comparison list are kept in the browser.
- **Product comparison is off** until `COMPARE_ENABLED` in `app/lib/features.ts`
  is `true`. Turn it on only when the store's products have properties (the
  characteristics their categories give them): the comparison is a table of
  them, and without them it compares nothing.

## Working with an AI assistant

Install the [CloudCart AI Toolkit](https://github.com/cloudcart/ai-toolkit) in your coding agent. Its
`cloudcart-nitrogen` skill takes the agent through a change to this storefront: Nitrogen's building blocks first,
GraphQL that asks for what the page renders, and the checks before it is done. It also brings the CloudCart Storefront
MCP server, which looks the API up and validates queries. Its README shows how to install it in Claude Code, Cursor,
Gemini CLI and VS Code.

## License

MIT, © 2026-present CloudCart AD. Portions are adapted from code under another MIT licence; both notices are in [`LICENSE`](LICENSE). A storefront made from this template keeps the file.
