import {defineConfig} from 'vite';
import {nitro} from '@cloudcart/nitro/vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [nitro(), reactRouter(), tsconfigPaths()],
});
