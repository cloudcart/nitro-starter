import {defineConfig} from 'vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  build: {assetsInlineLimit: 0},
  ssr: {optimizeDeps: {include: ['react-router']}},
});
