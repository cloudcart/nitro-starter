/// <reference types="vite/client" />
/// <reference types="react-router" />

declare module "react-router" {
  interface AppLoadContext {
    env: {
      SESSION_SECRET: string;
      PUBLIC_STORE_DOMAIN?: string;
      PUBLIC_STOREFRONT_API_TOKEN?: string;
      PRIVATE_STOREFRONT_API_TOKEN?: string;
    };
    storefront: import("@cloudcart/nitrogen").StorefrontClient;
    cart: import("@cloudcart/nitrogen").CartHandler;
    session: import("@cloudcart/nitrogen").AppSession;
  }
}
