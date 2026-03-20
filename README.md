# Nitro Starter

A headless commerce storefront built with [Nitro](https://github.com/cloudcart/nitro) — CloudCart's headless commerce framework powered by [React Router](https://reactrouter.com/).

## Quick Start

```bash
npm install
cloudcart nitro dev
```

## Connecting to a CloudCart Store

```bash
cloudcart nitro link
cloudcart nitro env pull
cloudcart nitro dev
```

## Deploying to Nova

```bash
cloudcart nitro deploy
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/products` | Products listing |
| `/products/:handle` | Product detail |
| `/collections` | Collections listing |
| `/collections/:handle` | Collection detail |
| `/cart` | Shopping cart |
| `/discount/:code` | Auto-apply discount code |
| `/search` | Product search |
| `/pages/:handle` | CMS pages |
| `/blogs` | Blog listing |
| `/blogs/:handle` | Blog articles |
| `/blogs/:handle/:article` | Article detail |
| `/policies` | Policies listing |
| `/policies/:handle` | Policy detail |
| `/robots.txt` | Dynamic robots.txt |
| `/sitemap.xml` | Dynamic sitemap |

## Stack

- [React Router v7](https://reactrouter.com/) — Framework
- [@cloudcart/nitro](https://www.npmjs.com/package/@cloudcart/nitro) — Commerce toolkit
- [@cloudcart/nitro-react](https://www.npmjs.com/package/@cloudcart/nitro-react) — UI components & hooks
- [Vite](https://vitejs.dev/) — Build tool
- [TypeScript](https://www.typescriptlang.org/) — Language

## License

MIT
