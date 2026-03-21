import {defineConfig} from 'vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    {
      name: 'nitro-worker-entry',
      config(_, env) {
        return {
          ...(env.isSsrBuild && {
            build: {
              ssr: './server',
            },
          }),
        };
      },
    },
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    noExternal: true,
    target: 'webworker',
    resolve: {
      conditions: ['worker', 'workerd'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/server',
        'react-router',
      ],
    },
  },
});
