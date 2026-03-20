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
    storefront: import("@cloudcart/nitro").StorefrontClient;
    cart: import("@cloudcart/nitro").CartHandler;
    session: import("@cloudcart/nitro").AppSession;
  }
}
