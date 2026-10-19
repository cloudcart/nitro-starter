import type {Config} from '@react-router/dev/config';
import {nitrogenPreset} from '@cloudcart/nitrogen/react-router-preset';

/**
 * React Router settings for a Nitrogen storefront. The preset turns on
 * middleware and route-module splitting, and keeps the build in the shape the
 * CloudCart deploy uploads.
 */
export default {
  presets: [nitrogenPreset()],
} satisfies Config;
