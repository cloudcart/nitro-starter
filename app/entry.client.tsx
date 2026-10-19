import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {HydratedRouter} from 'react-router/dom';
import {NonceProvider} from '@cloudcart/nitrogen';

startTransition(() => {
  // The nonce the server gave the page's scripts.
  const existingNonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';

  hydrateRoot(
    document,
    <StrictMode>
      <NonceProvider value={existingNonce}>
        <HydratedRouter />
      </NonceProvider>
    </StrictMode>,
  );
});
