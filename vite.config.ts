import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
import {nitrogen} from '@cloudcart/nitrogen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), nitrogen(), reactRouter(), tsconfigPaths()],
});
