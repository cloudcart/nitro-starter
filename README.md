# Nitrogen Starter

A headless commerce storefront built with [Nitrogen](https://github.com/cloudcart/nitrogen) — CloudCart's headless commerce framework powered by [React Router](https://reactrouter.com/).

## Quick Start

```bash
npm install
cloudcart nitrogen dev
```

## Connecting to a CloudCart Store

```bash
cloudcart nitrogen link
cloudcart nitrogen env pull
cloudcart nitrogen dev
```

## Deploying to Nova

```bash
cloudcart nitrogen deploy
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
- [@cloudcart/nitrogen](https://www.npmjs.com/package/@cloudcart/nitrogen) — Commerce toolkit
- [@cloudcart/nitrogen-react](https://www.npmjs.com/package/@cloudcart/nitrogen-react) — UI components & hooks
- [Vite](https://vitejs.dev/) — Build tool
- [TypeScript](https://www.typescriptlang.org/) — Language

## License

MIT
