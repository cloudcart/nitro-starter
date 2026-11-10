import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {HydratedRouter} from 'react-router/dom';
import {NonceProvider, reloadOnNewBuild} from '@cloudcart/nitrogen';

// A part of the page whose file a deploy removed loads the page again, from the new build — once per build.
reloadOnNewBuild();

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
